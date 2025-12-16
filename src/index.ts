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

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

export async function buildApp() {
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
  await initializeDatabase();

  const orderModel = new OrderModel();
  const dexRouter = createDEXRouter();
  const queueService = new QueueService(orderModel, dexRouter);
  const orderProcessor = new OrderProcessor(orderModel, dexRouter);

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
    console.log(`🚀 Server running on http://localhost:${PORT}`);

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      await app.close();
      await closeDatabase();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();

