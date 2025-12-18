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

export async function initializeDatabase(): Promise<void> {
  const pool = getPool();

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
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

