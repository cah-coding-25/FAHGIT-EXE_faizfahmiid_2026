/**
 * FAHGIT - Universal Website to Windows Desktop Application Engine
 * With Permanent Auto-Update System & Offline-Adaptive Architecture
 * By: Faiz_Fahmi_ID
 * Version: 1.0.0
 */

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Import electron-updater safely
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
} catch (err) {
  console.log('[AutoUpdater] Module init notice:', err.message);
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let GITHUB_OWNER = process.env.GITHUB_OWNER || 'ghfghjk94-hash';
let GITHUB_REPO = process.env.GITHUB_REPO || 'fahgirexe_update';

try {
  const pkg = require('../package.json');
  if (pkg.build && pkg.build.publish && pkg.build.publish[0]) {
    if (pkg.build.publish[0].owner) GITHUB_OWNER = pkg.build.publish[0].owner;
    if (pkg.build.publish[0].repo) GITHUB_REPO = pkg.build.publish[0].repo;
  }
} catch {
  // use defaults
}

let mainWindow = null;
let hasPerformedStartupUpdateCheck = false;
let hasEmittedUpdateThisSession = false;

// Baseline timestamp for v1.0.0 reset: ignore older/stale releases published before 2026-11-12T00:00:00Z
const BASELINE_RELEASE_MS = Date.parse('2026-11-12T00:00:00Z');
let networkStatus = {
  isOnline: true,
  lastChecked: Date.now(),
  apiAvailable: true,
};

function createWindow() {
  const icoPath = path.join(__dirname, 'icon.ico');
  const pngPath = path.join(__dirname, 'icon.png');
  const appIcon = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : undefined);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    title: 'Fahgit by: Faiz_Fahmi_ID',
    icon: appIcon,
    backgroundColor: '#0A0F1D',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for custom preload IPC bridges
      webSecurity: false, // Allows local file:// resources to load relative assets smoothly
      spellcheck: false,
    },
  });

  // Hilangkan baris menu File, Edit, View, Window agar antarmuka desktop rapi dan bersih
  mainWindow.setMenu(null);
  Menu.setApplicationMenu(null);

  // Open external links in user's default browser (security rule)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation outside application
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevServer = isDev && url.startsWith('http://localhost:3000');
    const isLocalFile = url.startsWith('file://');
    if (!isDevServer && !isLocalFile) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // DevTools and Reload Shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.control && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription, validatedURL);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    const appPath = app.getAppPath();
    const candidatePaths = [
      path.join(appPath, 'dist/index.html'),
      path.join(__dirname, '../dist/index.html'),
      path.join(__dirname, 'dist/index.html'),
    ];
    const targetHtml = candidatePaths.find((p) => fs.existsSync(p)) || path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(targetHtml);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Jalankan pengecekan update HANYA SATU KALI saat aplikasi pertama kali dibuka
    if (!hasPerformedStartupUpdateCheck) {
      hasPerformedStartupUpdateCheck = true;
      setTimeout(() => {
        checkForUpdatesSilent();
      }, 3500);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =========================================================================
// NETWORK & CONNECTIVITY MONITOR
// =========================================================================
function checkNetworkConnectivity() {
  return new Promise((resolve) => {
    const req = https.get(
      'https://api.github.com/zen',
      {
        headers: { 'User-Agent': 'Fahgit-Desktop-App' },
        timeout: 4000,
      },
      (res) => {
        networkStatus.isOnline = res.statusCode === 200;
        networkStatus.apiAvailable = true;
        networkStatus.lastChecked = Date.now();
        resolve(networkStatus);
      }
    );

    req.on('error', () => {
      networkStatus.isOnline = false;
      networkStatus.apiAvailable = false;
      networkStatus.lastChecked = Date.now();
      resolve(networkStatus);
    });

    req.on('timeout', () => {
      req.destroy();
      networkStatus.isOnline = false;
      networkStatus.apiAvailable = false;
      networkStatus.lastChecked = Date.now();
      resolve(networkStatus);
    });
  });
}

// =========================================================================
// STRICT RELEASE SANITIZATION & VALIDATION HELPERS
// =========================================================================
function sanitizeReleaseNotes(raw) {
  if (!raw || typeof raw !== 'string') {
    return 'Pembaruan stabilitas dan peningkatan performa.';
  }
  return raw
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isStrictSemver(ver) {
  return /^\d+\.\d+\.\d+$/.test(String(ver || '').replace(/^v/i, '').trim());
}

function isReleaseAfterBaseline(releaseDateStr) {
  if (!releaseDateStr) return false;
  const parsed = Date.parse(releaseDateStr);
  if (Number.isNaN(parsed)) return false;
  return parsed >= BASELINE_RELEASE_MS;
}

function emitUpdateAvailableOnce(payload) {
  if (hasEmittedUpdateThisSession) return;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  hasEmittedUpdateThisSession = true;
  mainWindow.webContents.send('desktop:update-available', payload);
}

// =========================================================================
// PERMANENT AUTO-UPDATE ENGINE (STRICT, COLD-START ONLY)
// =========================================================================
async function checkForUpdatesSilent() {
  if (!mainWindow || hasEmittedUpdateThisSession) return;

  // 1. If electron-updater is available and packaged as NSIS installer
  if (autoUpdater && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR) {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      console.log('[AutoUpdater] NSIS check notice:', err.message);
    }
    return;
  }

  // 2. Direct GitHub Releases API verification (works in Portable EXE & Unpacked)
  if (app.isPackaged) {
    checkGitHubReleasesDirect();
  }
}

function checkGitHubReleasesDirect(token) {
  if (hasEmittedUpdateThisSession) return;
  const currentVersion = app.getVersion();
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  const headers = {
    'User-Agent': 'Fahgit-Desktop-App',
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  https
    .get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) return;
          const release = JSON.parse(data);

          // Tolak draft atau prerelease
          if (!release || release.draft || release.prerelease) return;

          const latestVersion = String(release.tag_name || '').replace(/^v/i, '').trim();
          if (!isStrictSemver(latestVersion)) return;

          // Wajib lebih baru dari baseline v1.0.0 saat ini DAN terbit setelah tanggal baseline
          if (!isNewerVersion(currentVersion, latestVersion)) return;
          if (!isReleaseAfterBaseline(release.published_at)) return;

          // Wajib memiliki aset Windows (.exe) yang valid
          const assets = Array.isArray(release.assets) ? release.assets : [];
          const installerAsset = assets.find((a) => a.name && a.name.endsWith('.exe') && !a.name.includes('Portable'));
          const portableAsset = assets.find((a) => a.name && a.name.includes('Portable') && a.name.endsWith('.exe'));
          const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
          const targetAsset = isPortable ? (portableAsset || installerAsset) : (installerAsset || portableAsset);

          if (!targetAsset) return;

          const updateInfo = {
            currentVersion,
            latestVersion,
            releaseName: release.name || `Fahgit v${latestVersion}`,
            releaseNotes: sanitizeReleaseNotes(release.body),
            releaseDate: release.published_at,
            downloadUrl: targetAsset.browser_download_url,
            downloadSize: targetAsset.size || 0,
            isPortable,
          };

          emitUpdateAvailableOnce(updateInfo);
        } catch {
          // ignore parsing error
        }
      });
    })
    .on('error', (err) => {
      console.log('[AutoUpdater] Direct check error:', err.message);
    });
}

