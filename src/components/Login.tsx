import React, { useState } from 'react';
import { Server, Lock, User, TerminalSquare } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState('22');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, host: '127.0.0.1', port: parseInt(port) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4 font-sans text-text-base">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-base/10 text-accent-base mb-6">
            <TerminalSquare className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Rffnet</h1>
          <p className="text-text-muted">Sign in with your VPS credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-panel border border-border-base rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-muted mb-2">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-bg-base border border-border-base rounded-xl text-text-base placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-base/50 focus:border-accent-base transition-colors"
                    placeholder="root"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="block w-full px-4 py-3 bg-bg-base border border-border-base rounded-xl text-text-base placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-base/50 focus:border-accent-base transition-colors"
                  placeholder="22"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-bg-base border border-border-base rounded-xl text-text-base placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-accent-base/50 focus:border-accent-base transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-zinc-950 bg-accent-base hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {loading ? 'Connecting...' : 'Connect to VPS'}
            </button>
          </div>
        </form>
        
        <p className="text-center text-xs text-zinc-600 mt-8">
          In preview mode, use admin/admin to simulate connection.
        </p>
      </div>
    </div>
  );
};

export default Login;
