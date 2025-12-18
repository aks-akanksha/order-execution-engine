#!/bin/bash

# Simple script to push to GitHub after manual repo creation
# Usage: ./scripts/simple-push.sh YOUR_GITHUB_USERNAME

if [ -z "$1" ]; then
    echo "Usage: ./scripts/simple-push.sh YOUR_GITHUB_USERNAME"
    echo ""
    echo "First, create a repository at: https://github.com/new"
    echo "Name it: order-execution-engine"
    echo "Then run this script with your username"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="order-execution-engine"

echo "🔗 Setting up GitHub remote..."
echo ""

# Remove existing remote if any
git remote remove origin 2>/dev/null

# Add new remote
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Rename branch to main if needed
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Renaming branch to main..."
    git branch -M main
fi

echo ""
echo "📤 Pushing to GitHub..."
echo "You may be prompted for your GitHub credentials"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "View your repo at: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
else
    echo ""
    echo "❌ Push failed. Common issues:"
    echo "1. Repository doesn't exist - create it at https://github.com/new"
    echo "2. Authentication failed - use a Personal Access Token"
    echo "3. Wrong username - check your GitHub username"
fi

