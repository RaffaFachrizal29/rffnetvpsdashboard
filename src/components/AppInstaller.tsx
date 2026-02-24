import React, { useState, useEffect, useRef } from 'react';
import { Package, CheckCircle2, Loader2, AlertCircle, Trash2, Info, X, Terminal as TerminalIcon } from 'lucide-react';

const apps = [
  { id: 'apache2', name: 'Apache2', desc: 'Web Server', icon: '🌐' },
  { id: 'nginx', name: 'Nginx', desc: 'High Performance Web Server', icon: '⚡' },
  { id: 'postfix', name: 'Postfix', desc: 'Mail Transfer Agent', icon: '📧' },
  { id: 'mariadb-server', name: 'MariaDB', desc: 'Database Server', icon: '🗄️' },
  { id: 'phpmyadmin', name: 'phpMyAdmin', desc: 'MySQL/MariaDB Admin Tool', icon: '🛠️' },
  { id: 'php', name: 'PHP', desc: 'Scripting Language', icon: '🐘' },
];

const AppInstaller = () => {
  const [installedStatus, setInstalledStatus] = useState<Record<string, boolean>>({});
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [activeProcess, setActiveProcess] = useState<{ id: string, action: 'install' | 'remove' } | null>(null);
  const [processOutput, setProcessOutput] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  
  const outputEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/apps/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInstalledStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch app status', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [processOutput]);

  const handleProcess = async (appId: string, action: 'install' | 'remove') => {
    setActiveProcess({ id: appId, action });
    setProcessOutput(`Starting ${action} for ${appId}...\n`);
    setShowModal(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/apps/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ appName: appId })
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setProcessOutput(prev => prev + chunk);
      }
      
      // Refresh status after completion
      await fetchStatus();
    } catch (err: any) {
      setProcessOutput(prev => prev + `\nError: ${err.message}\n`);
    } finally {
      setActiveProcess(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-text-base">App Installer</h1>
        <p className="text-text-muted mt-2">Manage server applications</p>
      </header>

      {loadingStatus ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent-base" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => {
            const isInstalled = installedStatus[app.id];
            
            return (
              <div key={app.id} className="bg-bg-panel border border-border-base p-6 rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
                {isInstalled && (
                  <div className="absolute top-0 right-0 bg-accent-base/10 text-accent-hover text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Installed
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{app.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-base">{app.name}</h3>
                      <p className="text-sm text-text-muted">{app.desc}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-6 flex gap-3">
                  {isInstalled ? (
                    <>
                      <button
                        onClick={() => alert(`${app.name} is installed and running.`)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-bg-hover hover:bg-bg-hover text-text-base rounded-xl transition-colors text-sm font-medium"
                      >
                        <Info className="w-4 h-4" />
                        Detail
                      </button>
                      <button
                        onClick={() => handleProcess(app.id, 'remove')}
                        disabled={activeProcess !== null}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleProcess(app.id, 'install')}
                      disabled={activeProcess !== null}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-accent-base hover:bg-accent-hover text-zinc-950 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      <Package className="w-4 h-4" />
                      Install
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Process Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-panel border border-border-base rounded-2xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border-base flex items-center justify-between bg-bg-base/50">
              <div className="flex items-center gap-3">
                <TerminalIcon className="w-5 h-5 text-accent-base" />
                <h3 className="text-lg font-bold text-text-base">
                  {activeProcess ? `${activeProcess.action === 'install' ? 'Installing' : 'Removing'} ${activeProcess.id}...` : 'Process Output'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                disabled={activeProcess !== null}
                className="p-2 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {activeProcess && (
              <div className="h-1 w-full bg-bg-hover overflow-hidden">
                <div className="h-full bg-accent-base w-1/3 animate-pulse rounded-full" style={{ animationDuration: '1s', animationIterationCount: 'infinite' }}></div>
              </div>
            )}
            
            <div className="flex-1 p-4 bg-bg-base overflow-y-auto font-mono text-sm text-text-muted whitespace-pre-wrap">
              {processOutput}
              <div ref={outputEndRef} />
            </div>
            
            {!activeProcess && (
              <div className="p-4 border-t border-border-base bg-bg-base/50 flex justify-end">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-bg-hover hover:bg-bg-hover text-text-base rounded-xl transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppInstaller;
