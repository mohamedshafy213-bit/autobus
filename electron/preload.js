import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  printToPdf: (options) => ipcRenderer.invoke('print-to-pdf', options),
  printWindow: () => ipcRenderer.invoke('print-window'),
  getDataPath: () => ipcRenderer.invoke('get-data-path')
});
