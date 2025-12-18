import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

dotenv.config();

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/order_engine',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', { error: err });
    });
  }

  return pool;
}

export async function testConnection(): Promise<boolean> {
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error });
    return false;
  }
}

export async function initializeDatabase(): Promise<void> {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    const errorMsg = 'DATABASE_URL environment variable is not set. Please configure your database connection.';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const pool = getPool();

  // Test connection first
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection successful');
  } catch (error: any) {
    const errorMsg = `Cannot connect to database. Please check your DATABASE_URL. Error: ${error?.message || error}`;
    logger.error(errorMsg, { 
      error,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlPreview: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'not set'
    });
    throw new Error(errorMsg);
  }

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    logger.info('Database schema initialized successfully');
  } catch (error) {
    // If tables already exist, that's fine
    if (error instanceof Error && error.message.includes('already exists')) {
      logger.info('Database schema already initialized');
      return;
    }
    // In test mode, don't throw - just log
    if (process.env.NODE_ENV === 'test') {
      logger.debug('Database initialization skipped in test mode', { error });
      return;
    }
    logger.error('Error initializing database', { error });
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

