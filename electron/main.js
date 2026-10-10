import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function getDataFilePath() {
  const userDataDir = app.getPath('userData');
  return path.join(userDataDir, 'autobus_data.json');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'منظومة الأتوبيسات - حفل التخرج',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    try {
      await mainWindow.loadURL(devServerUrl);
      // Optional: open dev tools in dev mode if requested
      // mainWindow.webContents.openDevTools();
    } catch (e) {
      console.log('Failed to load dev URL, waiting and retrying...', e);
      setTimeout(() => {
        mainWindow.loadURL(devServerUrl);
      }, 1000);
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-data-path', () => {
  return getDataFilePath();
});

ipcMain.handle('load-data', async () => {
  try {
    const filePath = getDataFilePath();
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist yet, return null
    if (error.code !== 'ENOENT') {
      console.error('Error loading data file:', error);
    }
    return null;
  }
});

ipcMain.handle('save-data', async (event, data) => {
  try {
    const filePath = getDataFilePath();
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error saving data file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'Window not found' };

  try {
    const { defaultFileName = 'كشف_الأتوبيس.pdf' } = options;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ كشف الأتوبيس بصيغة PDF',
      defaultPath: defaultFileName,
      filters: [{ name: 'ملفات PDF', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      landscape: false,
      margins: {
        marginType: 'custom',
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    });

    await fs.writeFile(filePath, pdfData);
    return { success: true, filePath };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print-window', async () => {
  if (!mainWindow) return { success: false };
  mainWindow.webContents.print({
    silent: false,
    printBackground: true
  });
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
