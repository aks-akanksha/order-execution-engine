# 🚀 Deploy Now - Step by Step Guide

## Current Status
✅ All code is ready and committed locally
✅ Deployment files are configured
⏳ Need to: Push to GitHub → Deploy → Update README

## Step 1: Push to GitHub

### Option A: If you have SSH keys set up
```bash
git push origin main
```

### Option B: If you need to use HTTPS with Personal Access Token
```bash
# Switch back to HTTPS
git remote set-url origin https://github.com/aks-akanksha/order-execution-engine.git

# Push (will prompt for credentials)
git push origin main
# Username: aks-akanksha
# Password: <your-personal-access-token>
```

**To create Personal Access Token:**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `repo` (full control)
4. Copy the token and use it as password

## Step 2: Deploy to Render

### Quick Steps:

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign in with GitHub

2. **Create PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Name: `order-execution-db`
   - Plan: **Free**
   - Region: Choose closest
   - Click "Create Database"
   - **IMPORTANT**: Copy the "Internal Database URL" (starts with `postgresql://`)

3. **Create Redis Instance**
   - Click "New" → "Redis"
   - Name: `order-execution-redis`
   - Plan: **Free**
   - Region: Same as database
   - Click "Create Redis"
   - **IMPORTANT**: Copy:
     - Redis Host (e.g., `redis-xxxxx.render.com`)
     - Redis Port (usually `6379`)
     - Redis Password (shown once, copy it!)

4. **Deploy Web Service**
   - Click "New" → "Web Service"
   - Connect GitHub repository: `aks-akanksha/order-execution-engine`
   - Configure:
     - **Name**: `order-execution-engine`
     - **Environment**: `Node`
     - **Region**: Same as database
     - **Branch**: `main`
     - **Root Directory**: (leave empty)
     - **Build Command**: `npm ci && npm run build`
     - **Start Command**: `node dist/index.js`
     - **Plan**: **Free**

5. **Add Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:
   ```
   NODE_ENV = production
   PORT = 3000
   DATABASE_URL = <paste-internal-database-url-from-step-2>
   REDIS_HOST = <paste-redis-host-from-step-3>
   REDIS_PORT = 6379
   REDIS_PASSWORD = <paste-redis-password-from-step-3>
   QUEUE_CONCURRENCY = 10
   ORDERS_PER_MINUTE = 100
   LOG_LEVEL = info
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Render will build and deploy (takes 5-10 minutes)
   - Watch the logs for progress

7. **Get Your URL**
   - Once deployed, your app will be at:
   - `https://order-execution-engine.onrender.com`
   - (or similar, check the Render dashboard)

## Step 3: Update README with Deployment URL

Once you have your deployment URL, run:

```bash
# Update README with your deployment URL
./scripts/update-deployment-url.sh https://order-execution-engine.onrender.com

# Or manually edit README.md and replace:
# - "Deployed URL**: [Deploy using instructions..."
# with:
# - "Deployed URL**: https://order-execution-engine.onrender.com"

# Then commit and push
git add README.md
git commit -m "docs: add deployment URL to README"
git push origin main
```

## Step 4: Verify Deployment

Test your deployed application:

```bash
# Health check
curl https://your-deployment-url.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Troubleshooting

### GitHub Push Issues
- **SSH not working?** Use HTTPS with Personal Access Token
- **Permission denied?** Check your GitHub account has access to the repo

### Render Deployment Issues
- **Build fails?** Check build logs in Render dashboard
- **Database connection fails?** Verify DATABASE_URL is correct (use Internal URL)
- **Redis connection fails?** Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- **App crashes?** Check logs in Render dashboard → Logs tab

### Need Help?
- Check Render logs: Dashboard → Your Service → Logs
- Check application logs: They're stored in the `logs/` directory (if accessible)

## ✅ Checklist

- [ ] Pushed code to GitHub
- [ ] Created PostgreSQL database on Render
- [ ] Created Redis instance on Render
- [ ] Deployed web service on Render
- [ ] Added all environment variables
- [ ] Deployment successful (green status)
- [ ] Got deployment URL
- [ ] Updated README with URL
- [ ] Committed and pushed README update
- [ ] Tested health endpoint
- [ ] Tested API endpoint

---

**Estimated Time**: 15-20 minutes total
**Difficulty**: Easy (just follow the steps!)

