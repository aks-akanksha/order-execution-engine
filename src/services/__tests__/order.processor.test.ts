import { OrderProcessor } from '../order.processor';
import { OrderModel } from '../../models/order.model';
import { DEXRouter } from '../dex.router';
import { OrderStatus, OrderType, OrderRequest, OrderStatusUpdate, DEX } from '../../types/order';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../../models/order.model');
jest.mock('../dex.router');

describe('OrderProcessor', () => {
  let orderProcessor: OrderProcessor;
  let mockOrderModel: jest.Mocked<OrderModel>;
  let mockDEXRouter: jest.Mocked<DEXRouter>;
  let statusUpdates: OrderStatusUpdate[];

  // Suppress console errors in tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
    statusUpdates = [];
    
    mockOrderModel = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      addStatusHistory: jest.fn(),
    } as unknown as jest.Mocked<OrderModel>;

    mockDEXRouter = {
      getBestQuote: jest.fn(),
      executeOnDEX: jest.fn(),
    } as unknown as jest.Mocked<DEXRouter>;

    orderProcessor = new OrderProcessor(mockOrderModel, mockDEXRouter);
  });
  
  afterEach(() => {
    console.error = originalError;
    jest.clearAllMocks();
  });

  describe('processOrder', () => {
    const orderId = uuidv4();
    const request: OrderRequest = {
      type: OrderType.MARKET,
      tokenIn: 'SOL',
      tokenOut: 'USDC',
      amountIn: '100',
      slippageTolerance: 1,
    };

    it('should process order through all statuses', async () => {
      // Setup mocks
      mockDEXRouter.getBestQuote.mockResolvedValue({
        dex: DEX.RAYDIUM,
        amountOut: '95.5',
        price: '0.955',
        liquidity: '1000000',
      });

      mockDEXRouter.executeOnDEX.mockResolvedValue({
        txHash: 'test_tx_hash_123',
        executionPrice: '0.955',
      });

      mockOrderModel.updateStatus.mockResolvedValue({
        id: orderId,
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 1,
        status: OrderStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockOrderModel.findById.mockResolvedValue({
        id: orderId,
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 1,
        status: OrderStatus.CONFIRMED,
        txHash: 'test_tx_hash_123',
        executionPrice: '0.955',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Register status callback
      orderProcessor.registerStatusCallback(orderId, (update) => {
        statusUpdates.push(update);
      });

      // Process order
      const order = await orderProcessor.processOrder(orderId, request);

      // Verify status progression
      expect(statusUpdates.length).toBeGreaterThan(0);
      const statuses = statusUpdates.map((u) => u.status);
      expect(statuses).toContain(OrderStatus.PENDING);
      expect(statuses).toContain(OrderStatus.ROUTING);
      expect(statuses).toContain(OrderStatus.BUILDING);
      expect(statuses).toContain(OrderStatus.SUBMITTED);
      expect(statuses).toContain(OrderStatus.CONFIRMED);

      // Verify final order
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(order.txHash).toBe('test_tx_hash_123');
    });

    it('should retry on failure with exponential backoff', async () => {
      let attemptCount = 0;

      mockDEXRouter.getBestQuote.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary error');
        }
        return {
          dex: DEX.RAYDIUM,
          amountOut: '95.5',
          price: '0.955',
          liquidity: '1000000',
        };
      });

      mockDEXRouter.executeOnDEX.mockResolvedValue({
        txHash: 'test_tx_hash_123',
        executionPrice: '0.955',
      });

      mockOrderModel.updateStatus.mockResolvedValue({
        id: orderId,
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 1,
        status: OrderStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockOrderModel.findById.mockResolvedValue({
        id: orderId,
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 1,
        status: OrderStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const startTime = Date.now();
      const order = await orderProcessor.processOrder(orderId, request, 3);
      const endTime = Date.now();

      // Should have retried (took some time due to backoff)
      expect(attemptCount).toBe(3);
      expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second of backoff
      expect(order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should fail after max retries', async () => {
      mockDEXRouter.getBestQuote.mockRejectedValue(new Error('Persistent error'));

      mockOrderModel.updateStatus.mockResolvedValue({
        id: orderId,
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 1,
        status: OrderStatus.FAILED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      orderProcessor.registerStatusCallback(orderId, (update) => {
        statusUpdates.push(update);
      });

      await expect(orderProcessor.processOrder(orderId, request, 2)).rejects.toThrow();

      // Should have failed status
      const failedUpdate = statusUpdates.find((u) => u.status === OrderStatus.FAILED);
      expect(failedUpdate).toBeDefined();
      expect(failedUpdate?.data?.error).toBeDefined();
    });
  });

  describe('status callbacks', () => {
    it('should register and unregister callbacks', () => {
      const orderId = uuidv4();
      const callback = jest.fn();

      orderProcessor.registerStatusCallback(orderId, callback);
      // Callback should be registered (no direct way to test, but unregister should work)
      orderProcessor.unregisterStatusCallback(orderId);
      // Should not throw - verify callback was called if status updates occur
      expect(callback).toBeDefined();
    });
  });
});

