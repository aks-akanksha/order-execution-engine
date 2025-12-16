import { orderRequestSchema } from '../../validators/order.validator';
import { OrderType } from '../../types/order';

describe('Order Validators', () => {
  describe('orderRequestSchema', () => {
    it('should validate correct order request', () => {
      const validRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 1,
      };

      const result = orderRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(OrderType.MARKET);
        expect(result.data.tokenIn).toBe('SOL');
      }
    });

    it('should reject missing required fields', () => {
      const invalidRequest = {
        type: OrderType.MARKET,
        // Missing tokenIn, tokenOut, amountIn
      };

      const result = orderRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid amount format', () => {
      const invalidRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 'not-a-number',
      };

      const result = orderRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid slippage tolerance', () => {
      const invalidRequest = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
        slippageTolerance: 100, // Too high
      };

      const result = orderRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should set default slippage tolerance', () => {
      const request = {
        type: OrderType.MARKET,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: '100',
      };

      const result = orderRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slippageTolerance).toBe(1);
      }
    });
  });
});

