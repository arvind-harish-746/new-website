#!/usr/bin/env bash
# ==============================================================================
# Cybotz: Automated Oracle Cloud (OCI) Server Provisioning Script
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS
# ==============================================================================

set -e

echo "=================================================================="
echo "🚀 Initializing Cybotz Production Setup on Oracle Cloud VM"
echo "=================================================================="

# 1. Update OS packages
echo "📦 [1/7] Updating package index..."
sudo apt update && sudo apt upgrade -y

# 2. Configure Host Firewall (UFW & OCI iptables)
echo "🛡️  [2/7] Configuring firewall rules (Ports 22, 80, 443)..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# In Oracle Cloud Ubuntu images, default iptables rules can drop incoming HTTP/HTTPS.
# Explicitly permit traffic on ports 80 and 443 in iptables:
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
if command -v netfilter-persistent &> /dev/null; then
  sudo netfilter-persistent save || true
fi

# 3. Install Node.js 20 LTS & Core System Tools
echo "⚙️  [3/7] Installing Node.js 20, Docker, Nginx & Certbot..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx docker.io docker-compose-v2 || sudo apt install -y docker-compose

# 4. Enable Docker for the current user
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

# 5. Install PNPM & PM2 globally
echo "📥 [4/7] Installing global CLI tools (pnpm, pm2)..."
sudo npm install -g pnpm pm2

# 6. Configure Nginx Virtual Host for cybotz.tech
echo "🌐 [5/7] Creating Nginx reverse proxy configuration..."
sudo tee /etc/nginx/sites-available/cybotz.tech > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name cybotz.tech www.cybotz.tech;

    client_max_body_size 25M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/cybotz.tech /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "=================================================================="
echo "✅ Base Server Environment Setup Complete!"
echo "=================================================================="
echo ""
echo "Next Steps:"
echo "1. Place application in /var/www/cybotz (or /var/www/cybotz/Cybotz-landing)"
echo "2. Create production .env file with your secrets"
echo "3. Run: cd /var/www/cybotz/Cybotz-landing && pnpm install"
echo "4. Start DBs: docker compose up -d || docker-compose up -d"
echo "5. Build app: pnpm run build"
echo "6. Seed Master user: npx tsx server/seedUsers.ts (User: Superman / Ww!32NjjF@1509)"
echo "7. Authenticate WhatsApp: npx tsx server/run-whatsapp.ts"
echo "8. Start PM2: pm2 start ecosystem.config.cjs && pm2 save"
echo "9. Issue SSL: sudo certbot --nginx -d cybotz.tech -d www.cybotz.tech"
echo "=================================================================="
