export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  SNIPER = 'sniper',
}

export enum DEX {
  RAYDIUM = 'raydium',
  METEORA = 'meteora',
}

export interface OrderRequest {
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippageTolerance?: number; // percentage, default 1%
  limitPrice?: string; // for limit orders
}

export interface Order {
  id: string;
  userId?: string;
  type: OrderType;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut?: string;
  slippageTolerance: number;
  status: OrderStatus;
  selectedDex?: DEX;
  executionPrice?: string;
  txHash?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DEXQuote {
  dex: DEX;
  amountOut: string;
  price: string;
  liquidity: string;
  estimatedGas?: string;
}

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  message?: string;
  data?: {
    selectedDex?: DEX;
    executionPrice?: string;
    txHash?: string;
    error?: string;
  };
}

