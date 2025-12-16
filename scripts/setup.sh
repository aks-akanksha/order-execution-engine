#!/bin/bash

# Setup script for Order Execution Engine

echo "🚀 Setting up Order Execution Engine..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. You can use Docker Compose instead."
fi

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis is not installed. You can use Docker Compose instead."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy .env.example to .env if .env doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please update it with your configuration."
else
    echo "✅ .env file already exists."
fi

# Check if Docker Compose is available
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Docker Compose is available. You can start PostgreSQL and Redis with:"
    echo "   docker-compose up -d"
    echo ""
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your database and Redis configuration"
echo "2. Start PostgreSQL and Redis (or use: docker-compose up -d)"
echo "3. Run: npm run dev"
echo ""

