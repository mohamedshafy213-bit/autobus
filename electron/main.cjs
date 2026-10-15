const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;
const targetUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;
const isRemoteServer = !!process.env.SERVER_URL && !process.env.SERVER_URL.includes('localhost') && !process.env.SERVER_URL.includes('127.0.0.1');

function checkServerReady(cb) {
  const checkUrl = `${targetUrl}/api/state`;
  const req = http.get(checkUrl, (res) => {
    cb(res.statusCode < 500);
  });
  req.on('error', () => {
    cb(false);
  });
  req.setTimeout(1200, () => {
    req.destroy();
    cb(false);
  });
}

function startBackendServer() {
  if (isRemoteServer) {
    console.log('Connecting to remote server at:', targetUrl);
    return;
  }
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
