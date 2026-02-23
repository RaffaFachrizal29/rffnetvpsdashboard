import React, { useState } from 'react';
import { Package, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const apps = [
  { id: 'apache2', name: 'Apache2', desc: 'Web Server', icon: '🌐' },
  { id: 'nginx', name: 'Nginx', desc: 'High Performance Web Server', icon: '⚡' },
  { id: 'postfix', name: 'Postfix', desc: 'Mail Transfer Agent', icon: '📧' },
  { id: 'mariadb-server', name: 'MariaDB', desc: 'Database Server', icon: '🗄️' },
  { id: 'phpmyadmin', name: 'phpMyAdmin', desc: 'MySQL/MariaDB Admin Tool', icon: '🛠️' },
  { id: 'php', name: 'PHP', desc: 'Scripting Language', icon: '🐘' },
];

const AppInstaller = () => {
  const [installing, setInstalling] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { status: 'success' | 'error', message: string }>>({});

  const handleInstall = async (appId: string) => {
    setInstalling(appId);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/apps/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ appName: appId })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Installation failed');
      
      setResults(prev => ({
        ...prev,
        [appId]: { status: 'success', message: data.message }
      }));
    } catch (err: any) {
      setResults(prev => ({
        ...prev,
        [appId]: { status: 'error', message: err.message }
      }));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-100">App Installer</h1>
        <p className="text-zinc-400 mt-2">One-click installation for common server applications</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <div key={app.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{app.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">{app.name}</h3>
                  <p className="text-sm text-zinc-500">{app.desc}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-6">
              {results[app.id] ? (
                <div className={`flex items-center gap-2 text-sm ${results[app.id].status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {results[app.id].status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span className="truncate">{results[app.id].message}</span>
                </div>
              ) : (
                <button
                  onClick={() => handleInstall(app.id)}
                  disabled={installing !== null}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {installing === app.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Install
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppInstaller;
