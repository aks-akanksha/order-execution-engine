import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { OrderRequest } from '../types/order';
import { OrderModel } from '../models/order.model';
import { OrderProcessor } from './order.processor';
import { DEXRouter } from './dex.router';
import { logger } from '../utils/logger';

export class QueueService {
  private queue: Queue;
  private worker: Worker;
  private redis: Redis;
  private orderProcessor: OrderProcessor;

  constructor(
    orderModel: OrderModel,
    dexRouter: DEXRouter,
    redisConnection?: Redis
  ) {
    this.redis = redisConnection || new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    this.queue = new Queue('order-execution', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    this.orderProcessor = new OrderProcessor(orderModel, dexRouter);

    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '10');
    const ordersPerMinute = parseInt(process.env.ORDERS_PER_MINUTE || '100');

    this.worker = new Worker(
      'order-execution',
      async (job: Job) => {
        const { orderId, request } = job.data;

        try {
          // Process order (callbacks are registered via OrderProcessor)
          const order = await this.orderProcessor.processOrder(orderId, request);
          return { success: true, order };
        } catch (error) {
          logger.error(`Job ${job.id} failed`, { jobId: job.id, error });
          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency,
        limiter: {
          max: ordersPerMinute,
          duration: 60000, // 1 minute
        },
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`, { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed`, { jobId: job?.id, error: err });
    });
  }

  getOrderProcessor(): OrderProcessor {
    return this.orderProcessor;
  }

  async addOrder(orderId: string, request: OrderRequest): Promise<void> {
    await this.queue.add(
      'execute-order',
      {
        orderId,
        request,
      },
      {
        jobId: orderId, // Use orderId as jobId to prevent duplicates
      }
    );
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redis.quit();
  }
}

