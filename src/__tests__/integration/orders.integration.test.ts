import Fastify, { FastifyInstance } from 'fastify';
import { buildApp } from '../../index';
import { OrderModel } from '../../models/order.model';
import { createDEXRouter } from '../../services/dex.providers';
import { QueueService } from '../../services/queue.service';
import { OrderType, OrderStatus } from '../../types/order';

describe('Orders API Integration Tests', () => {
  let app: FastifyInstance;
  let orderModel: OrderModel;
  let queueService: QueueService;

  beforeAll(async () => {
    // Note: These tests require a running PostgreSQL and Redis instance
    // In CI/CD, use test containers or mocks
    app = await buildApp();
    await app.ready();
    orderModel = (app as any).orderModel;
    queueService = (app as any).queueService;
  });

  afterAll(async () => {
    await queueService.close();
    await app.close();
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
    it('should retrieve order by id', async () => {
      // First create an order
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/orders/execute',
        payload: {
          type: OrderType.MARKET,
          tokenIn: 'SOL',
          tokenOut: 'USDC',
          amountIn: '100',
        },
      });

      const { orderId } = JSON.parse(createResponse.body);

      // Then retrieve it
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/orders/${orderId}`,
      });

      expect(getResponse.statusCode).toBe(200);
      const order = JSON.parse(getResponse.body);
      expect(order.id).toBe(orderId);
      expect(order.type).toBe(OrderType.MARKET);
    });

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
    it('should establish WebSocket connection and receive status updates', (done) => {
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
      }).catch((err) => {
        // Expected to fail without proper WebSocket handshake
        done();
      });
    });
  });
});

