import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TerminalView from './components/TerminalView';
import AppInstaller from './components/AppInstaller';
import Login from './components/Login';
import FileManager from './components/FileManager';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 3 minutes = 180,000 milliseconds
      timeoutId = setTimeout(() => {
        if (isAuthenticated) {
          handleLogout();
        }
      }, 180000);
    };

    if (isAuthenticated) {
      // Set initial timeout
      resetTimeout();

      // Add event listeners for user activity
      const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
      events.forEach(event => {
        window.addEventListener(event, resetTimeout);
      });

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        events.forEach(event => {
          window.removeEventListener(event, resetTimeout);
        });
      };
    }
  }, [isAuthenticated, handleLogout]);

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-bg-base text-text-base font-sans">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/terminal" element={<TerminalView />} />
            <Route path="/apps" element={<AppInstaller />} />
            <Route path="/files" element={<FileManager />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
