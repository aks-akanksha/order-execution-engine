#!/bin/bash

# Interactive script to authenticate GitHub and create repository

REPO_NAME="order-execution-engine"
DESCRIPTION="Order execution engine with DEX routing and WebSocket status updates"

echo "🔐 GitHub Authentication & Repository Creation"
echo "=============================================="
echo ""

# Check if token already exists
if [ -n "$GITHUB_TOKEN" ]; then
    echo "✅ Found GITHUB_TOKEN in environment"
    USE_EXISTING="y"
else
    echo "No GitHub token found. Let's create one!"
    echo ""
    echo "📝 Steps to get a GitHub Personal Access Token:"
    echo "1. Open: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Name it: 'Order Engine Repo'"
    echo "4. Select scope: 'repo' (check the box)"
    echo "5. Click 'Generate token'"
    echo "6. Copy the token (you won't see it again!)"
    echo ""
    read -p "Paste your GitHub token here: " GITHUB_TOKEN
    echo ""
fi

# Verify token works
echo "🔍 Verifying token..."
USER_INFO=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user)

if echo "$USER_INFO" | grep -q '"login"'; then
    GITHUB_USERNAME=$(echo "$USER_INFO" | grep -o '"login": "[^"]*' | cut -d'"' -f4)
    echo "✅ Authenticated as: $GITHUB_USERNAME"
    echo ""
else
    echo "❌ Authentication failed. Please check your token."
    exit 1
fi

# Check if repo already exists
echo "🔍 Checking if repository exists..."
EXISTING_REPO=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$GITHUB_USERNAME/$REPO_NAME")

if echo "$EXISTING_REPO" | grep -q '"name"'; then
    echo "⚠️  Repository $REPO_NAME already exists!"
    read -p "Do you want to use the existing repository? (y/n): " USE_EXISTING
    if [ "$USE_EXISTING" != "y" ]; then
        echo "Exiting. Please delete the existing repo or choose a different name."
        exit 1
    fi
    CLONE_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
else
    # Create repository
    echo "📦 Creating repository: $GITHUB_USERNAME/$REPO_NAME"
    echo ""
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      https://api.github.com/user/repos \
      -d "{
        \"name\": \"$REPO_NAME\",
        \"description\": \"$DESCRIPTION\",
        \"private\": false,
        \"auto_init\": false
      }")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" -eq 201 ]; then
        echo "✅ Repository created successfully!"
        CLONE_URL=$(echo "$BODY" | grep -o '"clone_url": "[^"]*' | cut -d'"' -f4)
    else
        echo "❌ Failed to create repository"
        echo "HTTP Code: $HTTP_CODE"
        echo "Response: $BODY"
        exit 1
    fi
fi

echo ""
echo "🔗 Repository URL: $CLONE_URL"
echo ""

# Setup git remote
echo "📝 Setting up git remote..."
git remote remove origin 2>/dev/null
git remote add origin "$CLONE_URL"

# Rename branch to main if needed
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Renaming branch to main..."
    git branch -M main
fi

# Save token for future use (optional)
read -p "Save token to .env file for future use? (y/n): " SAVE_TOKEN
if [ "$SAVE_TOKEN" = "y" ]; then
    if [ -f .env ]; then
        if ! grep -q "GITHUB_TOKEN" .env; then
            echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> .env
            echo "✅ Token saved to .env (make sure .env is in .gitignore!)"
        else
            echo "⚠️  GITHUB_TOKEN already exists in .env"
        fi
    else
        echo "GITHUB_TOKEN=$GITHUB_TOKEN" > .env
        echo "✅ Token saved to .env"
    fi
fi

echo ""
echo "📤 Pushing code to GitHub..."
echo ""

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Successfully pushed to GitHub!"
    echo ""
    echo "📍 Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo "🔗 Clone URL: $CLONE_URL"
    echo ""
    echo "Next steps:"
    echo "1. Update README.md with your repository URL"
    echo "2. Add deployment URL when ready"
    echo "3. Create and link YouTube demo video"
else
    echo ""
    echo "❌ Push failed. Trying with token authentication..."
    # Try pushing with token in URL
    git remote set-url origin "https://$GITHUB_TOKEN@github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully pushed!"
        echo "📍 Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    else
        echo ""
        echo "❌ Push still failed. Please check:"
        echo "1. Your token has 'repo' scope"
        echo "2. You have write access to the repository"
        echo "3. Try manually: git push -u origin main"
    fi
fi

