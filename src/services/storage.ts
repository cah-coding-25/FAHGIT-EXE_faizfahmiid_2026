/**
 * FAHGIT IndexedDB Storage Manager
 * Stores encrypted token vault, activity logs, favorite repos, and recent files locally in the browser.
 */

import { EncryptedCredential, ActivityLog, AppSettings } from '../types';

const DB_NAME = 'fahgit_local_db';
const DB_VERSION = 1;

const STORES = {
  VAULT: 'vault',
  ACTIVITY_LOGS: 'activity_logs',
  FAVORITES: 'favorites',
  RECENT_FILES: 'recent_files',
  SETTINGS: 'settings',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  autoLockMinutes: 30,
  monacoTheme: 'vs-dark',
  monacoFontSize: 14,
  wordWrap: 'on',
  minimap: true,
  rememberEncryptedToken: true,
  defaultCommitMessage: 'Update from FAHGIT',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.VAULT)) {
        db.createObjectStore(STORES.VAULT, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ACTIVITY_LOGS)) {
        const logStore = db.createObjectStore(STORES.ACTIVITY_LOGS, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
        db.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.RECENT_FILES)) {
        db.createObjectStore(STORES.RECENT_FILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Vault Credentials Operations
export async function saveEncryptedCredential(credential: EncryptedCredential): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VAULT, 'readwrite');
    const store = tx.objectStore(STORES.VAULT);
    const req = store.put(credential);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getEncryptedCredential(): Promise<EncryptedCredential | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VAULT, 'readonly');
    const store = tx.objectStore(STORES.VAULT);
    const req = store.get('active_token');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearEncryptedCredential(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VAULT, 'readwrite');
    const store = tx.objectStore(STORES.VAULT);
    const req = store.delete('active_token');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Simple direct token storage for beginner-friendly automatic login
const SIMPLE_TOKEN_KEY = 'fahgit_saved_token';

export function saveSimpleToken(token: string): void {
  try {
    localStorage.setItem(SIMPLE_TOKEN_KEY, btoa(token.trim()));
  } catch (e) {
    console.error('Failed to save token to local storage', e);
  }
}

export function getSimpleToken(): string | null {
  try {
    const raw = localStorage.getItem(SIMPLE_TOKEN_KEY);
    if (!raw) return null;
    return atob(raw);
  } catch (e) {
    return null;
  }
}

export function clearSimpleToken(): void {
  try {
    localStorage.removeItem(SIMPLE_TOKEN_KEY);
  } catch (e) {
    console.error('Failed to clear token', e);
  }
}

// Activity Logs Operations
export async function addActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
  const fullLog: ActivityLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.ACTIVITY_LOGS, 'readwrite');
    const store = tx.objectStore(STORES.ACTIVITY_LOGS);
    store.put(fullLog);
  } catch (err) {
    console.error('Failed to save activity log:', err);
  }

  return fullLog;
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ACTIVITY_LOGS, 'readonly');
    const store = tx.objectStore(STORES.ACTIVITY_LOGS);
    const req = store.getAll();
    req.onsuccess = () => {
      const logs: ActivityLog[] = req.result || [];
      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(logs.slice(0, 200)); // Keep latest 200 logs
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearActivityLogs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ACTIVITY_LOGS, 'readwrite');
    const store = tx.objectStore(STORES.ACTIVITY_LOGS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Favorites Operations (Repositories and Files)
export async function getFavorites(): Promise<{ repos: string[]; files: string[] }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FAVORITES, 'readonly');
    const store = tx.objectStore(STORES.FAVORITES);
    const req = store.get('user_favorites');
    req.onsuccess = () => {
      resolve(req.result?.data || { repos: [], files: [] });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveFavorites(data: { repos: string[]; files: string[] }): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FAVORITES, 'readwrite');
    const store = tx.objectStore(STORES.FAVORITES);
    const req = store.put({ id: 'user_favorites', data });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Recent Files Operations
export interface RecentFileRecord {
  id: string; // `${repo}:${path}`
  repo: string;
  path: string;
  name: string;
  lastOpened: string;
}

export async function getRecentFiles(): Promise<RecentFileRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECENT_FILES, 'readonly');
    const store = tx.objectStore(STORES.RECENT_FILES);
    const req = store.getAll();
    req.onsuccess = () => {
      const records: RecentFileRecord[] = req.result || [];
      records.sort((a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime());
      resolve(records.slice(0, 50));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function recordRecentFile(repo: string, path: string): Promise<void> {
  const db = await openDB();
  const name = path.split('/').pop() || path;
  const record: RecentFileRecord = {
    id: `${repo}:${path}`,
    repo,
    path,
    name,
    lastOpened: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECENT_FILES, 'readwrite');
    const store = tx.objectStore(STORES.RECENT_FILES);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Settings Operations
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const req = store.get('app_config');
      req.onsuccess = () => {
        resolve({ ...DEFAULT_SETTINGS, ...(req.result?.data || {}) });
      };
      req.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const merged = { ...current, ...settings };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = tx.objectStore(STORES.SETTINGS);
    const req = store.put({ key: 'app_config', data: merged });
    req.onsuccess = () => resolve(merged);
    req.onerror = () => reject(req.error);
  });
}

// Entire Database Purge (For Disconnect & Forget)
export async function purgeAllLocalData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([
      STORES.VAULT,
      STORES.ACTIVITY_LOGS,
      STORES.FAVORITES,
      STORES.RECENT_FILES,
    ], 'readwrite');

    tx.objectStore(STORES.VAULT).clear();
    tx.objectStore(STORES.ACTIVITY_LOGS).clear();
    tx.objectStore(STORES.FAVORITES).clear();
    tx.objectStore(STORES.RECENT_FILES).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
