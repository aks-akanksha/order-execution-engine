import { z } from 'zod';
import { OrderType } from '../types/order';

export const orderRequestSchema = z.object({
  type: z.nativeEnum(OrderType),
  tokenIn: z.string().min(1, 'Token in address is required'),
  tokenOut: z.string().min(1, 'Token out address is required'),
  amountIn: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  slippageTolerance: z.number().min(0).max(50).optional().default(1),
  limitPrice: z.string().optional(),
});

export type ValidatedOrderRequest = z.infer<typeof orderRequestSchema>;

