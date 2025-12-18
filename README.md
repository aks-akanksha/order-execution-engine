# Order Execution Engine

A high-performance order execution engine with DEX routing and real-time WebSocket status updates. This system processes market orders by comparing prices across multiple DEXs (Raydium and Meteora) and routing to the best execution venue.

## 🚀 Real Blockchain Integration (NEW!)

The engine now supports **real Solana devnet execution** with actual Raydium and Meteora SDKs! Enable it by setting `USE_REAL_BLOCKCHAIN=true` in your environment variables. See [BLOCKCHAIN_INTEGRATION.md](./BLOCKCHAIN_INTEGRATION.md) for details.

## 🎯 Design Decisions

### Why Market Orders?

I chose **market orders** as the primary order type because:

1. **Simplicity & Speed**: Market orders execute immediately at the best available price, making them ideal for demonstrating the DEX routing logic and real-time status updates without additional complexity of price monitoring.

2. **Best Fit for DEX Routing**: Market orders require immediate execution, which perfectly showcases the system's ability to compare quotes from multiple DEXs and select the optimal venue in real-time.

3. **Foundation for Extension**: The architecture is designed to easily extend to limit and sniper orders:
   - **Limit Orders**: Add a price monitoring service that checks current market price against the limit price before routing
   - **Sniper Orders**: Add event listeners for token launches/migrations and trigger execution when conditions are met

The core routing and execution logic remains the same; additional order types simply add pre-execution conditions.

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/orders/execute
       ▼
┌─────────────────┐
│  Fastify API    │
│  (HTTP Server)  │
└──────┬──────────┘
       │
       ├──► Creates Order (PostgreSQL)
       │
       └──► Adds to Queue (BullMQ + Redis)
                    │
                    ▼
            ┌───────────────┐
            │  Order Queue  │
            │  (BullMQ)     │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │Order Processor│
            └───────┬───────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────┐
│   Raydium   │      │   Meteora    │
│   Provider  │      │   Provider   │
└──────┬───────┘      └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌────────────────┐
         │  DEX Router    │
         │  (Best Price)   │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │   Execution     │
         │   (Mock Swap)   │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ WebSocket Update│
         │  (Status Push)  │
         └─────────────────┘
```

## 🚀 Features

- **DEX Routing**: Automatically compares quotes from Raydium and Meteora, selecting the best price
- **Real-time Updates**: WebSocket streaming of order lifecycle (pending → routing → building → submitted → confirmed/failed)
- **Queue Management**: Handles up to 10 concurrent orders, processing 100 orders/minute
- **Retry Logic**: Exponential backoff retry (≤3 attempts) with failure tracking
- **Order History**: PostgreSQL persistence for audit trail and post-mortem analysis
- **Status Tracking**: Complete order lifecycle with status history

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd order_execution_engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/order_engine
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   QUEUE_CONCURRENCY=10
   ORDERS_PER_MINUTE=100
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb order_engine
   
   # Or using psql
   psql -U postgres -c "CREATE DATABASE order_engine;"
   ```

5. **Initialize database schema**
   ```bash
   # The schema will be automatically initialized on first run
   # Or manually run:
   psql -U postgres -d order_engine -f src/database/schema.sql
   ```

6. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or using system service
   redis-server
   ```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📡 API Endpoints

### POST /api/orders/execute
Create a new market order.

**Request Body:**
```json
{
  "type": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": "100",
  "slippageTolerance": 1
}
```

**Response:**
```json
{
  "orderId": "uuid-here",
  "status": "pending",
  "wsEndpoint": "/api/orders/{orderId}/status",
  "message": "Order queued for processing. Connect to WebSocket endpoint for live updates."
}
```

### GET /api/orders/:orderId
Get order details by ID.

**Response:**
```json
{
  "id": "uuid-here",
  "type": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": "100",
  "status": "confirmed",
  "selectedDex": "raydium",
  "executionPrice": "0.955",
  "txHash": "raydium_1234567890_abc123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:10.000Z"
}
```

### GET /api/orders
List all orders (last 100).

### GET /api/queue/stats
Get queue statistics.

**Response:**
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 150,
  "failed": 3
}
```

