#!/usr/bin/env bash
set -e

# Change directory to the script's directory / Cybotz-landing
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/Cybotz-landing" ]; then
  cd "$SCRIPT_DIR/Cybotz-landing"
else
  cd "$SCRIPT_DIR"
fi

echo "========================================================"
echo "🚀 Starting Cybotz STEM Development Environment"
echo "========================================================"

# 1. Start MongoDB and Redis containers
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

# 2. Verify dependencies
if [ ! -d "node_modules" ]; then
  echo "📥 [2/4] Installing dependencies via pnpm..."
  $PNPM_CMD install
fi

# Find tsx and concurrently binaries
TSX_BIN="./node_modules/.bin/tsx"
CONCURRENTLY_BIN="./node_modules/.bin/concurrently"

# 3. Seed master user into database
echo "🌱 [3/4] Ensuring database master seed user exists..."
if [ -f "$TSX_BIN" ]; then
  "$TSX_BIN" server/seedUsers.ts || true
else
  $PNPM_CMD exec tsx server/seedUsers.ts || true
fi

# 4. Launch all services concurrently (WhatsApp, Worker, Backend, and Frontend with Image Watcher)
echo "✨ [4/4] Launching WhatsApp Engine, BullMQ Worker, API Server & Frontend..."
echo "👉 Frontend URL: http://localhost:3000"
echo "👉 Backend API:  http://localhost:5000"
echo "👉 WhatsApp API: http://localhost:8080"
echo "--------------------------------------------------------"

if [ -f "$CONCURRENTLY_BIN" ]; then
  "$CONCURRENTLY_BIN" --kill-others --names "WHATSAPP,WORKER,BACKEND,FRONTEND" \
    --prefix-colors "green,magenta,blue,cyan" \
    "$TSX_BIN server/run-whatsapp.ts" \
    "$TSX_BIN server/worker.ts" \
    "$TSX_BIN server/index.ts" \
    "$PNPM_CMD run dev:client"
else
  $PNPM_CMD exec concurrently --kill-others --names "WHATSAPP,WORKER,BACKEND,FRONTEND" \
    --prefix-colors "green,magenta,blue,cyan" \
    "$PNPM_CMD exec tsx server/run-whatsapp.ts" \
    "$PNPM_CMD exec tsx server/worker.ts" \
    "$PNPM_CMD exec tsx server/index.ts" \
    "$PNPM_CMD run dev:client"
fi
