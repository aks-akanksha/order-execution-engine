import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './database/db';
import { OrderModel } from './models/order.model';
import { createDEXRouter } from './services/dex.providers';
import { QueueService } from './services/queue.service';
import { OrderProcessor } from './services/order.processor';
import { ordersRoutes } from './routes/orders.routes';
import { logger } from './utils/logger';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

export async function buildApp() {
  logger.info('Building Fastify application');
  
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
  });

  await app.register(websocket);

  // Initialize services
  logger.info('Initializing database...');
  try {
    await initializeDatabase();
    logger.info('Database initialized');
  } catch (error: any) {
    logger.error('Failed to initialize database', { 
      error: error?.message || error,
      hint: 'Make sure DATABASE_URL is set and the database service is running and linked to this web service on Render.'
    });
    throw error;
  }

  logger.info('Creating services...');
  const orderModel = new OrderModel();
  const dexRouter = createDEXRouter();
  const queueService = new QueueService(orderModel, dexRouter);
  const orderProcessor = new OrderProcessor(orderModel, dexRouter);
  logger.info('Services created');

  // Store services in Fastify instance for route access
  app.decorate('orderModel', orderModel);
  app.decorate('queueService', queueService);
  app.decorate('orderProcessor', orderProcessor);

  // Register routes
  await app.register(ordersRoutes);

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`🚀 Server running on http://localhost:${PORT}`, { port: PORT });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      await app.close();
      await closeDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Error starting server', { error });
    process.exit(1);
  }
}

// Only start server if this file is run directly (not imported for tests)
if (require.main === module) {
  start();
}

