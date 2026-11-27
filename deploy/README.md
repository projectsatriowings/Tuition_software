# Deployment Guide: Hostinger VPS for `academic.atriowings.in`

This document details how to deploy the Tuition Management System on a **Hostinger VPS** (Ubuntu 22.04 or 24.04 LTS).

---

## Architecture Overview

```
                      Internet
                         │
                         ▼
        ┌──────────────────────────────────┐
        │       academic.atriowings.in     │
        │          Hostinger VPS           │
        │      (Nginx Reverse Proxy)       │
        │               :443               │
        └───────┬──────────────────┬───────┘
                │                  │
        Static / Assets            │ /api/*
                │                  ▼
        ┌───────▼───────────┐    ┌───────────────────────────┐
        │  Vite React Web   │    │  Express Node.js Server   │
        │  apps/web/dist    │    │  (PM2 Process: Port 5000) │
        └───────────────────┘    └─────────────┬─────────────┘
                                               │
                                               ▼
                                  ┌───────────────────────────┐
                                  │   Neon PostgreSQL Cloud   │
                                  └───────────────────────────┘
```

---

## Prerequisites

1. **Hostinger VPS** with Ubuntu 22.04 or 24.04 LTS.
2. **DNS Record configured**:
   - In Hostinger or your domain DNS manager for `atriowings.in`:
   - Create an **A record**:
     - **Host**: `academic`
     - **Points to**: `<YOUR_HOSTINGER_VPS_IP>`
     - **TTL**: 300 seconds (or default)

---

## Step 1: Connect to VPS and Run Setup

SSH into your Hostinger VPS:
```bash
ssh root@<YOUR_HOSTINGER_VPS_IP>
```

Run the automated setup script or execute the commands below:
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git nginx certbot python3-certbot-nginx ufw

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Configure Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## Step 2: Clone or Transfer the Codebase

Create directory `/var/www/tuition_software`:
```bash
sudo mkdir -p /var/www/tuition_software
sudo chown -R $USER:$USER /var/www/tuition_software
```

Transfer files via Git, GitHub, or `rsync`/`scp`:
```bash
# Option A: Git clone into /var/www/tuition_software
git clone <YOUR_GIT_REPO_URL> /var/www/tuition_software

# Option B: If deploying from local machine using rsync:
# rsync -avz --exclude 'node_modules' --exclude '.git' ./ root@<VPS_IP>:/var/www/tuition_software/
```

---

## Step 3: Configure Environment Variables

```bash
cd /var/www/tuition_software
cp deploy/.env.production.template server/.env
# Also copy to root .env
cp deploy/.env.production.template .env
```

Review or edit passwords and database strings:
```bash
nano server/.env
```

Ensure `CORS_ORIGIN` is set to `https://academic.atriowings.in`.

---

## Step 4: Build and Start Server with PM2

Run the deployment update script:
```bash
cd /var/www/tuition_software
chmod +x deploy/*.sh
./deploy/update.sh
```

Or manually:
```bash
npm install
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Verify the backend is healthy:
```bash
curl http://127.0.0.1:5000/api/health
```
*(Should return status: healthy and connected: true).*

---

## Step 5: Configure Nginx

Copy the Nginx configuration to `sites-available`:
```bash
sudo cp deploy/academic.atriowings.in.conf /etc/nginx/sites-available/academic.atriowings.in.conf
sudo ln -sf /etc/nginx/sites-available/academic.atriowings.in.conf /etc/nginx/sites-enabled/

# Remove default site if present
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config syntax
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Step 6: Install SSL Certificate with Let's Encrypt

Ensure the DNS A record for `academic.atriowings.in` has propagated to your VPS IP:
```bash
ping academic.atriowings.in
```

Run Certbot to automatically configure SSL and HTTPS redirection:
```bash
sudo certbot --nginx -d academic.atriowings.in
```

When prompted:
1. Enter your email for urgent renewal notices.
2. Agree to the Terms of Service.
3. Certbot will update `/etc/nginx/sites-available/academic.atriowings.in.conf` with SSL certificates and redirect all HTTP traffic to HTTPS.

---

## Maintenance & Subsequent Updates

Whenever you make changes to the code:
```bash
cd /var/www/tuition_software
git pull origin main
./deploy/update.sh
```

### Useful Commands

- **Check server status**: `pm2 status`
- **View server live logs**: `pm2 logs tuition-server`
- **Restart backend server**: `pm2 restart tuition-server`
- **View Nginx logs**: `sudo tail -f /var/log/nginx/error.log`
- **Renew SSL dry-run**: `sudo certbot renew --dry-run`