### WebSocket: ws://localhost:3000/api/orders/:orderId/status
Real-time order status updates.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/api/orders/{orderId}/status');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Status:', update.status, update.message);
  // Example updates:
  // { orderId: "...", status: "pending", message: "Order received and queued" }
  // { orderId: "...", status: "routing", message: "Comparing DEX prices", data: { selectedDex: "raydium" } }
  // { orderId: "...", status: "building", message: "Creating transaction" }
  // { orderId: "...", status: "submitted", message: "Transaction sent to network" }
  // { orderId: "...", status: "confirmed", message: "Transaction successful", data: { txHash: "...", executionPrice: "0.955" } }
};
```

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Test Coverage
The test suite includes:
- **Unit Tests**: DEX router, DEX providers, order processor, order model, validators
- **Integration Tests**: API endpoints, queue behavior, WebSocket lifecycle

Total: 15+ tests covering:
- DEX routing logic and best quote selection
- Order processing with status updates
- Queue behavior and concurrency
- WebSocket lifecycle and status streaming
- Database operations and order persistence
- Input validation and error handling

## 📦 API Collection

Import the Postman collection from `postman_collection.json` to test all endpoints.

### Using Postman
1. Open Postman
2. Click "Import"
3. Select `postman_collection.json`
4. Set `base_url` variable to your server URL (default: `http://localhost:3000`)

### Using Insomnia
1. Open Insomnia
2. Go to Application → Preferences → Data → Import Data
3. Select `postman_collection.json`

## 🔄 Order Status Flow

```
pending → routing → building → submitted → confirmed
                                    ↓
                                 failed
```

1. **pending**: Order received and queued
2. **routing**: Comparing DEX prices (Raydium vs Meteora)
3. **building**: Creating transaction
4. **submitted**: Transaction sent to network
5. **confirmed**: Transaction successful (includes txHash)
6. **failed**: Execution failed (includes error message)

## 🔧 Configuration

### Queue Settings
- `QUEUE_CONCURRENCY`: Maximum concurrent orders (default: 10)
- `ORDERS_PER_MINUTE`: Rate limit for order processing (default: 100)

### Retry Logic
- Maximum 3 retry attempts
- Exponential backoff: 2s, 4s, 8s
- Failed orders are persisted with error details

## 🏗️ Tech Stack

- **Runtime**: Node.js + TypeScript
- **Web Framework**: Fastify (with WebSocket support)
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL (order history) + Redis (active orders)
- **Validation**: Zod
- **Testing**: Jest + Supertest

## 📝 Extending to Other Order Types

### Limit Orders
1. Add price monitoring service
2. Check current market price against limit price
3. Route to DEX when price condition is met
4. Use existing execution pipeline

### Sniper Orders
1. Add event listener for token launches
2. Monitor blockchain events for new token deployments
3. Trigger execution when launch conditions detected
4. Use existing DEX routing and execution logic

## 📦 Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Install dependencies
npm install

# Run the application
npm run dev
```

## 🔧 Git Workflow

Use standard git commands for commits:

```bash
git add .
git commit -m "feat: your feature description"
git push
```

## 🚀 Deployment

### Live Demo

**Deployed URL**: https://order-execution-engine-mqmu.onrender.com

Once deployed, the API will be available at:
- **Health Check**: `GET https://your-deployment-url.com/health`
- **Create Order**: `POST https://your-deployment-url.com/api/orders/execute`
- **WebSocket**: `wss://your-deployment-url.com/api/orders/:orderId/status`

### Quick Deploy Options

#### Option 1: Render (Recommended - Free Tier)

1. **Sign up at [Render.com](https://render.com)**
2. **Create PostgreSQL Database:**
   - New → PostgreSQL
   - Copy Internal Database URL
3. **Create Redis Instance:**
   - New → Redis
   - Copy Internal Redis URL
4. **Deploy Web Service:**
   - New → Web Service
   - Connect GitHub repository
   - Build Command: `npm ci && npm run build`
   - Start Command: `node dist/index.js`
   - Add environment variables (see below)

#### Option 2: Railway

1. **Sign up at [Railway.app](https://railway.app)**
2. **New Project → Deploy from GitHub**
3. **Add PostgreSQL** (auto-configured)
4. **Add Redis** (auto-configured)
5. Railway auto-deploys on push

#### Option 3: Fly.io

```bash
fly launch
fly postgres create
fly redis create
fly deploy
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/order_engine
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
QUEUE_CONCURRENCY=10
ORDERS_PER_MINUTE=100
```

### Docker Deployment

A `Dockerfile` is included for containerized deployment:

```bash
docker build -t order-execution-engine .
docker run -p 3000:3000 --env-file .env order-execution-engine
```

## 📊 Monitoring

- Queue statistics: `GET /api/queue/stats`
- Order history: `GET /api/orders`
- Health check: `GET /health`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT

## 🔗 Links

- **GitHub Repository**: https://github.com/aks-akanksha/order-execution-engine
- **API Documentation**: See README.md above
- **Deployment URL**: https://order-execution-engine-mqmu.onrender.com
- **Demo Video**: https://youtu.be/-sEVSqcGivE

---

**Note**: This is a mock implementation for demonstration purposes. For production use with real DEXs, integrate actual Raydium and Meteora SDKs and handle real blockchain transactions.

