/**
 * Example client for Order Execution Engine
 * Demonstrates how to create an order and receive WebSocket status updates
 */

const WebSocket = require('ws');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

async function createOrder() {
  const orderRequest = {
    type: 'market',
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amountIn: '100',
    slippageTolerance: 1,
  };

  console.log('Creating order...', orderRequest);

  const response = await fetch(`${BASE_URL}/api/orders/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderRequest),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create order: ${error}`);
  }

  const result = await response.json();
  console.log('Order created:', result);
  return result.orderId;
}

function connectWebSocket(orderId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}/api/orders/${orderId}/status`);

    ws.on('open', () => {
      console.log(`\n✅ WebSocket connected for order ${orderId}\n`);
    });

    ws.on('message', (data) => {
      const update = JSON.parse(data.toString());
      console.log(`📊 Status Update:`, {
        status: update.status,
        message: update.message,
        data: update.data,
      });

      // Check if order is complete
      if (update.status === 'confirmed') {
        console.log('\n🎉 Order confirmed!');
        console.log('Transaction Hash:', update.data?.txHash);
        console.log('Execution Price:', update.data?.executionPrice);
        ws.close();
        resolve(update);
      } else if (update.status === 'failed') {
        console.error('\n❌ Order failed!');
        console.error('Error:', update.data?.error);
        ws.close();
        reject(new Error(update.data?.error || 'Order failed'));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });

    ws.on('close', () => {
      console.log('\n🔌 WebSocket connection closed');
    });
  });
}

async function main() {
  try {
    // Create order
    const orderId = await createOrder();

    // Connect to WebSocket for status updates
    await connectWebSocket(orderId);

    // Optionally, fetch final order details
    const response = await fetch(`${BASE_URL}/api/orders/${orderId}`);
    const order = await response.json();
    console.log('\n📋 Final Order Details:', order);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run example
if (require.main === module) {
  main();
}

module.exports = { createOrder, connectWebSocket };

