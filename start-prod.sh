#!/usr/bin/env bash
# ==============================================================================
# CYBOTZ STEM PLATFORM – macOS Production Startup Script
# ==============================================================================
# Starts:
#  - Web App, Calendar Booking & Admin Portal (Port 5000)
# Database: MariaDB / MySQL (with automatic local in-memory fallback)
# Calendar: Google Calendar (Google Apps Script zero-cost engine)
# ==============================================================================

set -e

# Change directory to the project folder
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/Cybotz-landing" ]; then
  cd "$SCRIPT_DIR/Cybotz-landing"
else
  cd "$SCRIPT_DIR"
fi

echo "========================================================"
echo "🚀 Starting Cybotz Platform in Production Mode (macOS)"
echo "========================================================"

# Detect or use local pnpm
if command -v pnpm &> /dev/null; then
  PNPM_CMD="pnpm"
else
  PNPM_CMD="npx -y pnpm@10"
fi

# 1. Check or install dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 [1/3] Installing dependencies..."
  $PNPM_CMD install
else
  echo "✅ [1/3] Dependencies found in node_modules."
fi

# 2. Build production assets (Vite frontend -> dist/public, esbuild -> dist/index.js)
echo "🔨 [2/3] Building production bundles..."
$PNPM_CMD run build

# Free port 5000 if lingering from previous run
echo "🧹 Checking port 5000..."
PID=$(lsof -ti tcp:5000 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "  Stopping lingering process on port 5000 (PID $PID)..."
  kill -9 $PID 2>/dev/null || true
fi

# 3. Launch server
echo "⚡ [3/3] Launching production server..."
echo "--------------------------------------------------------"
echo "🌐 Web App & Admin Portal: http://localhost:5000"
echo "📅 Calendar Engine:        Google Calendar (Google Apps Script)"
echo "🗄️ Database:               MariaDB / MySQL"
echo "--------------------------------------------------------"
echo "Press Ctrl+C to stop the server."
echo ""

node dist/index.js
