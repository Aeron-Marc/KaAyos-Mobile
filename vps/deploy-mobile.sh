#!/bin/bash
# ==============================================================================
# KaAyos Mobile Standalone VPS Deployment Script
# OS: Ubuntu 22.04 / 24.04 LTS
#
# Usage (run as root on your VPS):
#   bash /var/www/KaAyos-Mobile/vps/deploy-mobile.sh
# ==============================================================================

set -e

DB_NAME="kaayos_db"
DB_USER="kaayos"
DB_PASS="KaAyos2026DB!"
APP_DIR="/var/www/KaAyos-Mobile"

echo "========================================================"
echo "  Deploying KaAyos Mobile API & Database on VPS"
echo "========================================================"

echo "=== [1/6] Updating System Packages ==="
apt update && apt upgrade -y
apt install -y git curl nginx mysql-server certbot python3-certbot-nginx

echo "=== [2/6] Installing Node.js 20 & PM2 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

echo "=== [3/6] Setting Up MySQL Database ==="
systemctl enable --now mysql
mysql -u root -e "
  CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
  ALTER USER '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
  GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
  FLUSH PRIVILEGES;
"

echo "=== [4/6] Setting Up KaAyos-Mobile Project ==="
mkdir -p /var/www

if [ ! -d "${APP_DIR}" ]; then
  git clone https://github.com/Aeron-Marc/KaAyos-Mobile.git "${APP_DIR}"
else
  cd "${APP_DIR}" && git pull origin main
fi

cd "${APP_DIR}"

# Install dependencies
npm ci

# Configure .env
if [ ! -f .env ]; then
  cp .env.example .env
fi

sed -i "s/DB_DATABASE=.*/DB_DATABASE=${DB_NAME}/" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USER}/" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASS}/" .env

# Import database schema & seed data if SQL dump exists
if [ -f "${APP_DIR}/kaayos_db.sql" ]; then
  echo "Importing database dump..."
  mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${APP_DIR}/kaayos_db.sql"
fi

# Create upload directories
mkdir -p uploads/{profiles,documents,portfolios,bookings,chat}
chmod -R 775 uploads

echo "=== [5/6] Starting Mobile API with PM2 ==="
pm2 delete kaayos-api 2>/dev/null || true
pm2 start npm --name "kaayos-api" -- run server
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "=== [6/6] Configuring Nginx Reverse Proxy ==="
cp "${APP_DIR}/vps/nginx-mobile.conf" /etc/nginx/sites-available/kaayos-mobile
ln -sf /etc/nginx/sites-available/kaayos-mobile /etc/nginx/sites-enabled/kaayos-mobile
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

IP_ADDR=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo "========================================================"
echo "  KaAyos Mobile API Deployed Successfully!"
echo "  VPS Public IP : ${IP_ADDR}"
echo "  API Endpoint  : http://${IP_ADDR}/api/test"
echo "  Health Check  : http://${IP_ADDR}:3000/api/test"
echo ""
echo "  Next step for your mobile app:"
echo "  In KaAyos-Mobile/lib/api.ts, set:"
echo "  export const SERVER_URL = 'http://${IP_ADDR}';"
echo "========================================================"

