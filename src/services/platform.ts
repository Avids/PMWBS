import type { ProjectFile } from '../types/project';

declare global {
  interface Window {
    electronAPI?: {
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
    };
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

/**
 * Saves a project file either natively via Electron Save Dialog or via web browser download.
 */
export async function saveProjectWithDialog(
  fileData: ProjectFile,
  defaultFileName: string
): Promise<{ success: boolean; path?: string }> {
  const jsonContent = JSON.stringify(fileData, null, 2);

  if (isElectron() && window.electronAPI) {
    const savePath = await window.electronAPI.showSaveDialog({
      title: 'Save Project Schedule (.wbs)',
      defaultPath: defaultFileName,
      filters: [
        { name: 'PMWBS Project Schedule (*.wbs)', extensions: ['wbs'] },
        { name: 'JSON Schedule (*.json)', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!savePath) {
      return { success: false }; // User cancelled
    }

    const written = await window.electronAPI.writeFile(savePath, jsonContent);
    return { success: written, path: savePath };
  } else {
    // Web Fallback (Browser Blob download)
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  }
}

/**
 * Opens a project file either natively via Electron Open Dialog or returns null to trigger web input.
 */
export async function openProjectWithDialog(): Promise<{
  name: string;
  content: string;
  path?: string;
} | null> {
  if (isElectron() && window.electronAPI) {
    const result = await window.electronAPI.showOpenDialog({
      title: 'Open Schedule File',
      filters: [
        { name: 'Supported Files (*.wbs, *.xml)', extensions: ['wbs', 'xml'] },
        { name: 'PMWBS Schedule (*.wbs)', extensions: ['wbs'] },
        { name: 'Microsoft Project XML (*.xml)', extensions: ['xml'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result;
  }
  return null;
}
