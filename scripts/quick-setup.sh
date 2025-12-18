#!/bin/bash

# Quick setup: Get token, create repo, and push

echo "🚀 Quick GitHub Repository Setup"
echo "================================"
echo ""
echo "Step 1: Get your GitHub Personal Access Token"
echo "---------------------------------------------"
echo "1. The browser should be open at: https://github.com/settings/tokens"
echo "2. If not, open: https://github.com/settings/tokens"
echo "3. Click 'Generate new token (classic)'"
echo "4. Name: 'Order Engine'"
echo "5. Select scope: 'repo' ✓"
echo "6. Click 'Generate token'"
echo "7. Copy the token"
echo ""
read -p "Paste your GitHub token here: " TOKEN

if [ -z "$TOKEN" ]; then
    echo "❌ Token is required. Exiting."
    exit 1
fi

export GITHUB_TOKEN="$TOKEN"

echo ""
echo "Step 2: Creating repository..."
echo "-----------------------------"

# Get username
USERNAME=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -o '"login": "[^"]*' | cut -d'"' -f4)

if [ -z "$USERNAME" ]; then
    echo "❌ Failed to authenticate. Check your token."
    exit 1
fi

echo "✅ Authenticated as: $USERNAME"
echo ""

# Create repo
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{"name":"order-execution-engine","description":"Order execution engine with DEX routing and WebSocket status updates","private":false}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
    CLONE_URL=$(echo "$BODY" | grep -o '"clone_url": "[^"]*' | cut -d'"' -f4)
    echo "✅ Repository created: https://github.com/$USERNAME/order-execution-engine"
elif [ "$HTTP_CODE" -eq 422 ]; then
    echo "⚠️  Repository already exists, using existing one..."
    CLONE_URL="https://github.com/$USERNAME/order-execution-engine.git"
else
    echo "❌ Failed to create repository (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi

echo ""
echo "Step 3: Setting up git and pushing..."
echo "-------------------------------------"

# Setup git
git remote remove origin 2>/dev/null
git remote add origin "$CLONE_URL"
git branch -M main 2>/dev/null || true

# Push with token
git remote set-url origin "https://$GITHUB_TOKEN@github.com/$USERNAME/order-execution-engine.git"
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Repository created and code pushed!"
    echo ""
    echo "📍 View your repo: https://github.com/$USERNAME/order-execution-engine"
    echo ""
    # Reset remote URL to remove token
    git remote set-url origin "https://github.com/$USERNAME/order-execution-engine.git"
    echo "✅ Remote URL updated (token removed from URL)"
else
    echo ""
    echo "❌ Push failed. You may need to:"
    echo "1. Check your token has 'repo' scope"
    echo "2. Try: git push -u origin main"
fi

