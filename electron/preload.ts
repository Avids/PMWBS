import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  showSaveDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<string | null>;
  showOpenDialog: (options: {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }) => Promise<{ path: string; name: string; content: string } | null>;
  writeFile: (filePath: string, data: string | Uint8Array) => Promise<boolean>;
  readFile: (filePath: string) => Promise<string | null>;
  getInitialFile: () => Promise<{ path: string; name: string; content: string } | null>;
  onFileOpened: (callback: (data: { path: string; name: string; content: string }) => void) => () => void;
}

const api: ElectronAPI = {
  isElectron: true,
  platform: process.platform,
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
  getInitialFile: () => ipcRenderer.invoke('app:get-initial-file'),
  onFileOpened: (callback) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('app:file-opened', subscription);
    return () => {
      ipcRenderer.removeListener('app:file-opened', subscription);
    };
  }
};

contextBridge.exposeInMainWorld('electronAPI', api);
