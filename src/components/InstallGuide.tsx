import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

const InstallGuide = () => {
  const [copied, setCopied] = useState(false);

  const installScript = `#!/bin/bash
# Rffnet VPS Dashboard Installation Script
# Run this as root on your Ubuntu/Debian VPS

echo "Starting installation..."

# Update system
apt-get update && apt-get upgrade -y

# Install Node.js (v22)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git

# Clone repository (assuming you have pushed this code to a repo)
# git clone https://github.com/yourusername/rffnet-dashboard.git
# cd rffnet-dashboard

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
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(installScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold text-zinc-100">Installation Guide</h1>
        <p className="text-zinc-400 mt-2">How to install Rffnet Dashboard on your VPS</p>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-zinc-400" />
            <h2 className="font-semibold text-zinc-200">Quick Install Script</h2>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="p-6 bg-zinc-950 overflow-x-auto">
          <pre className="text-sm font-mono text-zinc-300">
            <code>{installScript}</code>
          </pre>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-zinc-200">Manual Steps</h3>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">1</div>
            <div>
              <h4 className="font-medium text-zinc-200">Connect to your VPS</h4>
              <p className="text-zinc-500 text-sm mt-1">SSH into your server as root or a user with sudo privileges.</p>
              <code className="block mt-2 px-3 py-2 bg-zinc-900 rounded-lg text-sm font-mono text-zinc-300 border border-zinc-800">ssh root@your_server_ip</code>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">2</div>
            <div>
              <h4 className="font-medium text-zinc-200">Install Node.js</h4>
              <p className="text-zinc-500 text-sm mt-1">The dashboard requires Node.js to run the backend server.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">3</div>
            <div>
              <h4 className="font-medium text-zinc-200">Clone and Build</h4>
              <p className="text-zinc-500 text-sm mt-1">Download the source code, install dependencies, and build the frontend.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallGuide;
