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

# 1. Database status check
echo "🗄️ [1/3] Using MariaDB / MySQL (or built-in memory fallback)..."

# Helper to run pnpm
if command -v pnpm &> /dev/null; then
  PNPM_CMD="pnpm"
else
  PNPM_CMD="npx -y pnpm@10"
fi

# 2. Verify dependencies
if [ ! -d "node_modules" ]; then
  echo "📥 [2/3] Installing dependencies via pnpm..."
  $PNPM_CMD install
fi

# Find tsx and concurrently binaries
TSX_BIN="./node_modules/.bin/tsx"
CONCURRENTLY_BIN="./node_modules/.bin/concurrently"

# Free ports 5000 and 3000 if lingering from previous run
for PORT in 5000 3000; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
  fi
done

# 3. Launch API Server & Frontend
echo "✨ [3/3] Launching API Server & Frontend..."
echo "👉 Frontend URL: http://localhost:3000"
echo "👉 Backend API:  http://localhost:5000"
echo "--------------------------------------------------------"

if [ -f "$CONCURRENTLY_BIN" ]; then
  "$CONCURRENTLY_BIN" --kill-others --names "BACKEND,FRONTEND" \
    --prefix-colors "blue,cyan" \
    "$TSX_BIN server/index.ts" \
    "$PNPM_CMD run dev:client"
else
  $PNPM_CMD exec concurrently --kill-others --names "BACKEND,FRONTEND" \
    --prefix-colors "blue,cyan" \
    "$PNPM_CMD exec tsx server/index.ts" \
    "$PNPM_CMD run dev:client"
fi
