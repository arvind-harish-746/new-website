#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/Cybotz-landing" ]; then
  cd "$SCRIPT_DIR/Cybotz-landing"
else
  cd "$SCRIPT_DIR"
fi

echo "========================================================"
echo "🚀 Building & Starting Cybotz in Production Mode"
echo "========================================================"

# 1. Start Docker Containers
echo "📦 [1/4] Starting MongoDB and Redis containers..."
if docker compose version &> /dev/null; then
  docker compose up -d || true
elif command -v docker-compose &> /dev/null; then
  docker-compose up -d || true
else
  echo "⚠️ Warning: Docker Compose not found. Ensure MongoDB (27017) and Redis (6379) are active."
fi

# Helper to run pnpm
if command -v pnpm &> /dev/null; then
  PNPM_CMD="pnpm"
else
  PNPM_CMD="npx -y pnpm"
fi

# 2. Build Production Bundle
echo "🔨 [2/4] Building production frontend and backend bundles..."
$PNPM_CMD run build

# Find tsx and concurrently binaries
TSX_BIN="./node_modules/.bin/tsx"
CONCURRENTLY_BIN="./node_modules/.bin/concurrently"

# 3. Seed master user
echo "🌱 [3/4] Ensuring database master user is seeded..."
if [ -f "$TSX_BIN" ]; then
  "$TSX_BIN" server/seedUsers.ts || true
else
  $PNPM_CMD exec tsx server/seedUsers.ts || true
fi

# 4. Start with PM2 or Concurrently
echo "⚡ [4/4] Starting production services..."
if command -v pm2 &> /dev/null; then
  pm2 start ecosystem.config.cjs
  pm2 status
  echo "✅ Application running under PM2 supervision on port 5000!"
elif [ -f "$CONCURRENTLY_BIN" ]; then
  echo "👉 Starting concurrently (Web on :5000, WhatsApp on :8080)..."
  "$CONCURRENTLY_BIN" --kill-others --names "WHATSAPP,WORKER,SERVER" \
    --prefix-colors "green,magenta,blue" \
    "$TSX_BIN server/run-whatsapp.ts" \
    "$TSX_BIN server/worker.ts" \
    "node dist/index.js"
else
  $PNPM_CMD exec concurrently --kill-others --names "WHATSAPP,WORKER,SERVER" \
    --prefix-colors "green,magenta,blue" \
    "$PNPM_CMD exec tsx server/run-whatsapp.ts" \
    "$PNPM_CMD exec tsx server/worker.ts" \
    "node dist/index.js"
fi
