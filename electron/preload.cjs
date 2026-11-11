/**
 * FAHGIT - Secure Preload Bridge
 * By: Faiz_Fahmi_ID
 * contextIsolation = true, nodeIntegration = false
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,

  // App Metadata & Platform Info
  getAppInfo: () => ipcRenderer.invoke('desktop:get-app-info'),

  // Permanent Auto-Update Engine API
  checkForUpdates: (token) => ipcRenderer.invoke('desktop:check-updates', token),
  startUpdateDownload: () => ipcRenderer.invoke('desktop:start-download'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),

  // Event Listeners for Update Popup
  onUpdateAvailable: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('desktop:update-available', handler);
    return () => ipcRenderer.removeListener('desktop:update-available', handler);
  },

  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('desktop:download-progress', handler);
    return () => ipcRenderer.removeListener('desktop:download-progress', handler);
  },

  onUpdateDownloaded: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('desktop:update-downloaded', handler);
    return () => ipcRenderer.removeListener('desktop:update-downloaded', handler);
  },

  onUpdateError: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('desktop:update-error', handler);
    return () => ipcRenderer.removeListener('desktop:update-error', handler);
  },

  // Online / Offline Connectivity Check
  checkConnection: () => ipcRenderer.invoke('desktop:check-connection'),

  // Open External HTTPS links safely
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
});
