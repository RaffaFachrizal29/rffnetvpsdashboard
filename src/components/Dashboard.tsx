import React, { useState, useEffect } from 'react';
import { Server, Cpu, MemoryStick, HardDrive, Network, Clock } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) return <div className="text-text-muted animate-pulse">Loading resources...</div>;
  if (error && !stats) return <div className="text-red-400 bg-red-500/10 p-4 rounded-xl">{error}</div>;
  if (!stats) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    
    return parts.join(' ') || '< 1m';
  };

  const memPercent = ((stats.memory.used / stats.memory.total) * 100).toFixed(1);
  const diskPercent = stats.disk[0] ? stats.disk[0].use.toFixed(1) : 0;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-base">VPS Summary</h1>
          <p className="text-text-muted mt-2">Real-time resource monitoring</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-bg-panel border border-border-base rounded-xl">
          <Clock className="w-4 h-4 text-accent-base" />
          <span className="text-sm font-medium text-text-base">Uptime: {formatUptime(stats.uptime)}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU Card */}
        <div className="bg-bg-panel border border-border-base p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-muted font-medium">CPU</h3>
            <div className="p-2 bg-accent-base/10 rounded-lg text-accent-hover">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-semibold">{stats.cpu.cores} Cores</div>
          <div className="text-sm text-text-muted mt-1 truncate">{stats.cpu.manufacturer} {stats.cpu.brand}</div>
          <div className="text-xs text-zinc-600 mt-1">{stats.cpu.speed} GHz</div>
        </div>

        {/* RAM Card */}
        <div className="bg-bg-panel border border-border-base p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-muted font-medium">Memory</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
              <MemoryStick className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-semibold">{memPercent}%</div>
          <div className="w-full bg-bg-hover rounded-full h-1.5 mt-4">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${memPercent}%` }}></div>
          </div>
          <div className="text-sm text-text-muted mt-3 flex justify-between">
            <span>{formatBytes(stats.memory.used)} used</span>
            <span>{formatBytes(stats.memory.total)} total</span>
          </div>
        </div>

        {/* Disk Card */}
        <div className="bg-bg-panel border border-border-base p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-muted font-medium">Storage</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-semibold">{diskPercent}%</div>
          <div className="w-full bg-bg-hover rounded-full h-1.5 mt-4">
            <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${diskPercent}%` }}></div>
          </div>
          <div className="text-sm text-text-muted mt-3 flex justify-between">
            {stats.disk[0] && (
              <>
                <span>{formatBytes(stats.disk[0].used)} used</span>
                <span>{formatBytes(stats.disk[0].size)} total</span>
              </>
            )}
          </div>
        </div>

        {/* Network Card */}
        <div className="bg-bg-panel border border-border-base p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-muted font-medium">Network</h3>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
              <Network className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-mono text-text-muted break-all">{stats.network.ipv6}</div>
          <div className="text-xs text-text-muted mt-2 uppercase tracking-wider font-semibold">IPv6 Address</div>
        </div>
      </div>

      <div className="bg-bg-panel border border-border-base rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-base flex items-center gap-3">
          <Server className="w-5 h-5 text-text-muted" />
          <h2 className="font-semibold text-text-base">System Information</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
          <div>
            <div className="text-sm text-text-muted mb-1">Hostname</div>
            <div className="font-mono text-text-base bg-bg-base px-3 py-2 rounded-lg border border-border-base">{stats.os.hostname}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted mb-1">Domain (FQDN)</div>
            <div className="font-mono text-text-base bg-bg-base px-3 py-2 rounded-lg border border-border-base">{stats.os.fqdn}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted mb-1">OS Distribution</div>
            <div className="text-text-base">{stats.os.distro} {stats.os.release}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