function isNewerVersion(current, target) {
  if (!current || !target) return false;
  const cleanCurrent = String(current).replace(/^v/i, '').trim();
  const cleanTarget = String(target).replace(/^v/i, '').trim();
  if (!isStrictSemver(cleanCurrent) || !isStrictSemver(cleanTarget)) return false;

  const c = cleanCurrent.split('.').map(Number);
  const t = cleanTarget.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const cur = c[i] || 0;
    const tar = t[i] || 0;
    if (tar > cur) return true;
    if (tar < cur) return false;
  }
  return false;
}

// Setup electron-updater event forwarding if available
if (autoUpdater) {
  autoUpdater.on('update-available', (info) => {
    const currentVersion = app.getVersion();
    const latestVersion = String(info?.version || '').replace(/^v/i, '').trim();

    if (!isNewerVersion(currentVersion, latestVersion)) return;
    if (!isReleaseAfterBaseline(info?.releaseDate)) return;

    const rawNotes = Array.isArray(info?.releaseNotes)
      ? info.releaseNotes.map((n) => (typeof n === 'string' ? n : n.note || '')).join('\n')
      : typeof info?.releaseNotes === 'string'
      ? info.releaseNotes
      : '';

    emitUpdateAvailableOnce({
      currentVersion,
      latestVersion,
      releaseName: info.releaseName || `Fahgit v${latestVersion}`,
      releaseNotes: sanitizeReleaseNotes(rawNotes),
      releaseDate: info.releaseDate || new Date().toISOString(),
      downloadSize: 0,
      isPortable: Boolean(process.env.PORTABLE_EXECUTABLE_DIR),
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('desktop:download-progress', {
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('desktop:update-downloaded', {
        version: info.version,
      });
    }
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('desktop:update-error', err.message || 'Gagal memeriksa pembaruan');
    }
  });
}

// =========================================================================
// IPC HANDLERS
// =========================================================================
ipcMain.handle('desktop:get-app-info', () => {
  return {
    name: 'Fahgit',
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    isPortable: Boolean(process.env.PORTABLE_EXECUTABLE_DIR),
    userDataPath: app.getPath('userData'),
  };
});

ipcMain.handle('desktop:check-updates', async (event, token) => {
  // Hanya izinkan 1 kali pengecekan startup per sesi aplikasi
  if (hasPerformedStartupUpdateCheck || hasEmittedUpdateThisSession) {
    return { status: 'already-checked' };
  }
  hasPerformedStartupUpdateCheck = true;

  if (autoUpdater && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR) {
    try {
      if (token) {
        autoUpdater.requestHeaders = { Authorization: `token ${token}` };
      }
      await autoUpdater.checkForUpdates();
      return { status: 'checking' };
    } catch (err) {
      checkGitHubReleasesDirect(token);
      return { status: 'fallback', message: err.message };
    }
  } else if (app.isPackaged) {
    checkGitHubReleasesDirect(token);
    return { status: 'checking-direct' };
  }
  return { status: 'dev-skipped' };
});

ipcMain.handle('desktop:start-download', async () => {
  if (autoUpdater && app.isPackaged && !process.env.PORTABLE_EXECUTABLE_DIR) {
    try {
      await autoUpdater.downloadUpdate();
      return { status: 'downloading' };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }
  return { status: 'use-browser' };
});

ipcMain.handle('desktop:install-update', () => {
  if (autoUpdater && app.isPackaged) {
    autoUpdater.quitAndInstall(false, true);
  }
});

ipcMain.handle('desktop:check-connection', async () => {
  return await checkNetworkConnectivity();
});

ipcMain.handle('desktop:open-external', async (event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
