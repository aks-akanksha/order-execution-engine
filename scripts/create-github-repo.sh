#!/bin/bash

# Script to create a GitHub repository and push the code
# Usage: ./scripts/create-github-repo.sh

REPO_NAME="order-execution-engine"
DESCRIPTION="Order execution engine with DEX routing and WebSocket status updates"

echo "🚀 Creating GitHub Repository"
echo "=============================="
echo ""

# Check if GitHub token is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN environment variable not set."
    echo ""
    echo "To create a repository, you need a GitHub Personal Access Token."
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Generate a new token with 'repo' scope"
    echo "3. Run: export GITHUB_TOKEN=your_token_here"
    echo "4. Then run this script again"
    echo ""
    echo "Alternatively, you can:"
    echo "1. Create the repo manually at: https://github.com/new"
    echo "2. Then run: git remote add origin https://github.com/YOUR_USERNAME/$REPO_NAME.git"
    echo "3. Then run: git push -u origin main"
    exit 1
fi

# Get GitHub username from token or ask
if [ -z "$GITHUB_USERNAME" ]; then
    echo "Enter your GitHub username:"
    read GITHUB_USERNAME
fi

echo "Creating repository: $GITHUB_USERNAME/$REPO_NAME"
echo ""

# Create repository using GitHub API
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
    echo ""
    
    # Extract clone URL from response
    CLONE_URL=$(echo "$BODY" | grep -o '"clone_url": "[^"]*' | cut -d'"' -f4)
    SSH_URL=$(echo "$BODY" | grep -o '"ssh_url": "[^"]*' | cut -d'"' -f4)
    
    echo "Repository URL: $CLONE_URL"
    echo ""
    
    # Add remote and push
    echo "Setting up git remote..."
    git remote remove origin 2>/dev/null
    git remote add origin "$CLONE_URL"
    
    # Rename branch to main if needed
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo "Renaming branch to main..."
        git branch -M main
    fi
    
    echo ""
    echo "Pushing code to GitHub..."
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Successfully pushed to GitHub!"
        echo "View your repo at: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    else
        echo ""
        echo "❌ Failed to push. You may need to authenticate."
        echo "Try: git push -u origin main"
    fi
else
    echo "❌ Failed to create repository"
    echo "HTTP Code: $HTTP_CODE"
    echo "Response: $BODY"
    echo ""
    echo "Common issues:"
    echo "- Token may be invalid or expired"
    echo "- Repository name may already exist"
    echo "- Token may not have 'repo' scope"
    exit 1
fi

