#!/usr/bin/env bash
# CloudBlocks - Development setup script
set -euo pipefail

echo "🧱 Setting up CloudBlocks development environment..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
pnpm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd apps/api && pip install -e ".[dev]" && cd ../..

# Start infrastructure
echo "🐳 Starting infrastructure services..."
docker compose up -d

echo "✅ Setup complete! Run 'make dev' to start development servers."
