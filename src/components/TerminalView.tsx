import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { io, Socket } from 'socket.io-client';
import { Copy, ClipboardPaste, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

const TerminalView = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [fontSize, setFontSize] = useState(14);

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
      fontSize: fontSize,
      rightClickSelectsWord: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(new ClipboardAddon());
    
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

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (socketRef.current) {
          socketRef.current.emit('resize', { cols: xtermRef.current.cols, rows: xtermRef.current.rows });
        }
      }
    }
  }, [fontSize]);

  const handleCopy = () => {
    if (xtermRef.current && xtermRef.current.hasSelection()) {
      document.execCommand('copy');
      xtermRef.current.clearSelection();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (socketRef.current) {
        socketRef.current.emit('data', text);
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 2, 32));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 2, 8));
  const handleFit = () => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
      if (socketRef.current && xtermRef.current) {
        socketRef.current.emit('resize', { cols: xtermRef.current.cols, rows: xtermRef.current.rows });
      }
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-base">Terminal</h1>
          <p className="text-text-muted mt-2">Direct SSH access to your VPS</p>
        </div>
        <div className="flex items-center gap-2 bg-bg-panel border border-border-base p-1.5 rounded-xl">
          <button onClick={handleCopy} className="p-2 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-lg transition-colors" title="Copy Selection">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={handlePaste} className="p-2 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-lg transition-colors" title="Paste">
            <ClipboardPaste className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border-base mx-1"></div>
          <button onClick={handleZoomOut} className="p-2 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-lg transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-text-muted w-8 text-center">{fontSize}px</span>
          <button onClick={handleZoomIn} className="p-2 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-lg transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border-base mx-1"></div>
          <button onClick={handleFit} className="p-2 text-text-muted hover:text-text-base hover:bg-bg-hover rounded-lg transition-colors" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>
      
      <div className="flex-1 bg-[#09090b] border border-border-base rounded-2xl overflow-hidden p-4 shadow-2xl">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default TerminalView;
