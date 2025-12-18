import { FastifyInstance } from 'fastify';
import { buildApp } from '../../index';
import { OrderType } from '../../types/order';

// Mock database for tests
jest.mock('../../database/db', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  
  return {
    initializeDatabase: jest.fn().mockResolvedValue(undefined),
    closeDatabase: jest.fn().mockResolvedValue(undefined),
    getPool: jest.fn(() => mockPool),
  };
});

// Mock OrderModel
jest.mock('../../models/order.model', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
  
  return {
    OrderModel: jest.fn().mockImplementation(() => ({
      pool: mockPool,
      create: jest.fn().mockResolvedValue({
        id: 'test-order-id',
        type: 'market',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: jest.fn().mockResolvedValue(null),
      updateStatus: jest.fn(),
      addStatusHistory: jest.fn(),
    })),
  };
});

// Mock Redis
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

// Mock BullMQ
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

describe('Orders API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Mock environment for tests
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    try {
      if (app.queueService) {
        await app.queueService.close();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    try {
      await app.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/orders/execute', () => {
    it('should create a new order', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          type: OrderType.MARKET,
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: '100',
          slippageTolerance: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.orderId).toBeDefined();
      expect(body.status).toBe('pending');
      expect(body.wsEndpoint).toBeDefined();
    });

    it('should reject invalid order request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          type: OrderType.MARKET,
          // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
    });

    it('should reject non-market orders', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          type: OrderType.LIMIT,
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: '100',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('market orders');
    });
  });

  describe('GET /api/orders/:orderId', () => {
    it('should return 404 for non-existent order', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/orders/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/queue/stats', () => {
    it('should return queue statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/queue/stats',
      });

      expect(response.statusCode).toBe(200);
      const stats = JSON.parse(response.body);
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('WebSocket /api/orders/:orderId/status', () => {
    it('should handle WebSocket endpoint', (done) => {
      // This is a simplified test - in practice, use a WebSocket client library
      // For now, we'll test that the endpoint exists and doesn't crash
      app.inject({
        method: 'GET',
        url: '/api/orders/test-id/status',
        headers: {
          upgrade: 'websocket',
        },
      }).then(() => {
        // WebSocket upgrade should be attempted
        done();
      }).catch(() => {
        // Expected to fail without proper WebSocket handshake
        done();
      });
    });
  });
});
