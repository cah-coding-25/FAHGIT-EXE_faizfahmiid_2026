export interface DesktopAppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  isPackaged: boolean;
  isPortable: boolean;
  userDataPath: string;
}

export interface UpdateInfoPayload {
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string;
  downloadUrl?: string;
  downloadSize?: number;
  isPortable?: boolean;
}

export interface DownloadProgressPayload {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface ConnectionStatusPayload {
  isOnline: boolean;
  lastChecked: number;
  apiAvailable: boolean;
}

export interface ElectronAPI {
  isDesktop: boolean;
  getAppInfo: () => Promise<DesktopAppInfo>;
  checkForUpdates: (token?: string) => Promise<{ status: string; message?: string }>;
  startUpdateDownload: () => Promise<{ status: string; message?: string }>;
  installUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfoPayload) => void) => () => void;
  onDownloadProgress: (callback: (progress: DownloadProgressPayload) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
  onUpdateError: (callback: (error: string) => void) => () => void;
  checkConnection: () => Promise<ConnectionStatusPayload>;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
