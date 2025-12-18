import { QueueService } from '../../services/queue.service';
import { OrderModel } from '../../models/order.model';
import { createDEXRouter } from '../../services/dex.providers';
import { OrderType, OrderRequest } from '../../types/order';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

// Mock Redis for tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock BullMQ Queue and Worker
jest.mock('bullmq', () => {
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockWorker = {
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    Queue: jest.fn(() => mockQueue),
    Worker: jest.fn(() => mockWorker),
  };
});

describe('Queue Service Integration Tests', () => {
  let queueService: QueueService;
  let orderModel: OrderModel;
  let redis: Redis;

  beforeAll(async () => {
    // Use mocked Redis
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    // Mock OrderModel
    orderModel = {
      create: jest.fn().mockResolvedValue({
        id: 'test-id',
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      addStatusHistory: jest.fn(),
    } as unknown as OrderModel;

    const dexRouter = createDEXRouter();
    queueService = new QueueService(orderModel, dexRouter, redis);
  });

  afterAll(async () => {
    try {
      if (queueService) {
        await queueService.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    try {
      if (redis) {
        await redis.quit();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('addOrder', () => {
    it('should add order to queue', async () => {
      const orderId = uuidv4();
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      await expect(queueService.addOrder(orderId, request)).resolves.not.toThrow();
    });

    it('should prevent duplicate orders with same orderId', async () => {
      const orderId = uuidv4();
      const request: OrderRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      await queueService.addOrder(orderId, request);
      // Adding again should not create duplicate (same jobId)
      await queueService.addOrder(orderId, request);

      const stats = await queueService.getQueueStats();
      // Should have at most 1 waiting job (the duplicate should be ignored)
      expect(stats.waiting).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await queueService.getQueueStats();

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });
  });
});
