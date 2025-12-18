#!/bin/bash
# Script to set develop as default branch on GitHub
# Requires GITHUB_TOKEN environment variable

REPO="aks-akanksha/order-execution-engine"
BRANCH="develop"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not set"
    echo "Set it with: export GITHUB_TOKEN=your_token"
    exit 1
fi

echo "🔄 Setting develop as default branch..."

curl -X PATCH \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO" \
  -d "{\"default_branch\":\"$BRANCH\"}"

echo ""
echo "✅ Done! Check GitHub to confirm."
