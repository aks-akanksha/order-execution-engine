import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './database/db';
import { OrderModel } from './models/order.model';
import { createDEXRouter } from './services/dex.providers';
import { QueueService } from './services/queue.service';
import { OrderProcessor } from './services/order.processor';
import { ordersRoutes } from './routes/orders.routes';
import { logger } from './utils/logger';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);

export async function buildApp() {
  logger.info('Building Fastify application');
  
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
  });

  await app.register(websocket);

  // Initialize services
  logger.info('Initializing database...');
  try {
    // Add timeout wrapper to prevent hanging
    const initPromise = initializeDatabase();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database initialization timeout after 15 seconds')), 15000)
    );
    
    await Promise.race([initPromise, timeoutPromise]);
    logger.info('Database initialized');
  } catch (error: any) {
    logger.error('Failed to initialize database', { 
      error: error?.message || error,
      hint: 'Make sure DATABASE_URL is set and the database service is running and linked to this web service on Render. Check if DATABASE_URL includes port (usually :5432).'
    });
    throw error;
  }

  logger.info('Creating services...');
  const orderModel = new OrderModel();
  const dexRouter = createDEXRouter();
  const queueService = new QueueService(orderModel, dexRouter);
  const orderProcessor = new OrderProcessor(orderModel, dexRouter);
  logger.info('Services created');

  // Store services in Fastify instance for route access
  app.decorate('orderModel', orderModel);
  app.decorate('queueService', queueService);
  app.decorate('orderProcessor', orderProcessor);

  // Register routes
  await app.register(ordersRoutes);

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Serve demo page at root
  app.get('/', async (request, reply) => {
    const demoHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Execution Engine - Live Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .content { padding: 30px; }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .section h2 { color: #667eea; margin-bottom: 15px; font-size: 1.5em; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
        input, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus, select:focus { outline: none; border-color: #667eea; }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            width: 100%;
            margin-top: 10px;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
        button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .status-box {
            background: #fff;
            border: 2px solid #667eea;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
        }
        .status-item {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            background: #f0f0f0;
            border-left: 4px solid #667eea;
        }
        .status-item.pending { border-left-color: #ffc107; }
        .status-item.routing { border-left-color: #17a2b8; }
        .status-item.building { border-left-color: #6c757d; }
        .status-item.submitted { border-left-color: #007bff; }
        .status-item.confirmed { border-left-color: #28a745; }
        .status-item.failed { border-left-color: #dc3545; }
        .status-item strong { color: #667eea; }
        .info-box {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
        }
        .info-box h3 { color: #0066cc; margin-bottom: 10px; }
        .info-box code {
            background: #fff;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        .endpoint-list {
            list-style: none;
            padding: 0;
        }
        .endpoint-list li {
            padding: 10px;
            margin-bottom: 8px;
            background: white;
            border-radius: 5px;
            border-left: 3px solid #667eea;
        }
        .endpoint-list code {
            background: #f0f0f0;
            padding: 3px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            color: #d63384;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
            margin-left: 10px;
        }
        .badge.get { background: #28a745; color: white; }
        .badge.post { background: #007bff; color: white; }
        .badge.ws { background: #ffc107; color: #000; }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .card h3 { color: #667eea; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Order Execution Engine</h1>
            <p>Real-time DEX Routing & WebSocket Status Updates</p>
            <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                Backend API: <strong>https://order-execution-engine-mqmu.onrender.com</strong>
            </p>
        </div>
        <div class="content">
            <div class="section">
                <h2>📡 Available API Endpoints</h2>
                <ul class="endpoint-list">
                    <li><span class="badge get">GET</span> <code>/health</code> - Health check</li>
                    <li><span class="badge post">POST</span> <code>/api/orders/execute</code> - Create new order</li>
                    <li><span class="badge get">GET</span> <code>/api/orders</code> - List all orders</li>
                    <li><span class="badge get">GET</span> <code>/api/orders/:orderId</code> - Get order details</li>
                    <li><span class="badge get">GET</span> <code>/api/queue/stats</code> - Queue statistics</li>
                    <li><span class="badge ws">WS</span> <code>/api/orders/:orderId/status</code> - WebSocket status updates</li>
                </ul>
            </div>
            <div class="section">
                <h2>📝 Create New Order</h2>
                <div class="form-group">
                    <label for="tokenIn">Token In:</label>
                    <select id="tokenIn"><option value="SOL">SOL</option><option value="USDC">USDC</option><option value="USDT">USDT</option></select>
                </div>
                <div class="form-group">
                    <label for="tokenOut">Token Out:</label>
                    <select id="tokenOut"><option value="USDC">USDC</option><option value="USDT">USDT</option><option value="SOL">SOL</option></select>
                </div>
                <div class="form-group">
                    <label for="amountIn">Amount In:</label>
                    <input type="number" id="amountIn" value="1.0" step="0.1" min="0.1">
                </div>
                <div class="form-group">
                    <label for="slippageTolerance">Slippage Tolerance (%):</label>
                    <input type="number" id="slippageTolerance" value="0.5" step="0.1" min="0" max="10">
                </div>
                <button id="createOrderBtn" onclick="createOrder()">🚀 Create Order</button>
            </div>
            <div class="section">
                <h2>📊 Real-time Status Updates</h2>
                <div class="status-box" id="statusBox">
                    <p style="color: #999; text-align: center; padding: 20px;">No order created yet. Create an order to see real-time status updates via WebSocket.</p>
                </div>
            </div>
            <div class="section">
                <h2>⚡ Quick Actions</h2>
                <div class="grid">
                    <div class="card"><h3>Health Check</h3><button onclick="checkHealth()">Check Server Health</button></div>
                    <div class="card"><h3>List Orders</h3><button onclick="listOrders()">View All Orders</button></div>
                    <div class="card"><h3>Queue Stats</h3><button onclick="getQueueStats()">View Queue Stats</button></div>
                </div>
            </div>
        </div>
    </div>
    <script>
        const API_URL = window.location.origin;
        let currentOrderId = null;
        let wsConnection = null;
        function addStatusMessage(message, status = 'info') {
            const statusBox = document.getElementById('statusBox');
            const timestamp = new Date().toLocaleTimeString();
            const statusItem = document.createElement('div');
            statusItem.className = \`status-item \${status}\`;
            statusItem.innerHTML = \`<strong>[\${timestamp}]</strong> \${message}\`;
            statusBox.insertBefore(statusItem, statusBox.firstChild);
        }
        function clearStatusBox() { document.getElementById('statusBox').innerHTML = ''; }
        async function createOrder() {
            const btn = document.getElementById('createOrderBtn');
            btn.disabled = true;
            btn.textContent = 'Creating Order...';
            clearStatusBox();
            addStatusMessage('Creating new order...', 'pending');
            const orderData = {
                type: 'market',
                tokenIn: document.getElementById('tokenIn').value,
                tokenOut: document.getElementById('tokenOut').value,
                amountIn: document.getElementById('amountIn').value,
                slippageTolerance: parseFloat(document.getElementById('slippageTolerance').value)
            };
            try {
                const response = await fetch(\`\${API_URL}/api/orders/execute\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });
                if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
                const result = await response.json();
                currentOrderId = result.orderId;
                addStatusMessage(\`✅ Order created! ID: \${result.orderId}\`, 'pending');
                addStatusMessage(\`Status: \${result.status}\`, 'pending');
                addStatusMessage(\`WebSocket endpoint: \${result.wsEndpoint}\`, 'pending');
                connectWebSocket(result.orderId);
                setTimeout(() => { getOrderDetails(result.orderId); }, 2000);
            } catch (error) {
                addStatusMessage(\`❌ Error creating order: \${error.message}\`, 'failed');
            } finally {
                btn.disabled = false;
                btn.textContent = '🚀 Create Order';
            }
        }
        function connectWebSocket(orderId) {
            if (wsConnection) wsConnection.close();
            const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
            const ws = new WebSocket(\`\${wsUrl}/api/orders/\${orderId}/status\`);
            ws.onopen = () => addStatusMessage('🔌 WebSocket connected', 'routing');
            ws.onmessage = (event) => {
                const update = JSON.parse(event.data);
                const status = update.status || 'info';
                let message = \`📊 Status: \${update.status.toUpperCase()}\`;
                if (update.message) message += \` - \${update.message}\`;
                if (update.data) {
                    if (update.data.selectedDex) message += \` (DEX: \${update.data.selectedDex})\`;
                    if (update.data.txHash) message += \` | TX: \${update.data.txHash}\`;
                    if (update.data.executionPrice) message += \` | Price: \${update.data.executionPrice}\`;
                }
                addStatusMessage(message, status);
                if (status === 'confirmed') {
                    addStatusMessage('🎉 Order confirmed successfully!', 'confirmed');
                    ws.close();
                } else if (status === 'failed') {
                    addStatusMessage('❌ Order failed!', 'failed');
                    ws.close();
                }
            };
            ws.onerror = (error) => addStatusMessage('❌ WebSocket error', 'failed');
            ws.onclose = () => addStatusMessage('🔌 WebSocket connection closed', 'info');
            wsConnection = ws;
        }
        async function checkHealth() {
            try {
                const response = await fetch(\`\${API_URL}/health\`);
                const data = await response.json();
                alert(\`✅ Server is healthy!\\nStatus: \${data.status}\\nTimestamp: \${data.timestamp}\`);
            } catch (error) { alert(\`❌ Error: \${error.message}\`); }
        }
        async function listOrders() {
            try {
                const response = await fetch(\`\${API_URL}/api/orders\`);
                const orders = await response.json();
                const count = Array.isArray(orders) ? orders.length : 0;
                alert(\`📋 Found \${count} orders\\n\\nCheck console for full details.\`);
                console.log('All Orders:', orders);
            } catch (error) { alert(\`❌ Error: \${error.message}\`); }
        }
        async function getQueueStats() {
            try {
                const response = await fetch(\`\${API_URL}/api/queue/stats\`);
                const stats = await response.json();
                alert(\`📊 Queue Statistics:\\n\\nWaiting: \${stats.waiting}\\nActive: \${stats.active}\\nCompleted: \${stats.completed}\\nFailed: \${stats.failed}\`);
            } catch (error) { alert(\`❌ Error: \${error.message}\`); }
        }
        async function getOrderDetails(orderId) {
            try {
                const response = await fetch(\`\${API_URL}/api/orders/\${orderId}\`);
                const order = await response.json();
                addStatusMessage(\`📋 Order Details: \${JSON.stringify(order, null, 2)}\`, 'info');
                console.log('Order Details:', order);
            } catch (error) { console.error('Error fetching order details:', error); }
        }
    </script>
</body>
</html>`;
    return reply.type('text/html').send(demoHtml);
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`🚀 Server running on http://localhost:${PORT}`, { port: PORT });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      await app.close();
      await closeDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Error starting server', { error });
    process.exit(1);
  }
}

// Only start server if this file is run directly (not imported for tests)
if (require.main === module) {
  start();
}

