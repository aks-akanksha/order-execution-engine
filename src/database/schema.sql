-- Order Execution Engine Database Schema

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  token_in VARCHAR(255) NOT NULL,
  token_out VARCHAR(255) NOT NULL,
  amount_in NUMERIC(36, 18) NOT NULL,
  amount_out NUMERIC(36, 18),
  slippage_tolerance NUMERIC(5, 2) DEFAULT 1.0,
  status VARCHAR(50) NOT NULL,
  selected_dex VARCHAR(50),
  execution_price NUMERIC(36, 18),
  tx_hash VARCHAR(255),
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Order status history for audit trail
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

