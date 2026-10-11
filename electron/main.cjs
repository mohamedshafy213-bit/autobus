const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;

function checkServerReady(cb) {
  const req = http.get(`http://127.0.0.1:${PORT}/api/state`, (res) => {
    cb(res.statusCode < 500);
  });
  req.on('error', () => {
    cb(false);
  });
  req.setTimeout(800, () => {
    req.destroy();
    cb(false);
  });
}

function startBackendServer() {
  checkServerReady((isReady) => {
    if (isReady) {
      console.log('Server is already running on port', PORT);
      return;
    }
    const serverScript = path.join(__dirname, '..', 'server', 'index.js');
    serverProcess = spawn('node', [serverScript], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(PORT) },
      shell: true,
      stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start Express backend:', err);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'منظومة الأتوبيسات — حفل التخرج',
    autoHideMenuBar: true,
    show: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const targetUrl = `http://localhost:${PORT}`;

  const pollAndLoad = (retries = 30) => {
    checkServerReady((ready) => {
      if (ready) {
        mainWindow.loadURL(targetUrl);
      } else if (retries > 0) {
        setTimeout(() => pollAndLoad(retries - 1), 300);
      } else {
        mainWindow.loadURL(targetUrl);
      }
    });
  };

  pollAndLoad();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {
      // ignore
    }
  }
  app.quit();
});
