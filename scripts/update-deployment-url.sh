#!/bin/bash

# Script to update README with deployment URL

if [ -z "$1" ]; then
    echo "Usage: ./scripts/update-deployment-url.sh <deployment-url>"
    echo "Example: ./scripts/update-deployment-url.sh https://order-execution-engine.onrender.com"
    exit 1
fi

DEPLOYMENT_URL="$1"

# Update README.md
sed -i "s|Deployed URL.*|Deployed URL**: $DEPLOYMENT_URL|g" README.md
sed -i "s|Deploy using instructions.*|$DEPLOYMENT_URL|g" README.md

echo "✅ Updated README.md with deployment URL: $DEPLOYMENT_URL"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff README.md"
echo "2. Commit: git add README.md && git commit -m 'docs: add deployment URL'"
echo "3. Push: git push origin main"

