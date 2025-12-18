# Deployment Instructions

## ✅ Deployment Configuration Complete

All deployment files have been created and committed. The application is ready to deploy.

## 🚀 Quick Deploy to Render (Recommended)

### Step 1: Sign up and Connect GitHub
1. Go to https://render.com
2. Sign up with your GitHub account
3. Click "New" → "Web Service"
4. Connect your repository: `aks-akanksha/order-execution-engine`

### Step 2: Create PostgreSQL Database
1. In Render dashboard, click "New" → "PostgreSQL"
2. Name: `order-execution-db`
3. Plan: Free
4. Copy the **Internal Database URL** (you'll need this)

### Step 3: Create Redis Instance
1. In Render dashboard, click "New" → "Redis"
2. Name: `order-execution-redis`
3. Plan: Free
4. Copy the **Internal Redis URL** and credentials

### Step 4: Configure Web Service
1. **Name**: `order-execution-engine`
2. **Environment**: `Node`
3. **Build Command**: `npm ci && npm run build`
4. **Start Command**: `node dist/index.js`
5. **Plan**: Free

### Step 5: Add Environment Variables
In the Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<your-postgres-internal-url>
REDIS_HOST=<redis-host-from-internal-url>
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
QUEUE_CONCURRENCY=10
ORDERS_PER_MINUTE=100
LOG_LEVEL=info
```

### Step 6: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Your app will be available at: `https://order-execution-engine.onrender.com`

### Step 7: Update README
Once deployed, update the README.md with your deployment URL:

```markdown
## 🚀 Live Demo

**Deployed URL**: https://order-execution-engine.onrender.com
```

Then commit and push:
```bash
git add README.md
git commit -m "docs: add deployment URL to README"
git push origin main
```

## 🔐 GitHub Push

If you encounter authentication issues when pushing:

### Option 1: Use SSH (Recommended)
```bash
git remote set-url origin git@github.com:aks-akanksha/order-execution-engine.git
git push origin main
```

### Option 2: Use Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` permissions
3. Use token as password when pushing:
```bash
git push origin main
# Username: your-github-username
# Password: your-personal-access-token
```

## ✅ Verification Checklist

After deployment, verify:
- [ ] Health endpoint works: `GET https://your-url.com/health`
- [ ] API endpoint works: `POST https://your-url.com/api/orders/execute`
- [ ] WebSocket connection works
- [ ] Database connection is working
- [ ] Redis connection is working
- [ ] Logs are being generated
- [ ] Queue is processing orders

## 📝 Current Status

✅ All deployment files created
✅ Dockerfile configured
✅ Railway and Render configs ready
✅ README updated with deployment section
✅ All commits are clean and descriptive
✅ Ready for deployment

**Next Step**: Deploy to Render/Railway and update README with the URL!

