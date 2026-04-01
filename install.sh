#!/usr/bin/env bash

# ==============================================================================
# Rffnet VPS Dashboard Universal CLI Installer
# Supported: Debian/Ubuntu, Arch Linux, Fedora, Gentoo, FreeBSD
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}   Rffnet VPS Dashboard Automated Installer${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] This script must be run as root.${NC}"
    echo -e "Please run the command as follows:"
    echo -e "${YELLOW}curl -fsSL https://raw.githubusercontent.com/RaffaFachrizal29/rffnetvpsdashboard/refs/heads/main/install.sh | sudo bash${NC}"
    exit 1
fi

echo -e "${YELLOW}[INFO] Detecting operating system and installing dependencies...${NC}"

# 1. OS Detection and Dependency Installation
if command -v apt-get >/dev/null 2>&1; then
    OS_FAMILY="Debian/Ubuntu"
    echo -e "${YELLOW}[INFO] Detected $OS_FAMILY. Updating repositories...${NC}"
    apt-get update -y -qq
    
    echo -e "${YELLOW}[INFO] Installing Node.js repository...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null 2>&1
    
    echo -e "${YELLOW}[INFO] Installing required packages...${NC}"
    apt-get install -y git curl build-essential nodejs -qq

elif command -v pacman >/dev/null 2>&1; then
    OS_FAMILY="Arch Linux"
    echo -e "${YELLOW}[INFO] Detected $OS_FAMILY. Installing required packages...${NC}"
    pacman -Sy --noconfirm --needed git curl base-devel nodejs npm > /dev/null 2>&1

elif command -v dnf >/dev/null 2>&1; then
    OS_FAMILY="Fedora/RHEL"
    echo -e "${YELLOW}[INFO] Detected $OS_FAMILY. Installing required packages...${NC}"
    dnf install -y git curl make gcc gcc-c++ nodejs npm > /dev/null 2>&1

elif command -v pkg >/dev/null 2>&1; then
    OS_FAMILY="FreeBSD"
    echo -e "${YELLOW}[INFO] Detected $OS_FAMILY. Installing required packages...${NC}"
    pkg install -y git curl node npm > /dev/null 2>&1

elif command -v emerge >/dev/null 2>&1; then
    OS_FAMILY="Gentoo"
    echo -e "${YELLOW}[INFO] Detected $OS_FAMILY. Installing required packages...${NC}"
    emerge --quiet dev-vcs/git net-misc/curl net-libs/nodejs > /dev/null 2>&1

else
    echo -e "${RED}[ERROR] Unsupported OS. Could not detect apt, pacman, dnf, pkg, or emerge.${NC}"
    exit 1
fi

echo -e "${GREEN}[SUCCESS] Dependencies installed for $OS_FAMILY.${NC}\n"

# 2. Global NPM Packages
echo -e "${YELLOW}[INFO] Installing PM2 process manager globally...${NC}"
npm install -g pm2 --silent

# 3. Repository Cloning
echo -e "${YELLOW}[INFO] Setting up Rffnet repository...${NC}"
if [ -d "rffnetvpsdashboard" ]; then
    echo -e "${YELLOW}[INFO] Removing existing directory...${NC}"
    rm -rf rffnetvpsdashboard
fi

git clone https://github.com/RaffaFachrizal29/rffnetvpsdashboard.git -q
cd rffnetvpsdashboard

# 4. Build Process
echo -e "${YELLOW}[INFO] Installing NPM dependencies...${NC}"
npm install --silent

echo -e "${YELLOW}[INFO] Building the dashboard application...${NC}"
npm run build > /dev/null 2>&1

# 5. PM2 Setup
echo -e "${YELLOW}[INFO] Starting application with PM2...${NC}"
NODE_ENV=production pm2 start npm --name "rffnet" -- run start > /dev/null 2>&1
pm2 save > /dev/null 2>&1

echo -e "${YELLOW}[INFO] Configuring PM2 to start on boot...${NC}"
if command -v systemctl >/dev/null 2>&1; then
    pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
else
    pm2 startup > /dev/null 2>&1 || true
fi

# 6. Retrieve IP Address
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}' || echo "YOUR_SERVER_IP")

# 7. Final Output
echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}   [SUCCESS] Installation Complete!${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "Your Rffnet VPS Dashboard is now running."
echo -e "Access it in your web browser at:\n"
echo -e "   ${YELLOW}http://${SERVER_IP}:3000${NC}\n"
echo -e "Useful Commands:"
echo -e "   pm2 status rffnet   (Check status)"
echo -e "   pm2 logs rffnet     (View error/access logs)"
echo -e "   pm2 restart rffnet  (Restart the dashboard)"
echo -e "${BLUE}======================================================${NC}\n"
