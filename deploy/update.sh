#!/usr/bin/env bash
# ==============================================================================
# Update / Deploy script for Tuition Management System
# ==============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "=== [1/4] Installing dependencies ==="
npm install

echo "=== [2/4] Generating Prisma Client and compiling project ==="
npm run build

echo "=== [3/4] Ensuring upload and log directories ==="
mkdir -p server/uploads
mkdir -p logs

echo "=== [4/4] Starting / Reloading PM2 process ==="
if pm2 describe tuition-server > /dev/null 2>&1; then
    echo "Reloading existing PM2 process..."
    pm2 reload ecosystem.config.cjs --env production
else
    echo "Starting PM2 process for the first time..."
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    pm2 startup | tail -n 1 | sudo bash || true
fi

echo "=== Deployment finished successfully! ==="
pm2 status
