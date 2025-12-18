# Quick Start Demo Guide

## 🎬 For YouTube Video Recording

### **Step 1: Open Demo Page**
1. Open Chrome browser
2. Navigate to: `examples/demo.html`
   - Right-click file → Open with → Chrome
   - Or: File → Open File → select `demo.html`
   - Or: `http://localhost:8000/demo.html` (if server running)

### **Step 2: Setup for Recording**
1. Open Developer Tools (Press F12)
2. Go to Console tab
3. Start screen recording (OBS Studio, QuickTime, etc.)
4. Make sure demo page is visible

### **Step 3: Record the Demo (1-2 minutes)**

**What to Say:**
> "This is the Order Execution Engine - a backend API that routes token swaps to the best DEX on Solana. I chose market orders because they execute immediately, perfect for showcasing DEX routing."

**What to Do:**
1. **Create First Order** (10 seconds)
   - Select: SOL → USDC, Amount: 1.0
   - Click "🚀 Create Order"
   - Show WebSocket connection message

2. **Create Second Order** (5 seconds)
   - Quickly create: SOL → USDT, Amount: 0.5
   - Click "🚀 Create Order"

3. **Create Third Order** (5 seconds)
   - Create: USDC → SOL, Amount: 2.0
   - Click "🚀 Create Order"

4. **Show Real-time Updates** (20 seconds)
   - Point to status updates appearing
   - Show: pending → routing → building → submitted → confirmed
   - Show different statuses for different orders

5. **Show Console** (15 seconds)
   - Switch to Console tab (F12)
   - Show WebSocket messages
   - Show DEX routing decisions
   - Show API responses

6. **Show Queue Stats** (10 seconds)
   - Click "View Queue Stats" button
   - Show concurrent processing

7. **Show Final Results** (10 seconds)
   - Click "View All Orders"
   - Show confirmed orders
   - Show transaction hashes
   - Show execution prices

**Total Time: ~1-2 minutes**

---

## 🌐 URLs to Open in Chrome

### **Primary (Main Demo):**
- **`examples/demo.html`** - Interactive demo page
  - Open locally: File → Open File
  - Or: `http://localhost:8000/demo.html`

### **Optional (For Additional Context):**
- **Health Check:** `https://order-execution-engine-mqmu.onrender.com/health`
- **All Orders:** `https://order-execution-engine-mqmu.onrender.com/api/orders`
- **Queue Stats:** `https://order-execution-engine-mqmu.onrender.com/api/queue/stats`

---

## 📋 What the Demo Shows

### ✅ **Order Creation**
- Fill form with token pair and amount
- Click "Create Order"
- See order ID returned

### ✅ **Real-time WebSocket Updates**
- Status updates appear automatically
- Shows: pending → routing → building → submitted → confirmed
- Shows DEX selection (Raydium or Meteora)
- Shows transaction hash when confirmed

### ✅ **Concurrent Processing**
- Create multiple orders quickly
- See them all processing simultaneously
- Different orders at different stages

### ✅ **DEX Routing**
- Console shows DEX comparison
- Shows which DEX was selected
- Shows why (better price)

### ✅ **Queue Statistics**
- Click "View Queue Stats"
- See: waiting, active, completed, failed counts

### ✅ **Order History**
- Click "View All Orders"
- See all orders with their statuses
- See transaction hashes and execution prices

---

## 🎥 Recording Tips

1. **Keep it Fast:** Create orders quickly to show concurrency
2. **Show Console:** Press F12 to show WebSocket messages
3. **Highlight Updates:** Point to status updates as they appear
4. **Explain Briefly:** Keep explanations short (1-2 minutes total)
5. **Show Results:** Always show final confirmed orders

---

## ✅ Checklist Before Recording

- [ ] Demo page opens correctly
- [ ] Can create orders successfully
- [ ] WebSocket updates appear
- [ ] Console shows messages (F12)
- [ ] Queue stats work
- [ ] All orders complete
- [ ] Screen recording software ready
- [ ] Audio is clear

---

**You're ready to record! 🎬**

