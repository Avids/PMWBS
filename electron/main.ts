import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let fileToOpenOnStartup: { path: string; name: string; content: string } | null = null;

// Determine if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function findFileArg(argv: string[]): string | null {
  for (const arg of argv.slice(1)) {
    if (arg && !arg.startsWith('--') && (arg.endsWith('.wbs') || arg.endsWith('.xml') || arg.endsWith('.mpp'))) {
      if (fs.existsSync(arg)) return arg;
    }
  }
  return null;
}

// Check startup argv for .wbs file
const startupFilePath = findFileArg(process.argv);
if (startupFilePath) {
  try {
    const content = fs.readFileSync(startupFilePath, 'utf-8');
    fileToOpenOnStartup = {
      path: startupFilePath,
      name: path.basename(startupFilePath),
      content
    };
  } catch (e) {
    console.error('Failed to read startup file:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1050,
    minHeight: 700,
    title: 'PMWBS - Project Scheduling & WBS Management Suite',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  // Native application menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload()
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => mainWindow?.setFullScreen(!mainWindow?.isFullScreen())
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      const filePath = findFileArg(argv);
      if (filePath && fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          mainWindow.webContents.send('app:file-opened', {
            path: filePath,
            name: path.basename(filePath),
            content
          });
        } catch (err) {
          console.error(err);
        }
      }
    }
  });

  app.whenReady().then(() => {
    // IPC Handlers
    ipcMain.handle('app:get-initial-file', async () => {
      const f = fileToOpenOnStartup;
      fileToOpenOnStartup = null; // consume once
      return f;
    });

    ipcMain.handle('dialog:open-file', async (_event, options) => {
      if (!mainWindow) return null;
      const res = await dialog.showOpenDialog(mainWindow, {
        title: options?.title || 'Open Schedule File',
        properties: ['openFile'],
        filters: options?.filters || [
          { name: 'PMWBS Project (*.wbs)', extensions: ['wbs'] },
          { name: 'Microsoft Project XML (*.xml)', extensions: ['xml'] },
          { name: 'All Supported', extensions: ['wbs', 'xml', 'mpp'] }
        ]
      });

      if (!res.canceled && res.filePaths.length > 0) {
        const filePath = res.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf-8');
        return {
          path: filePath,
          name: path.basename(filePath),
          content
        };
      }
      return null;
    });

    ipcMain.handle('dialog:save-file', async (_event, options) => {
      if (!mainWindow) return null;
      const res = await dialog.showSaveDialog(mainWindow, {
        title: options?.title || 'Save Schedule As',
        defaultPath: options?.defaultPath || 'Project_Schedule.wbs',
        filters: options?.filters || [
          { name: 'PMWBS Project (*.wbs)', extensions: ['wbs'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!res.canceled && res.filePath) {
        return res.filePath;
      }
      return null;
    });

    ipcMain.handle('fs:write-file', async (_event, filePath: string, data: any) => {
      try {
        if (typeof data === 'string') {
          fs.writeFileSync(filePath, data, 'utf-8');
        } else {
          fs.writeFileSync(filePath, Buffer.from(data));
        }
        return true;
      } catch (e) {
        console.error('Failed to write file:', e);
        return false;
      }
    });

    ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        console.error('Failed to read file:', e);
        return null;
      }
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
