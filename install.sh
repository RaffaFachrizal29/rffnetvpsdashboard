#!/bin/bash
# Rffnet VPS Dashboard Installation Script
# Run this as root on your Ubuntu/Debian VPS

echo "Starting installation..."
sleep 3

apt update && sudo apt upgrade -y;
apt install -y git curl build-essential;

curl -fsSL https://deb.nodesource.com/setup_22.x | bash - ;
apt install -y nodejs;

npm install -g pm2

# Clone repository (assuming you have pushed this code to a repo)
git clone https://github.com/RaffaFachrizal29/rffnetvpsdashboard.git;
cd rffnetvpsdashboard;

# Install dependencies
npm install;

# Build the application
npm run build;

# Start the application
NODE_ENV=production pm2 start npm --name "rffnet" -- run start;

# Save PM2 process list and configure to start on boot
pm2 save
pm2 startup

echo "Installation complete! Access your dashboard at http://YOUR_VPS_IP:3000"
