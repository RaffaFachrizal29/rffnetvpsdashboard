#!/usr/bin/env bash

# ==============================================================================
# Rffnet VPS Dashboard Universal TUI Installer
# Supported: Debian/Ubuntu, Arch Linux, Fedora, Gentoo, FreeBSD
# ==============================================================================

set -e

# 0. Fix for 'curl | bash' pipe issue to prevent infinite loops
if [ ! -t 0 ]; then
    echo "[ INFO ] Pipe execution detected. Switching to interactive mode..."
    TMP_SCRIPT=$(mktemp)
    curl -fsSL https://github.com/RaffaFachrizal29/rffnetvpsdashboard/raw/refs/heads/main/install.sh -o "$TMP_SCRIPT"
    
    # The fix is here: < /dev/tty forces the new process to read from the real terminal, breaking the loop.
    bash "$TMP_SCRIPT" < /dev/tty
    
    rm -f "$TMP_SCRIPT"
    exit 0
fi

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "[ ERROR ] This script must be run as root."
  echo "Try running: curl -fsSL <url> | sudo bash"
  exit 1
fi

echo "[ INFO ] Detecting operating system and preparing environment..."

# 1. OS Detection and Dependency Installation
if command -v apt-get >/dev/null 2>&1; then
    OS_FAMILY="Debian/Ubuntu"
    apt-get update -y >/dev/null 2>&1
    apt-get install -y whiptail git curl build-essential nodejs npm >/dev/null 2>&1
    TUI="whiptail"

elif command -v pacman >/dev/null 2>&1; then
    OS_FAMILY="Arch Linux"
    pacman -Sy --noconfirm --needed libnewt git curl base-devel nodejs npm >/dev/null 2>&1
    TUI="whiptail"

elif command -v dnf >/dev/null 2>&1; then
    OS_FAMILY="Fedora/RHEL"
    dnf install -y newt git curl make gcc gcc-c++ nodejs npm >/dev/null 2>&1
    TUI="whiptail"

elif command -v pkg >/dev/null 2>&1; then
    OS_FAMILY="FreeBSD"
    pkg install -y dialog git curl node npm >/dev/null 2>&1
    TUI="dialog"

elif command -v emerge >/dev/null 2>&1; then
    OS_FAMILY="Gentoo"
    emerge --quiet dev-util/dialog dev-vcs/git net-misc/curl net-libs/nodejs >/dev/null 2>&1
    TUI="dialog"

else
    echo "[ ERROR ] Unsupported OS. Could not detect apt, pacman, dnf, pkg, or emerge."
    exit 1
fi

# 2. TUI Welcome Screen
$TUI --title "Rffnet VPS Dashboard" \
     --msgbox "Welcome to the Universal Rffnet Installer.\n\nDetected Environment: $OS_FAMILY\n\nThis script will configure Node.js, install PM2, and set up your web dashboard to run smoothly in the background." 12 60

if ! $TUI --title "Confirm Installation" \
          --yesno "Are you ready to begin the installation on this $OS_FAMILY server?" 8 60; then
    clear
    echo "[ INFO ] Installation aborted by the user."
    exit 0
fi

# 3. Execution with Progress Bar
{
    echo -e "XXX\n15\nInstalling PM2 process manager globally...\nXXX"
    npm install -g pm2 --silent > /dev/null 2>&1

    echo -e "XXX\n35\nCleaning up previous repository data...\nXXX"
    if [ -d "rffnetvpsdashboard" ]; then
        rm -rf rffnetvpsdashboard
    fi

    echo -e "XXX\n50\nCloning the Rffnet repository...\nXXX"
    git clone https://github.com/RaffaFachrizal29/rffnetvpsdashboard.git -q
    cd rffnetvpsdashboard

    echo -e "XXX\n75\nInstalling NPM dependencies and building the application...\nXXX"
    npm install --silent > /dev/null 2>&1
    npm run build > /dev/null 2>&1

    echo -e "XXX\n90\nStarting application and configuring PM2 on boot...\nXXX"
    NODE_ENV=production pm2 start npm --name "rffnet" -- run start > /dev/null 2>&1
    pm2 save > /dev/null 2>&1
    
    # Smart PM2 startup configuration (systemd vs init.d/rc.d)
    if command -v systemctl >/dev/null 2>&1; then
        pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
    else
        pm2 startup > /dev/null 2>&1 || true
    fi

    echo -e "XXX\n100\nFinalizing installation...\nXXX"
    sleep 1
} | $TUI --title "Installing Rffnet ($OS_FAMILY)" --gauge "Please wait while we configure your server..." 8 60

# Retrieve the server's public IP address gracefully
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}' || echo "YOUR_SERVER_IP")

# 4. Final Success Screen
$TUI --title "Installation Successful!" \
     --msgbox "The Rffnet VPS Dashboard is now live!\n\nYou can access your dashboard via your web browser at:\nhttp://${SERVER_IP}:3000\n\nHelpful PM2 Commands:\n- Check Status: pm2 status rffnet\n- View Logs: pm2 logs rffnet\n- Restart App: pm2 restart rffnet" 14 65

# Clear the terminal and leave a final output link
clear
echo -e "\e[32m[ SUCCESS ] Installation Complete on $OS_FAMILY!\e[0m"
echo -e "Access your Rffnet dashboard here: \e[1;33mhttp://${SERVER_IP}:3000\e[0m\n"
