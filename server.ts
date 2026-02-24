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
import multer from 'multer';

dotenv.config();

const execAsync = promisify(exec);
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-rffnet-vps';
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

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

  app.get('/api/apps/status', authenticateToken, async (req: any, res) => {
    const allowedApps = ['apache2', 'nginx', 'postfix', 'mariadb-server', 'phpmyadmin', 'php'];
    
    if (req.user.isDummy) {
      const dummyStatus = allowedApps.reduce((acc, app) => ({ ...acc, [app]: false }), {});
      return res.json({ status: dummyStatus });
    }

    try {
      const conn = new Client();
      conn.on('ready', () => {
        // Check all apps at once using dpkg-query
        const checkCmd = allowedApps.map(app => `dpkg-query -W -f='\${Status}' ${app} 2>/dev/null | grep -c "ok installed"`).join(' ; ');
        
        conn.exec(checkCmd, (err, stream) => {
          if (err) {
            conn.end();
            return res.status(500).json({ error: err.message });
          }
          let output = '';
          stream.on('close', () => {
            conn.end();
            const results = output.trim().split('\n');
            const status = allowedApps.reduce((acc, app, index) => {
              acc[app] = results[index] === '1';
              return acc;
            }, {} as Record<string, boolean>);
            res.json({ status });
          }).on('data', (data: any) => {
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

  app.post('/api/apps/install', authenticateToken, async (req: any, res) => {
    const { appName } = req.body;
    const allowedApps = ['apache2', 'nginx', 'postfix', 'mariadb-server', 'phpmyadmin', 'php'];
    
    if (!allowedApps.includes(appName)) {
      return res.status(400).json({ error: 'App not allowed' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (req.user.isDummy) {
      res.write(`[Simulated] Starting installation of ${appName}...\n`);
      setTimeout(() => {
        res.write(`[Simulated] Successfully installed ${appName}\n`);
        res.end();
      }, 2000);
      return;
    }

    try {
      const conn = new Client();
      conn.on('ready', () => {
        conn.exec(`export PATH=$PATH:/usr/bin:/bin:/usr/sbin:/sbin && sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${appName}`, (err, stream) => {
          if (err) {
            conn.end();
            res.write(`Error: ${err.message}\n`);
            return res.end();
          }
          
          stream.on('close', (code: any, signal: any) => {
            conn.end();
            if (code === 0) {
              res.write(`\n--- Successfully installed ${appName} ---\n`);
            } else {
              res.write(`\n--- Installation failed with code ${code} ---\n`);
            }
            res.end();
          }).on('data', (data: any) => {
            res.write(data.toString());
          }).stderr.on('data', (data: any) => {
            res.write(data.toString());
          });
        });
      }).on('error', (err) => {
        res.write(`SSH Connection failed: ${err.message}\n`);
        res.end();
      }).connect({
        host: req.user.host,
        port: req.user.port,
        username: req.user.username,
        password: req.user.password
      });
    } catch (error: any) {
      res.write(`Error: ${error.message}\n`);
      res.end();
    }
  });

  app.post('/api/apps/remove', authenticateToken, async (req: any, res) => {
    const { appName } = req.body;
    const allowedApps = ['apache2', 'nginx', 'postfix', 'mariadb-server', 'phpmyadmin', 'php'];
    
    if (!allowedApps.includes(appName)) {
      return res.status(400).json({ error: 'App not allowed' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (req.user.isDummy) {
      res.write(`[Simulated] Starting removal of ${appName}...\n`);
      setTimeout(() => {
        res.write(`[Simulated] Successfully removed ${appName}\n`);
        res.end();
      }, 2000);
      return;
    }

    try {
      const conn = new Client();
      conn.on('ready', () => {
        conn.exec(`export PATH=$PATH:/usr/bin:/bin:/usr/sbin:/sbin && sudo DEBIAN_FRONTEND=noninteractive apt-get remove --purge -y ${appName} && sudo apt-get autoremove -y`, (err, stream) => {
          if (err) {
            conn.end();
            res.write(`Error: ${err.message}\n`);
            return res.end();
          }
          
          stream.on('close', (code: any, signal: any) => {
            conn.end();
            if (code === 0) {
              res.write(`\n--- Successfully removed ${appName} ---\n`);
            } else {
              res.write(`\n--- Removal failed with code ${code} ---\n`);
            }
            res.end();
          }).on('data', (data: any) => {
            res.write(data.toString());
          }).stderr.on('data', (data: any) => {
            res.write(data.toString());
          });
        });
      }).on('error', (err) => {
        res.write(`SSH Connection failed: ${err.message}\n`);
        res.end();
      }).connect({
        host: req.user.host,
        port: req.user.port,
        username: req.user.username,
        password: req.user.password
      });
    } catch (error: any) {
      res.write(`Error: ${error.message}\n`);
      res.end();
    }
  });

  // Helper to get SFTP connection
  const getSftp = (user: any): Promise<{ conn: Client, sftp: any }> => {
    return new Promise((resolve, reject) => {
      if (user.isDummy) return reject(new Error('SFTP not available in simulated mode'));
      const conn = new Client();
      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          resolve({ conn, sftp });
        });
      }).on('error', (err) => {
        reject(err);
      }).connect({
        host: user.host,
        port: user.port,
        username: user.username,
        password: user.password,
        readyTimeout: 5000
      });
    });
  };

  // File Manager Routes
  app.post('/api/files/list', authenticateToken, async (req: any, res) => {
    const { path = '/' } = req.body;
    try {
      const { conn, sftp } = await getSftp(req.user);
      sftp.readdir(path, (err: any, list: any) => {
        conn.end();
        if (err) return res.status(500).json({ error: err.message });
        const files = list.map((item: any) => ({
          name: item.filename,
          isDir: item.attrs.isDirectory(),
          size: item.attrs.size,
          mtime: item.attrs.mtime * 1000,
          permissions: item.attrs.mode.toString(8).slice(-3)
        })).sort((a: any, b: any) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        });
        res.json({ files });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/files/read', authenticateToken, async (req: any, res) => {
    const { path } = req.body;
    try {
      const { conn, sftp } = await getSftp(req.user);
      sftp.readFile(path, 'utf8', (err: any, data: any) => {
        conn.end();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ content: data });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/files/write', authenticateToken, async (req: any, res) => {
    const { path, content } = req.body;
    try {
      const { conn, sftp } = await getSftp(req.user);
      sftp.writeFile(path, content, 'utf8', (err: any) => {
        conn.end();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/files/create', authenticateToken, async (req: any, res) => {
    const { path, isDir } = req.body;
    try {
      const { conn, sftp } = await getSftp(req.user);
      if (isDir) {
        sftp.mkdir(path, (err: any) => {
          conn.end();
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      } else {
        sftp.writeFile(path, '', 'utf8', (err: any) => {
          conn.end();
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/files/delete', authenticateToken, async (req: any, res) => {
    const { path, isDir } = req.body;
    try {
      const { conn, sftp } = await getSftp(req.user);
      if (isDir) {
        sftp.rmdir(path, (err: any) => {
          conn.end();
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      } else {
        sftp.unlink(path, (err: any) => {
          conn.end();
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/files/chmod', authenticateToken, async (req: any, res) => {
    const { path, mode } = req.body;
    try {
      const { conn, sftp } = await getSftp(req.user);
      sftp.chmod(path, parseInt(mode, 8), (err: any) => {
        conn.end();
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    const { path } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const { conn, sftp } = await getSftp(req.user);
      const writeStream = sftp.createWriteStream(path);
      writeStream.on('close', () => {
        conn.end();
        res.json({ success: true });
      });
      writeStream.on('error', (err: any) => {
        conn.end();
        res.status(500).json({ error: err.message });
      });
      writeStream.end(file.buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  httpServer.listen(PORT, "::", () => {
    console.log(`Server running on port ${PORT} (IPv4 and IPv6)`);
  });
}

startServer();
