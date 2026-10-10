import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import apiRouter from './routes/index.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Router
app.use('/api', apiRouter);

// Serve built Vue app as static files
// Checks server/public first, then root dist
const publicPath = path.join(__dirname, 'public');
const distPath = path.join(__dirname, '..', 'dist');
const staticDir = fs.existsSync(publicPath) ? publicPath : (fs.existsSync(distPath) ? distPath : null);

if (staticDir) {
  app.use(express.static(staticDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticDir, 'index.html'));
    }
  });
}

// Extract LAN IPv4 addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

// Start server listening on 0.0.0.0
const server = app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();

  console.log('');
  console.log('====================================================================');
  console.log('  [BUSES SYSTEM] Graduation Event LAN Server is RUNNING!');
  console.log('  منظومة الأتوبيسات - خادم الشبكة المحلية يعمل بنجاح');
  console.log('====================================================================');
  console.log(`  * Local Access (This PC):     http://localhost:${PORT}`);
  
  if (ips.length === 0) {
    console.log('  * Network: No active network adapter found (Offline mode)');
  } else {
    ips.forEach(ip => {
      console.log(`  * Other PCs (Ethernet/LAN):   http://${ip.address}:${PORT}`);
    });
  }

  console.log('--------------------------------------------------------------------');
  console.log(`  * Database: data/buses.db (SQLite WAL Mode)`);
  console.log(`  * Port:     ${PORT}`);
  console.log('====================================================================');
  console.log('  Ready for connections. Press Ctrl+C to stop.');
  console.log('');
});

// Graceful shutdown on SIGINT
process.on('SIGINT', () => {
  console.log('\nجاري إيقاف الخادم بسلاسة (SIGINT)...');
  server.close(() => {
    try {
      db.close();
      console.log('✓ تم إغلاق قاعدة البيانات والخادم بنجاح.');
    } catch (err) {
      console.error('خطأ أثناء إغلاق قاعدة البيانات:', err);
    }
    process.exit(0);
  });
});

export default app;
