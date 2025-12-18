import { Pool } from 'pg';
import { getPool } from '../database/db';
import { Order, OrderStatus, OrderType, DEX } from '../types/order';

export class OrderModel {
  public pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async create(order: Omit<Order, 'createdAt' | 'updatedAt'>): Promise<Order> {
    const query = `
      INSERT INTO orders (
        id, user_id, type, token_in, token_out, amount_in, amount_out,
        slippage_tolerance, status, selected_dex, execution_price, tx_hash, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const values = [
      order.id,
      order.userId || null,
      order.type,
      order.tokenIn,
      order.tokenOut,
      order.amountIn,
      order.amountOut || null,
      order.slippageTolerance,
      order.status,
      order.selectedDex || null,
      order.executionPrice || null,
      order.txHash || null,
      order.error || null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToOrder(result.rows[0]);
  }

  async findById(id: string): Promise<Order | null> {
    const query = `
      SELECT *, created_at as "createdAt", updated_at as "updatedAt"
      FROM orders
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOrder(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    updates?: Partial<Pick<Order, 'selectedDex' | 'executionPrice' | 'txHash' | 'error' | 'amountOut'>>
  ): Promise<Order> {
    const updateFields: string[] = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const values: (string | number | null)[] = [id, status];
    let paramIndex = 3;

    if (updates?.selectedDex) {
      updateFields.push(`selected_dex = $${paramIndex}`);
      values.push(updates.selectedDex);
      paramIndex++;
    }

    if (updates?.executionPrice) {
      updateFields.push(`execution_price = $${paramIndex}`);
      values.push(updates.executionPrice);
      paramIndex++;
    }

    if (updates?.txHash) {
      updateFields.push(`tx_hash = $${paramIndex}`);
      values.push(updates.txHash);
      paramIndex++;
    }

    if (updates?.error) {
      updateFields.push(`error = $${paramIndex}`);
      values.push(updates.error);
      paramIndex++;
    }

    if (updates?.amountOut) {
      updateFields.push(`amount_out = $${paramIndex}`);
      values.push(updates.amountOut);
      paramIndex++;
    }

    const query = `
      UPDATE orders
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *, created_at as "createdAt", updated_at as "updatedAt"
    `;

    const result = await this.pool.query(query, values);
    return this.mapRowToOrder(result.rows[0] as Record<string, unknown>);
  }

  async addStatusHistory(
    orderId: string,
    status: OrderStatus,
    message?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const query = `
      INSERT INTO order_status_history (order_id, status, message, metadata)
      VALUES ($1, $2, $3, $4)
    `;

    await this.pool.query(query, [orderId, status, message || null, metadata ? JSON.stringify(metadata) : null]);
  }

  private mapRowToOrder(row: Record<string, unknown>): Order {
    return {
      id: String(row.id),
      userId: row.user_id ? String(row.user_id) : undefined,
      type: row.type as OrderType,
      tokenIn: String(row.token_in),
      tokenOut: String(row.token_out),
      amountIn: String(row.amount_in),
      amountOut: row.amount_out ? String(row.amount_out) : undefined,
      slippageTolerance: parseFloat(String(row.slippage_tolerance)),
      status: row.status as OrderStatus,
      selectedDex: row.selected_dex ? (row.selected_dex as DEX) : undefined,
      executionPrice: row.execution_price ? String(row.execution_price) : undefined,
      txHash: row.tx_hash ? String(row.tx_hash) : undefined,
      error: row.error ? String(row.error) : undefined,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    };
  }
}

