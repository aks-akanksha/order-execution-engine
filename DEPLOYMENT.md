# Deployment Guide

## Free Hosting Options

This application can be deployed on several free hosting platforms. We recommend **Render** or **Railway** for the best free tier experience.

## Option 1: Render (Recommended)

### Prerequisites
- GitHub account with repository pushed
- Render account (free tier available)

### Steps

1. **Sign up at [Render.com](https://render.com)**

2. **Create PostgreSQL Database:**
   - Go to Dashboard → New → PostgreSQL
   - Name: `order-execution-db`
   - Region: Choose closest to you
   - Plan: Free
   - Copy the **Internal Database URL**

3. **Create Redis Instance:**
   - Go to Dashboard → New → Redis
   - Name: `order-execution-redis`
   - Region: Same as database
   - Plan: Free
   - Copy the **Internal Redis URL**

4. **Deploy Web Service:**
   - Go to Dashboard → New → Web Service
   - Connect your GitHub repository
   - Settings:
     - **Name**: `order-execution-engine`
     - **Environment**: `Node`
     - **Build Command**: `npm ci && npm run build`
     - **Start Command**: `node dist/index.js`
     - **Plan**: Free

5. **Environment Variables:**
   Add these in the Render dashboard:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=<your-postgres-internal-url>
   REDIS_HOST=<redis-host-from-internal-url>
   REDIS_PORT=6379
   REDIS_PASSWORD=<redis-password-from-internal-url>
   ```

6. **Deploy:**
   - Click "Create Web Service"
   - Render will build and deploy automatically
   - Your app will be available at: `https://order-execution-engine.onrender.com`

## Option 2: Railway

### Prerequisites
- GitHub account with repository pushed
- Railway account (free tier available)

### Steps

1. **Sign up at [Railway.app](https://railway.app)**

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL:**
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway automatically provides connection string

4. **Add Redis:**
   - Click "+ New" → "Database" → "Redis"
   - Railway automatically provides connection string

5. **Configure Environment Variables:**
   Railway auto-detects from `railway.json`, but add:
   ```
   DATABASE_URL=<auto-provided>
   REDIS_HOST=<auto-provided>
   REDIS_PORT=6379
   REDIS_PASSWORD=<auto-provided>
   ```

6. **Deploy:**
   - Railway auto-deploys on push
   - Your app will be available at: `https://<project-name>.up.railway.app`

## Option 3: Fly.io

### Steps

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Create App:**
   ```bash
   fly launch
   ```

4. **Add PostgreSQL:**
   ```bash
   fly postgres create
   fly postgres attach <postgres-app-name>
   ```

5. **Add Redis:**
   ```bash
   fly redis create
   ```

6. **Deploy:**
   ```bash
   fly deploy
   ```

## Post-Deployment

After deployment, update the README.md with your deployment URL:

```markdown
## 🚀 Live Demo

**Deployed URL**: https://your-deployment-url.com

### API Endpoints
- Health Check: `GET https://your-deployment-url.com/health`
- Create Order: `POST https://your-deployment-url.com/api/orders/execute`
- WebSocket: `wss://your-deployment-url.com/api/orders/:orderId/status`
```

## Environment Variables Reference

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password
QUEUE_CONCURRENCY=10
ORDERS_PER_MINUTE=100
```

## Troubleshooting

- **Build fails**: Check that `npm run build` works locally
- **Database connection fails**: Verify DATABASE_URL format
- **Redis connection fails**: Check REDIS_HOST and REDIS_PORT
- **Port issues**: Ensure PORT environment variable is set

