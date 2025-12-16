#!/bin/bash

# Git commit helper script
# This script helps create human-like commit messages step by step

echo "📝 Git Commit Helper"
echo "==================="
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Not a git repository. Initializing..."
    git init
    echo "✅ Git repository initialized"
    echo ""
fi

# Show current status
echo "Current git status:"
git status --short
echo ""

# Ask what to commit
echo "What would you like to commit?"
echo "1. All changes"
echo "2. Specific files"
echo "3. Skip (manual commit)"
read -p "Choice (1-3): " choice

case $choice in
    1)
        git add .
        ;;
    2)
        echo "Enter file paths (space-separated):"
        read files
        git add $files
        ;;
    3)
        echo "Skipping staging. You can commit manually."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Suggest commit message based on changes
echo ""
echo "Suggested commit messages based on changes:"
echo "-------------------------------------------"

if git diff --cached --name-only | grep -q "package.json\|tsconfig.json"; then
    echo "📦 'chore: update project configuration and dependencies'"
fi

if git diff --cached --name-only | grep -q "src/database"; then
    echo "🗄️  'feat: add database schema and connection setup'"
fi

if git diff --cached --name-only | grep -q "src/services/dex"; then
    echo "🔄 'feat: implement DEX router with Raydium and Meteora providers'"
fi

if git diff --cached --name-only | grep -q "src/services/queue"; then
    echo "📋 'feat: add order queue system with BullMQ'"
fi

if git diff --cached --name-only | grep -q "src/routes"; then
    echo "🌐 'feat: implement order execution API endpoints'"
fi

if git diff --cached --name-only | grep -q "src/__tests__\|src/services/__tests__"; then
    echo "✅ 'test: add unit and integration tests'"
fi

if git diff --cached --name-only | grep -q "README.md"; then
    echo "📚 'docs: add comprehensive README with setup instructions'"
fi

if git diff --cached --name-only | grep -q "postman_collection.json"; then
    echo "📮 'docs: add Postman collection for API testing'"
fi

echo ""
read -p "Enter commit message (or press Enter to use suggested): " commit_msg

if [ -z "$commit_msg" ]; then
    # Use first suggested message or default
    commit_msg="chore: update project files"
fi

# Commit
git commit -m "$commit_msg"

echo ""
echo "✅ Committed with message: $commit_msg"
echo ""
echo "Next steps:"
echo "  - Review: git log --oneline -5"
echo "  - Push: git push origin main"
echo ""

