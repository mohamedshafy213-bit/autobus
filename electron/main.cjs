const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;

function startBackendServer() {
  const serverScript = path.join(__dirname, '..', 'server', 'index.js');
  serverProcess = spawn('node', [serverScript], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Express backend:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'منظومة الأتوبيسات — حفل التخرج',
    autoHideMenuBar: true,
    show: false, // Show when ready to prevent blank flash
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Wait a short moment for Express to initialize, then load
  const targetUrl = `http://localhost:${PORT}`;

  const tryLoad = (retries = 15) => {
    mainWindow.loadURL(targetUrl).catch(() => {
      if (retries > 0) {
        setTimeout(() => tryLoad(retries - 1), 500);
      }
    });
  };

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  tryLoad();

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
