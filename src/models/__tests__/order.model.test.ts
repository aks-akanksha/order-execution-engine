import { OrderModel } from '../order.model';
import { OrderStatus, OrderType } from '../../types/order';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Mock pg Pool
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
      connect: jest.fn(),
      end: jest.fn(),
    })),
  };
});

describe('OrderModel', () => {
  let orderModel: OrderModel;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    const Pool = require('pg').Pool;
    mockPool = new Pool() as jest.Mocked<Pool>;
    orderModel = new OrderModel();
    (orderModel as any).pool = mockPool;
  });

  describe('create', () => {
    it('should create an order', async () => {
      const orderId = uuidv4();
      const mockOrder = {
        id: orderId,
        user_id: null,
        type: OrderType.MARKET,
        token_in: 'SOL',
        token_out: 'USDC',
        amount_in: '100',
        amount_out: null,
        slippage_tolerance: 1,
        status: OrderStatus.PENDING,
        selected_dex: null,
        execution_price: null,
        tx_hash: null,
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValue({
        rows: [mockOrder],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const order = await orderModel.create({
        id: orderId,
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 1,
        status: OrderStatus.PENDING,
      });

      expect(order.id).toBe(orderId);
      expect(order.type).toBe(OrderType.MARKET);
      expect(order.tokenIn).toBe('SOL');
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find order by id', async () => {
      const orderId = uuidv4();
      const mockOrder = {
        id: orderId,
        user_id: null,
        type: OrderType.MARKET,
        token_in: 'SOL',
        token_out: 'USDC',
        amount_in: '100',
        amount_out: '95',
        slippage_tolerance: 1,
        status: OrderStatus.CONFIRMED,
        selected_dex: 'raydium',
        execution_price: '0.95',
        tx_hash: 'test_hash',
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValue({
        rows: [mockOrder],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const order = await orderModel.findById(orderId);

      expect(order).toBeDefined();
      expect(order?.id).toBe(orderId);
      expect(order?.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should return null if order not found', async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const order = await orderModel.findById('non-existent-id');

      expect(order).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const orderId = uuidv4();
      const mockUpdatedOrder = {
        id: orderId,
        user_id: null,
        type: OrderType.MARKET,
        token_in: 'SOL',
        token_out: 'USDC',
        amount_in: '100',
        amount_out: '95',
        slippage_tolerance: 1,
        status: OrderStatus.CONFIRMED,
        selected_dex: 'raydium',
        execution_price: '0.95',
        tx_hash: 'test_hash',
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValue({
        rows: [mockUpdatedOrder],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const order = await orderModel.updateStatus(orderId, OrderStatus.CONFIRMED, {
        txHash: 'test_hash',
        executionPrice: '0.95',
        amountOut: '95',
      });

      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(order.txHash).toBe('test_hash');
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('addStatusHistory', () => {
    it('should add status history entry', async () => {
      const orderId = uuidv4();

      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      await orderModel.addStatusHistory(orderId, OrderStatus.PENDING, 'Order created', {
        test: 'data',
      });

      expect(mockPool.query).toHaveBeenCalled();
      const callArgs = mockPool.query.mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO order_status_history');
    });
  });
});

