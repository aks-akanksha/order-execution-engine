import { QueueService } from '../../services/queue.service';
import { OrderModel } from '../../models/order.model';
import { createDEXRouter } from '../../services/dex.providers';
import { OrderType, OrderRequest } from '../../types/order';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

describe('Queue Service Integration Tests', () => {
  let queueService: QueueService;
  let orderModel: OrderModel;
  let redis: Redis;

  beforeAll(async () => {
    // Use a test Redis instance
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 1, // Use different DB for tests
    });

    orderModel = new OrderModel();
    const dexRouter = createDEXRouter();
    queueService = new QueueService(orderModel, dexRouter, redis);
  });

  afterAll(async () => {
    await queueService.close();
    await redis.quit();
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
      expect(stats.waiting).toBeLessThanOrEqual(1);
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

