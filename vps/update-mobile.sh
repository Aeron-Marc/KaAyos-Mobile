#!/bin/bash
# ==============================================================================
# KaAyos Mobile Quick Update Script
# Run as root: bash /var/www/KaAyos-Mobile/vps/update-mobile.sh
# ==============================================================================

set -e
APP_DIR="/var/www/KaAyos-Mobile"

echo "=== Pulling latest changes from Git ==="
cd "${APP_DIR}"
git pull origin main

echo "=== Installing dependencies ==="
npm ci

echo "=== Restarting Mobile API Server ==="
pm2 restart kaayos-api

echo "=== Checking Nginx status ==="
nginx -t
systemctl reload nginx

echo "========================================================"
echo "  KaAyos Mobile API updated successfully!"
echo "========================================================"

