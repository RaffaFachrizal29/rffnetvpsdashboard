#!/bin/bash
# Rffnet VPS Dashboard Installation Script
# Run this as root on your Ubuntu/Debian VPS

echo "Starting installation..."

# Update system
apt-get update && apt-get upgrade -y

# Install Node.js (v22)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git

# Clone repository (assuming you have pushed this code to a repo)
git clone https://github.com/RaffaFachrizal29/rffnetvpsdashboard.git
cd rffnetvpsdashboard

# For now, we will create a directory
mkdir -p /opt/rffnet-dashboard
cd /opt/rffnet-dashboard

# Install dependencies
npm install

# Build the application
npm run build

# Install PM2 to keep the app running
npm install -g pm2

# Start the application
NODE_ENV=production pm2 start npm --name "rffnet" -- run start

# Save PM2 process list and configure to start on boot
pm2 save
pm2 startup

echo "Installation complete! Access your dashboard at http://YOUR_VPS_IP:3000"
