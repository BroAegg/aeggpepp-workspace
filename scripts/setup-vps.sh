#!/usr/bin/env bash
# ==============================================================================
# AEGGPEPP WORKSPACE — UBUNTU VPS HARDENING & AUTOMATION SETUP
# Target: Ubuntu 22.04 / 24.04 LTS (RAM 1 GB - 2 GB)
# Run as root: sudo bash scripts/setup-vps.sh
# ==============================================================================

set -euo pipefail

echo "=================================================="
echo "🚀 Starting VPS Setup & Hardening for AeggPepp Bot"
echo "=================================================="

# 1. SWAP MEMORY CONFIGURATION (2 GB for OOM protection)
if [ ! -f /swapfile ]; then
    echo "📦 Allocating 2 GB Swap file..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=20
    echo 'vm.swappiness=20' >> /etc/sysctl.conf
    echo "✅ 2 GB Swap configured successfully."
else
    echo "ℹ️ /swapfile already exists, skipping creation."
fi

# 2. SYSTEM PACKAGES & BUILD TOOLS
echo "🔄 Updating package lists..."
apt-get update -y
apt-get install -y \
    curl \
    git \
    ufw \
    fail2ban \
    build-essential \
    python3 \
    postgresql-client \
    htop \
    ca-certificates

# 3. NODE.JS 20 LTS INSTALLATION
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20 LTS (NodeSource)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "✅ Node.js $(node -v) and npm $(npm -v) installed."
else
    echo "ℹ️ Node.js $(node -v) is already installed."
fi

# 4. PM2 & LOG ROTATE
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    echo "✅ PM2 and pm2-logrotate installed and configured."
fi

# 5. UFW FIREWALL HARDENING
echo "🛡️ Configuring UFW Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# Uncomment if bot dashboard port is exposed directly:
# ufw allow 3001/tcp comment 'Bot Web Status'
echo "y" | ufw enable
ufw status verbose

# 6. FAIL2BAN HARDENING
echo "🔒 Starting & enabling Fail2ban..."
systemctl enable fail2ban
systemctl restart fail2ban

# 7. BACKUP DIRECTORY PREPARATION
mkdir -p /var/backups/supabase
chmod 700 /var/backups/supabase

echo "=================================================="
echo "🎉 VPS Setup & Hardening Completed Successfully!"
echo "=================================================="
echo "Next steps:"
echo "1. Clone / pull repository to /opt/aeggpepp or your home directory"
echo "2. Copy .env into services/whatsapp-bot/.env with chmod 600"
echo "3. Run: cd services/whatsapp-bot && npm install && npm run build"
echo "4. Start bot: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
echo "5. Setup daily backup cron: crontab -e (add backup-supabase.sh)"
echo "=================================================="
