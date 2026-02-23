import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import si from 'systeminformation';
import { Client } from 'ssh2';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-rffnet-vps';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post('/api/auth/login', async (req, res) => {
    const { username, password, host = '127.0.0.1', port = 22 } = req.body;
    
    // In preview mode, allow a dummy login if SSH fails or for testing
    const isPreview = process.env.NODE_ENV !== 'production';

    const conn = new Client();
    conn.on('ready', () => {
      conn.end();
      const token = jwt.sign({ username, host, port, password }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, username });
    }).on('error', (err) => {
      if (isPreview && username === 'admin' && password === 'admin') {
        const token = jwt.sign({ username, host, port, password, isDummy: true }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token, username });
      }
      res.status(401).json({ error: 'Authentication failed: ' + err.message });
    }).connect({
      host,
      port,
      username,
      password,
      readyTimeout: 5000
    });
  });

  // Middleware to verify JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  app.get('/api/stats', authenticateToken, async (req: any, res) => {
    try {
      const [cpu, mem, os, net, disk] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.networkInterfaces(),
        si.fsSize()
      ]);

      // Find IPv6
      let ipv6 = '';
      if (Array.isArray(net)) {
        for (const n of net) {
          if (n.ip6 && n.ip6 !== '::1' && !n.ip6.startsWith('fe80')) {
            ipv6 = n.ip6;
            break;
          }
        }
      }

      res.json({
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          speed: cpu.speed
        },
        memory: {
          total: mem.total,
          used: mem.active,
          free: mem.available
        },
        disk: disk.map(d => ({
          fs: d.fs,
          size: d.size,
          used: d.used,
          use: d.use
        })),
        os: {
          hostname: os.hostname,
          distro: os.distro,
          release: os.release,
          fqdn: os.fqdn || os.hostname
        },
        network: {
          ipv6: ipv6 || 'Not available'
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/apps/install', authenticateToken, async (req: any, res) => {
    const { appName } = req.body;
    const allowedApps = ['apache2', 'nginx', 'postfix', 'mariadb-server', 'phpmyadmin', 'php'];
    
    if (!allowedApps.includes(appName)) {
      return res.status(400).json({ error: 'App not allowed' });
    }

    if (req.user.isDummy) {
      return res.json({ message: `[Simulated] Successfully installed ${appName}` });
    }

    try {
      // Execute via SSH to ensure it runs as the logged in user (requires sudo if not root)
      const conn = new Client();
      conn.on('ready', () => {
        conn.exec(`sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${appName}`, (err, stream) => {
          if (err) {
            conn.end();
            return res.status(500).json({ error: err.message });
          }
          let output = '';
          stream.on('close', (code: any, signal: any) => {
            conn.end();
            if (code === 0) {
              res.json({ message: `Successfully installed ${appName}`, output });
            } else {
              res.status(500).json({ error: `Installation failed with code ${code}`, output });
            }
          }).on('data', (data: any) => {
            output += data.toString();
          }).stderr.on('data', (data: any) => {
            output += data.toString();
          });
        });
      }).on('error', (err) => {
        res.status(500).json({ error: 'SSH Connection failed: ' + err.message });
      }).connect({
        host: req.user.host,
        port: req.user.port,
        username: req.user.username,
        password: req.user.password
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // WebSocket for Terminal
  io.on('connection', (socket) => {
    let sshConn: Client | null = null;
    let stream: any = null;

    socket.on('auth', (token) => {
      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
          socket.emit('data', '\\r\\n*** Authentication failed ***\\r\\n');
          socket.disconnect();
          return;
        }

        if (user.isDummy) {
          socket.emit('data', '\\r\\n*** Connected to Simulated Terminal (Preview Mode) ***\\r\\n$ ');
          socket.on('data', (data) => {
            if (data === '\\r') {
              socket.emit('data', '\\r\\n$ ');
            } else {
              socket.emit('data', data);
            }
          });
          return;
        }

        sshConn = new Client();
        sshConn.on('ready', () => {
          socket.emit('data', '\\r\\n*** Connected ***\\r\\n');
          sshConn!.shell((err, s) => {
            if (err) {
              socket.emit('data', '\\r\\n*** Shell error: ' + err.message + ' ***\\r\\n');
              return;
            }
            stream = s;
            stream.on('close', () => {
              sshConn!.end();
              socket.disconnect();
            }).on('data', (data: any) => {
              socket.emit('data', data.toString('utf-8'));
            });
          });
        }).on('error', (err) => {
          socket.emit('data', '\\r\\n*** SSH Connection Error: ' + err.message + ' ***\\r\\n');
          socket.disconnect();
        }).connect({
          host: user.host,
          port: user.port,
          username: user.username,
          password: user.password
        });
      });
    });

    socket.on('data', (data) => {
      if (stream) {
        stream.write(data);
      }
    });

    socket.on('resize', ({ cols, rows }) => {
      if (stream) {
        stream.setWindow(rows, cols, 0, 0);
      }
    });

    socket.on('disconnect', () => {
      if (sshConn) {
        sshConn.end();
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
