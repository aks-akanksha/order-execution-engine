import { Order, OrderStatus, OrderRequest, OrderStatusUpdate, DEX } from '../types/order';
import { OrderModel } from '../models/order.model';
import { DEXRouter } from './dex.router';
import { v4 as uuidv4 } from 'uuid';

export class OrderProcessor {
  private orderModel: OrderModel;
  private dexRouter: DEXRouter;
  private statusCallbacks: Map<string, (update: OrderStatusUpdate) => void>;

  constructor(orderModel: OrderModel, dexRouter: DEXRouter) {
    this.orderModel = orderModel;
    this.dexRouter = dexRouter;
    this.statusCallbacks = new Map();
  }

  registerStatusCallback(orderId: string, callback: (update: OrderStatusUpdate) => void): void {
    this.statusCallbacks.set(orderId, callback);
  }

  unregisterStatusCallback(orderId: string): void {
    this.statusCallbacks.delete(orderId);
  }

  private async emitStatus(update: OrderStatusUpdate): Promise<void> {
    const callback = this.statusCallbacks.get(update.orderId);
    if (callback) {
      callback(update);
    }
  }

  async processOrder(orderId: string, request: OrderRequest, maxRetries = 3): Promise<Order> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        return await this.executeOrder(orderId, request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        if (retryCount < maxRetries) {
          const backoffMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Order ${orderId} failed, retrying in ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await this.delay(backoffMs);
        }
      }
    }

    // All retries exhausted
    const errorMessage = lastError?.message || 'Unknown error occurred';
    await this.orderModel.updateStatus(orderId, OrderStatus.FAILED, {
      error: `Failed after ${maxRetries} attempts: ${errorMessage}`,
    });

    await this.emitStatus({
      orderId,
      status: OrderStatus.FAILED,
      message: 'Order execution failed',
      data: { error: errorMessage },
    });

    throw lastError || new Error('Order execution failed');
  }

  private async executeOrder(orderId: string, request: OrderRequest): Promise<Order> {
    // Status: PENDING
    await this.emitStatus({
      orderId,
      status: OrderStatus.PENDING,
      message: 'Order received and queued',
    });

    // Status: ROUTING
    await this.emitStatus({
      orderId,
      status: OrderStatus.ROUTING,
      message: 'Comparing DEX prices',
    });

    const quote = await this.dexRouter.getBestQuote(request);
    if (!quote) {
      throw new Error('No quotes available from any DEX');
    }

    await this.orderModel.updateStatus(orderId, OrderStatus.ROUTING, {
      selectedDex: quote.dex,
    });

    await this.emitStatus({
      orderId,
      status: OrderStatus.ROUTING,
      message: `Selected ${quote.dex} for best price`,
      data: { selectedDex: quote.dex },
    });

    // Status: BUILDING
    await this.emitStatus({
      orderId,
      status: OrderStatus.BUILDING,
      message: 'Creating transaction',
    });

    await this.orderModel.updateStatus(orderId, OrderStatus.BUILDING);

    // Status: SUBMITTED
    await this.emitStatus({
      orderId,
      status: OrderStatus.SUBMITTED,
      message: 'Transaction sent to network',
    });

    await this.orderModel.updateStatus(orderId, OrderStatus.SUBMITTED);

    // Execute swap
    const executionResult = await this.dexRouter.executeOnDEX(request, quote.dex);

    // Status: CONFIRMED
    await this.orderModel.updateStatus(orderId, OrderStatus.CONFIRMED, {
      txHash: executionResult.txHash,
      executionPrice: executionResult.executionPrice,
      amountOut: quote.amountOut,
    });

    await this.orderModel.addStatusHistory(orderId, OrderStatus.CONFIRMED, 'Transaction confirmed', {
      txHash: executionResult.txHash,
      executionPrice: executionResult.executionPrice,
    });

    await this.emitStatus({
      orderId,
      status: OrderStatus.CONFIRMED,
      message: 'Transaction successful',
      data: {
        selectedDex: quote.dex,
        txHash: executionResult.txHash,
        executionPrice: executionResult.executionPrice,
      },
    });

    const finalOrder = await this.orderModel.findById(orderId);
    if (!finalOrder) {
      throw new Error('Order not found after execution');
    }

    return finalOrder;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

