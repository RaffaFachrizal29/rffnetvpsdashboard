import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

const TerminalView = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#f4f4f5', // zinc-100
        cursor: '#10b981', // emerald-500
        selectionBackground: '#10b98140',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 14,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const token = localStorage.getItem('token');
    
    // Connect to WebSocket
    const socket = io('/', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('auth', token);
    });

    socket.on('data', (data: string) => {
      term.write(data);
    });

    socket.on('disconnect', () => {
      term.write('\r\n*** Disconnected from server ***\r\n');
    });

    term.onData((data) => {
      socket.emit('data', data);
    });

    const handleResize = () => {
      fitAddon.fit();
      socket.emit('resize', { cols: term.cols, rows: term.rows });
    };

    window.addEventListener('resize', handleResize);
    
    // Initial resize emit after a short delay to ensure DOM is ready
    setTimeout(handleResize, 100);

    socketRef.current = socket;

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-zinc-100">Terminal</h1>
        <p className="text-zinc-400 mt-2">Direct SSH access to your VPS</p>
      </header>
      
      <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden p-4 shadow-2xl">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default TerminalView;
