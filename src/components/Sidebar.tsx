import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Terminal, Package, LogOut, FolderOpen, Sun, Moon, Palette } from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [accent, setAccent] = useState(localStorage.getItem('accent') || 'emerald');

  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.remove('accent-emerald', 'accent-blue', 'accent-purple');
    if (accent !== 'emerald') {
      document.documentElement.classList.add(`accent-${accent}`);
    }
    localStorage.setItem('accent', accent);
  }, [accent]);

  const navItems = [
    { name: 'Summary', path: '/', icon: LayoutDashboard },
    { name: 'Terminal', path: '/terminal', icon: Terminal },
    { name: 'App Installer', path: '/apps', icon: Package },
    { name: 'File Manager', path: '/files', icon: FolderOpen },
  ];

  return (
    <aside className="w-64 bg-bg-panel border-r border-border-base flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-accent-base">Rffnet</h1>
        <p className="text-xs text-text-muted mt-1">VPS Management</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-accent-base/10 text-accent-hover'
                  : 'text-text-muted hover:bg-bg-hover hover:text-text-base'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border-base space-y-4">
        <div className="px-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Theme</p>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setTheme('light')}
              className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-accent-base/10 text-accent-base' : 'text-text-muted hover:bg-bg-hover'}`}
              title="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-accent-base/10 text-accent-base' : 'text-text-muted hover:bg-bg-hover'}`}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAccent('emerald')}
              className={`w-6 h-6 rounded-full bg-emerald-500 transition-transform ${accent === 'emerald' ? 'scale-110 ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-bg-panel' : ''}`}
              title="Emerald Accent"
            />
            <button
              onClick={() => setAccent('blue')}
              className={`w-6 h-6 rounded-full bg-blue-500 transition-transform ${accent === 'blue' ? 'scale-110 ring-2 ring-blue-500/50 ring-offset-2 ring-offset-bg-panel' : ''}`}
              title="Blue Accent"
            />
            <button
              onClick={() => setAccent('purple')}
              className={`w-6 h-6 rounded-full bg-purple-500 transition-transform ${accent === 'purple' ? 'scale-110 ring-2 ring-purple-500/50 ring-offset-2 ring-offset-bg-panel' : ''}`}
              title="Purple Accent"
            />
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
