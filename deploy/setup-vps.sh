#!/usr/bin/env bash
# ==============================================================================
# Setup script for Hostinger VPS (Ubuntu 22.04 / 24.04 LTS)
# Domain: academic.atriowings.in
# ==============================================================================
set -e

echo "=== [1/6] Updating system packages ==="
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git nginx certbot python3-certbot-nginx ufw

echo "=== [2/6] Installing Node.js LTS (v20.x) ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

echo "=== [3/6] Installing PM2 Process Manager ==="
sudo npm install -g pm2

echo "=== [4/6] Configuring UFW Firewall ==="
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "=== [5/6] Ensuring project permissions & directories ==="
APP_DIR="/var/www/tuition_software"
sudo mkdir -p $APP_DIR
sudo mkdir -p $APP_DIR/server/uploads
sudo mkdir -p $APP_DIR/logs
sudo chown -R $USER:$USER $APP_DIR

echo "=== [6/6] Base setup completed ==="
echo "Next steps:"
echo "1. Clone or copy project files into $APP_DIR"
echo "2. Copy deploy/.env.production.template to $APP_DIR/server/.env and fill secrets"
echo "3. Run ./deploy/update.sh from $APP_DIR"
echo "4. Copy deploy/academic.atriowings.in.conf to /etc/nginx/sites-available/"
echo "   sudo ln -sf /etc/nginx/sites-available/academic.atriowings.in.conf /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "5. Issue SSL certificate:"
echo "   sudo certbot --nginx -d academic.atriowings.in"
