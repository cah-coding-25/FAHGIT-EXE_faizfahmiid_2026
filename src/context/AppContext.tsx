/**
 * FAHGIT Application Context
 * Central reactive state orchestrator for authentication, repositories, file tree, code editor, and UI notifications.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AppView,
  GitHubUser,
  GitHubRepo,
  GitHubBranch,
  GitTreeItem,
  EditorTab,
  RateLimitInfo,
  ActivityLog,
  AppSettings,
  EncryptedCredential,
} from '../types';
import {
  validateToken,
  getUserRepos,
  getBranches,
  getGitTree,
  getBlob,
  saveFile,
  GitHubApiError,
} from '../services/github';
import {
  encryptToken,
  decryptToken,
} from '../services/crypto';
import {
  saveEncryptedCredential,
  getEncryptedCredential,
  clearEncryptedCredential,
  saveSimpleToken,
  getSimpleToken,
  clearSimpleToken,
  addActivityLog,
  getActivityLogs,
  getFavorites,
  saveFavorites,
  getRecentFiles,
  recordRecentFile,
  RecentFileRecord,
  getAppSettings,
  saveAppSettings,
  purgeAllLocalData,
  DEFAULT_SETTINGS,
} from '../services/storage';
import {
  getMonacoLanguage,
  isBinaryFile,
  base64ToUtf8,
  utf8ToBase64,
  getMimeType,
} from '../utils/fileUtils';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  timestamp: number;
}

interface AppContextValue {
  view: AppView;
  setView: (view: AppView) => void;
  // Connection & Auth
  token: string | null;
  user: GitHubUser | null;
  scopes: string[];
  rateLimit: RateLimitInfo | undefined;
  isConnected: boolean;
  isLocked: boolean;
  vaultInfo: EncryptedCredential | null;
  isVerifying: boolean;
  // Repositories
  repos: GitHubRepo[];
  isLoadingRepos: boolean;
  activeRepo: GitHubRepo | null;
  activeBranch: string;
  branches: GitHubBranch[];
  isLoadingBranches: boolean;
  // File Tree
  treeItems: GitTreeItem[];
  isLoadingTree: boolean;
  currentPath: string;
  setCurrentPath: (path: string) => void;
  // Code Editor
  editorTabs: EditorTab[];
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  updateTabContent: (tabId: string, content: string) => void;
  openInEditor: (path: string, sha: string) => Promise<void>;
  closeEditorTab: (tabId: string) => void;
  saveActiveEditorTab: (commitMessage: string) => Promise<boolean>;
  // Favorites & Recents
  favorites: { repos: string[]; files: string[] };
  toggleFavoriteRepo: (fullName: string) => Promise<void>;
  toggleFavoriteFile: (filePath: string) => Promise<void>;
  recentFiles: RecentFileRecord[];
  // Logs & Settings
  activityLogs: ActivityLog[];
  refreshActivityLogs: () => Promise<void>;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  // Notifications
  notifications: ToastNotification[];
  notify: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
  removeNotification: (id: string) => void;
  // Actions
  connectSimple: (token: string, remember: boolean) => Promise<boolean>;
  connectWithToken: (token: string, passphrase: string, remember: boolean) => Promise<boolean>;
  unlockVault: (passphrase: string) => Promise<boolean>;
  lockApplication: () => void;
  disconnectGitHub: (forgetVault: boolean) => Promise<void>;
  refreshConnection: () => Promise<void>;
  selectRepo: (repo: GitHubRepo) => Promise<void>;
  selectBranch: (branchName: string) => Promise<void>;
  refreshTree: () => Promise<void>;
  refreshRepos: () => Promise<GitHubRepo[]>;
  removeRepoLocally: (repo: GitHubRepo) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [view, setView] = useState<AppView>('dashboard');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | undefined>();
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [vaultInfo, setVaultInfo] = useState<EncryptedCredential | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  const [activeRepo, setActiveRepo] = useState<GitHubRepo | null>(null);
  const [activeBranch, setActiveBranch] = useState<string>('');
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);

  const [treeItems, setTreeItems] = useState<GitTreeItem[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string>('');

  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<{ repos: string[]; files: string[] }>({ repos: [], files: [] });
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const isConnected = !!token && !!user;

  // Notifikasi dinonaktifkan sepenuhnya agar antarmuka selalu bersih dan rapi tanpa popup
  const notify = useCallback((_type: 'success' | 'error' | 'info' | 'warning', _message: string, _title?: string) => {
    // Silent - tidak ada notifikasi popup
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Refresh activity logs from IndexedDB
  const refreshActivityLogs = useCallback(async () => {
    const logs = await getActivityLogs();
    setActivityLogs(logs);
  }, []);

  // Initialize on mount: check IndexedDB vault, settings, favorites, recents
  useEffect(() => {
    async function initStorage() {
      try {
        const loadedSettings = await getAppSettings();
        setSettings(loadedSettings);
        if (loadedSettings.theme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }

        const favs = await getFavorites();
        setFavorites(favs);

        const recents = await getRecentFiles();
        setRecentFiles(recents);

        const logs = await getActivityLogs();
        setActivityLogs(logs);

        // Check if a saved token exists for instant auto-connect
        const savedToken = getSimpleToken();
        if (savedToken) {
          try {
            const validation = await validateToken(savedToken);
            if (validation.valid && validation.user) {
              setToken(savedToken);
              setUser(validation.user);
              setScopes(validation.scopes);
              setRateLimit(validation.rateLimit);
              setIsLocked(false);
              setView('dashboard');

              // Load repos
              getUserRepos(savedToken).then((userRepos) => setRepos(userRepos)).catch(() => {});
              return;
            }
          } catch {
            // Token expired or invalid, continue
          }
        }

        // Check if an encrypted vault exists
        const storedVault = await getEncryptedCredential();
        if (storedVault) {
          setVaultInfo(storedVault);
          setIsLocked(true);
          setView('connection');
        } else {
          setView('connection');
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    initStorage();
  }, []);

  // Beginner-friendly, super simple 1-click token connection
  const connectSimple = useCallback(
    async (rawToken: string, remember: boolean): Promise<boolean> => {
      setIsVerifying(true);
      try {
        const cleanToken = rawToken.trim();
        const validation = await validateToken(cleanToken);
        if (!validation.valid || !validation.user) {
          notify('error', validation.error || 'Token GitHub tidak valid. Pastikan token sudah benar.', 'Gagal Terhubung');
          return false;
        }

        setToken(cleanToken);
        setUser(validation.user);
        setScopes(validation.scopes);
        setRateLimit(validation.rateLimit);
        setIsLocked(false);

        if (remember) {
          saveSimpleToken(cleanToken);
        } else {
          clearSimpleToken();
        }

        await addActivityLog({
          action: 'CONNECTED',
          status: 'SUCCESS',
          details: `Terhubung sebagai @${validation.user.login}`,
        });
        refreshActivityLogs();

        notify('success', `Selamat datang, @${validation.user.login}! Berhasil terhubung.`, 'Sukses');
        setView('dashboard');

        // Load repositories immediately
        setIsLoadingRepos(true);
        try {
          const userRepos = await getUserRepos(cleanToken);
          setRepos(userRepos);
        } finally {
          setIsLoadingRepos(false);
        }

        return true;
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Koneksi gagal', 'Error');
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [notify, refreshActivityLogs]
  );

  // Connect using a plain PAT (encrypts to IndexedDB if remember is true)
  const connectWithToken = useCallback(
    async (rawToken: string, passphrase: string, remember: boolean): Promise<boolean> => {
      setIsVerifying(true);
      try {
        const validation = await validateToken(rawToken);
        if (!validation.valid || !validation.user) {
          notify('error', validation.error || 'Failed to authenticate token with GitHub', 'Authentication Failed');
          return false;
        }

        setToken(rawToken);
        setUser(validation.user);
        setScopes(validation.scopes);
        setRateLimit(validation.rateLimit);
        setIsLocked(false);

        // Encrypt and persist to IndexedDB
        if (remember) {
          const encrypted = await encryptToken(rawToken, passphrase);
          const credentialRecord: EncryptedCredential = {
            id: 'active_token',
            ...encrypted,
            updatedAt: new Date().toISOString(),
          };
          await saveEncryptedCredential(credentialRecord);
          setVaultInfo(credentialRecord);
        } else {
          await clearEncryptedCredential();
          setVaultInfo(null);
        }

        await addActivityLog({
          action: 'CONNECTED',
          status: 'SUCCESS',
          details: `Connected as @${validation.user.login} (${validation.scopes.join(', ') || 'no scopes'})`,
        });
        refreshActivityLogs();

        notify('success', `Welcome, @${validation.user.login}! Authenticated with GitHub.`, 'Connected');
        setView('dashboard');

        // Load repositories immediately
        setIsLoadingRepos(true);
        try {
          const userRepos = await getUserRepos(rawToken);
          setRepos(userRepos);
        } finally {
          setIsLoadingRepos(false);
        }

        return true;
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Unknown connection error', 'Error');
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [notify, refreshActivityLogs]
  );

  // Unlock existing encrypted vault using passphrase
  const unlockVault = useCallback(
    async (passphrase: string): Promise<boolean> => {
      if (!vaultInfo) {
        notify('error', 'No encrypted credentials found in local storage.', 'Unlock Failed');
        return false;
      }

      setIsVerifying(true);
      try {
        const decryptedToken = await decryptToken(vaultInfo, passphrase);
        const validation = await validateToken(decryptedToken);
        if (!validation.valid || !validation.user) {
          notify('error', validation.error || 'Token is no longer valid on GitHub.', 'Verification Failed');
          return false;
        }

        setToken(decryptedToken);
        setUser(validation.user);
        setScopes(validation.scopes);
        setRateLimit(validation.rateLimit);
        setIsLocked(false);

        await addActivityLog({
          action: 'CONNECTED',
          status: 'SUCCESS',
          details: `Unlocked vault and reconnected as @${validation.user.login}`,
        });
        refreshActivityLogs();

        notify('success', `Vault unlocked successfully. Connected as @${validation.user.login}.`, 'Unlocked');
        setView('dashboard');

        // Fetch user repos
        setIsLoadingRepos(true);
        try {
          const userRepos = await getUserRepos(decryptedToken);
          setRepos(userRepos);
        } finally {
          setIsLoadingRepos(false);
        }

        return true;
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Incorrect passphrase.', 'Unlock Error');
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [vaultInfo, notify, refreshActivityLogs]
  );

  // Lock application: wipe token from RAM, lock view
  const lockApplication = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsLocked(true);
    setRepos([]);
    setActiveRepo(null);
    setTreeItems([]);
    setEditorTabs([]);
    setView('connection');
    notify('info', 'Application locked. Passphrase required to re-open.', 'Locked');
  }, [notify]);

  // Disconnect GitHub: optionally wipe vault from IndexedDB
  const disconnectGitHub = useCallback(
    async (forgetVault: boolean) => {
      setToken(null);
      setUser(null);
      setRepos([]);
      setActiveRepo(null);
      setTreeItems([]);
      setEditorTabs([]);

      clearSimpleToken();
      if (forgetVault) {
        await purgeAllLocalData();
        setVaultInfo(null);
        setIsLocked(false);
        setFavorites({ repos: [], files: [] });
        setRecentFiles([]);
        setActivityLogs([]);
        notify('info', 'Disconnected and all local credentials purged.', 'Disconnected');
      } else {
        setIsLocked(false);
        notify('info', 'Disconnected from GitHub session.', 'Disconnected');
      }

      await addActivityLog({
        action: 'DISCONNECTED',
        status: 'INFO',
        details: forgetVault ? 'User purged all local credentials' : 'User disconnected current session',
      });
      refreshActivityLogs();

      setView('connection');
    },
    [notify, refreshActivityLogs]
  );

  // Re-verify connection and update rate limits
  const refreshConnection = useCallback(async () => {
    if (!token) return;
    setIsVerifying(true);
    try {
      const validation = await validateToken(token);
      if (validation.valid && validation.user) {
        setUser(validation.user);
        setScopes(validation.scopes);
        setRateLimit(validation.rateLimit);
        notify('success', 'GitHub connection verified & active.', 'Connection Status');
      } else {
        notify('error', validation.error || 'Token expired or invalid.', 'Status');
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to refresh connection', 'Error');
    } finally {
      setIsVerifying(false);
    }
  }, [token, notify]);

  // Refresh repository list
  const refreshRepos = useCallback(async (): Promise<GitHubRepo[]> => {
    if (!token) return [];
    setIsLoadingRepos(true);
    try {
      const userRepos = await getUserRepos(token);
      setRepos(userRepos);
      setActiveRepo((currentActive) => {
        if (currentActive && !userRepos.some((r) => r.id === currentActive.id)) {
          setBranches([]);
          setActiveBranch('');
          setTreeItems([]);
          setCurrentPath('');
          return null;
        }
        return currentActive;
      });
      return userRepos;
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to refresh repositories', 'Error');
      return [];
    } finally {
      setIsLoadingRepos(false);
    }
  }, [token, notify]);

  // Immediately purge deleted repository from active UI state and activity logs
  const removeRepoLocally = useCallback(
    async (deletedRepo: GitHubRepo) => {
      setRepos((prev) => prev.filter((r) => r.id !== deletedRepo.id));

      if (activeRepo?.id === deletedRepo.id) {
        setActiveRepo(null);
        setBranches([]);
        setActiveBranch('');
        setTreeItems([]);
        setCurrentPath('');
      }

      setEditorTabs((prev) => {
        const remaining = prev.filter((t) => !t.id.startsWith(`${deletedRepo.full_name}:`));
        if (activeTabId && !remaining.some((t) => t.id === activeTabId)) {
          setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
        }
        return remaining;
      });

      if (favorites.repos.includes(deletedRepo.full_name)) {
        const updatedFavs = {
          ...favorites,
          repos: favorites.repos.filter((r) => r !== deletedRepo.full_name),
        };
        setFavorites(updatedFavs);
        await saveFavorites(updatedFavs);
      }

      await addActivityLog({
        action: 'REPO_DELETED',
        repo: deletedRepo.full_name,
        status: 'SUCCESS',
        details: `Menghapus permanen repositori ${deletedRepo.full_name}`,
      });
      refreshActivityLogs();
    },
    [activeRepo, activeTabId, favorites, refreshActivityLogs]
  );

  // Select a repository and load its branches and root tree
  const selectRepo = useCallback(
    async (repo: GitHubRepo) => {
      if (!token) return;
      setActiveRepo(repo);
      setCurrentPath('');
      setIsLoadingBranches(true);

      try {
        const repoBranches = await getBranches(token, repo.owner.login, repo.name);
        setBranches(repoBranches);
        const defaultBranchName = repo.default_branch || (repoBranches.length > 0 ? repoBranches[0].name : 'main');
        setActiveBranch(defaultBranchName);

        // Fetch tree for default branch
        setIsLoadingTree(true);
        try {
          const treeData = await getGitTree(token, repo.owner.login, repo.name, defaultBranchName);
          setTreeItems(treeData.tree || []);
        } catch (treeErr) {
          // If empty repository, tree might be empty
          setTreeItems([]);
        } finally {
          setIsLoadingTree(false);
        }

        await addActivityLog({
          action: 'REPO_OPENED',
          repo: repo.full_name,
          status: 'INFO',
          details: `Switched active repository to ${repo.full_name}`,
        });
        refreshActivityLogs();
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Failed to load repository branches', 'Error');
      } finally {
        setIsLoadingBranches(false);
      }
    },
    [token, notify, refreshActivityLogs]
  );

  // Switch branch
  const selectBranch = useCallback(
    async (branchName: string) => {
      if (!token || !activeRepo) return;
      setActiveBranch(branchName);
      setIsLoadingTree(true);
      try {
        const treeData = await getGitTree(token, activeRepo.owner.login, activeRepo.name, branchName);
        setTreeItems(treeData.tree || []);
        await addActivityLog({
          action: 'BRANCH_SWITCHED',
          repo: activeRepo.full_name,
          target: branchName,
          status: 'INFO',
          details: `Switched branch to ${branchName}`,
        });
        refreshActivityLogs();
      } catch (err) {
        notify('error', err instanceof Error ? err.message : `Failed to switch branch to ${branchName}`, 'Error');
      } finally {
        setIsLoadingTree(false);
      }
    },
    [token, activeRepo, notify, refreshActivityLogs]
  );

  // Refresh current tree
  const refreshTree = useCallback(async () => {
    if (!token || !activeRepo || !activeBranch) return;
    setIsLoadingTree(true);
    try {
      const treeData = await getGitTree(token, activeRepo.owner.login, activeRepo.name, activeBranch);
      setTreeItems(treeData.tree || []);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to refresh tree', 'Error');
    } finally {
      setIsLoadingTree(false);
    }
  }, [token, activeRepo, activeBranch, notify]);

  // Open file in Monaco Code Editor
  const openInEditor = useCallback(
    async (path: string, sha: string) => {
      if (!token || !activeRepo) return;

      const fileName = path.split('/').pop() || path;
      const tabId = `${activeRepo.full_name}:${path}`;

      // Check if already open
      const existingTab = editorTabs.find((t) => t.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
        setView('code-editor');
        return;
      }

      // Check if binary
      const isBin = isBinaryFile(fileName);
      const language = getMonacoLanguage(fileName);

      try {
        const blobData = await getBlob(token, activeRepo.owner.login, activeRepo.name, sha);

        let decodedContent = '';
        if (!isBin) {
          try {
            decodedContent = base64ToUtf8(blobData.content);
          } catch {
            decodedContent = atob(blobData.content);
          }
        }

        const newTab: EditorTab = {
          id: tabId,
          path,
          name: fileName,
          content: decodedContent,
          originalContent: decodedContent,
          sha,
          isDirty: false,
          language,
          isBinary: isBin,
          binaryMime: getMimeType(fileName),
        };

        setEditorTabs((prev) => [...prev, newTab]);
        setActiveTabId(tabId);
        setView('code-editor');

        // Record in recent files
        await recordRecentFile(activeRepo.full_name, path);
        const recents = await getRecentFiles();
        setRecentFiles(recents);
      } catch (err) {
        notify('error', err instanceof Error ? err.message : `Failed to load content of ${fileName}`, 'Error');
      }
    },
    [token, activeRepo, editorTabs, notify]
  );

  const closeEditorTab = useCallback(
    (tabId: string) => {
      setEditorTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
        }
        return remaining;
      });
    },
    [activeTabId]
  );

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setEditorTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          return {
            ...t,
            content,
            isDirty: content !== t.originalContent,
          };
        }
        return t;
      })
    );
  }, []);

  // Save active editor tab via GitHub Contents API
  const saveActiveEditorTab = useCallback(
    async (commitMessage: string): Promise<boolean> => {
      if (!token || !activeRepo || !activeTabId) return false;
      const tab = editorTabs.find((t) => t.id === activeTabId);
      if (!tab) return false;

      try {
        const contentBase64 = utf8ToBase64(tab.content);
        const result = await saveFile(
          token,
          activeRepo.owner.login,
          activeRepo.name,
          tab.path,
          contentBase64,
          commitMessage || `Update ${tab.path}`,
          activeBranch,
          tab.sha
        );

        const newSha = result.content.sha;

        // Update tab state
        setEditorTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId
              ? {
                  ...t,
                  sha: newSha,
                  originalContent: t.content,
                  isDirty: false,
                }
              : t
          )
        );

        await addActivityLog({
          action: 'FILE_EDITED',
          repo: activeRepo.full_name,
          target: tab.path,
          status: 'SUCCESS',
          details: `Committed update to ${tab.path} (${commitMessage})`,
        });
        refreshActivityLogs();

        // Refresh file tree
        refreshTree();

        notify('success', `Saved ${tab.name} successfully to ${activeBranch}!`, 'File Saved');
        return true;
      } catch (err) {
        if (err instanceof GitHubApiError && err.status === 409) {
          notify(
            'error',
            'Conflict detected: This file has changed on GitHub since you opened it. Please refresh the file before saving.',
            'Merge Conflict'
          );
        } else {
          notify('error', err instanceof Error ? err.message : 'Failed to save file to GitHub', 'Save Error');
        }
        return false;
      }
    },
    [token, activeRepo, activeTabId, editorTabs, activeBranch, notify, refreshActivityLogs, refreshTree]
  );

  // Favorites
  const toggleFavoriteRepo = useCallback(
    async (fullName: string) => {
      const current = { ...favorites };
      if (current.repos.includes(fullName)) {
        current.repos = current.repos.filter((r) => r !== fullName);
      } else {
        current.repos.push(fullName);
      }
      setFavorites(current);
      await saveFavorites(current);
    },
    [favorites]
  );

  const toggleFavoriteFile = useCallback(
    async (filePath: string) => {
      const current = { ...favorites };
      if (current.files.includes(filePath)) {
        current.files = current.files.filter((f) => f !== filePath);
      } else {
        current.files.push(filePath);
      }
      setFavorites(current);
      await saveFavorites(current);
    },
    [favorites]
  );

  // Settings
  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = await saveAppSettings(newSettings);
    setSettings(updated);
    if (updated.theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        token,
        user,
        scopes,
        rateLimit,
        isConnected,
        isLocked,
        vaultInfo,
        isVerifying,
        repos,
        isLoadingRepos,
        activeRepo,
        activeBranch,
        branches,
        isLoadingBranches,
        treeItems,
        isLoadingTree,
        currentPath,
        setCurrentPath,
        editorTabs,
        activeTabId,
        setActiveTabId,
        updateTabContent,
        openInEditor,
        closeEditorTab,
        saveActiveEditorTab,
        favorites,
        toggleFavoriteRepo,
        toggleFavoriteFile,
        recentFiles,
        activityLogs,
        refreshActivityLogs,
        settings,
        updateSettings,
        notifications,
        notify,
        removeNotification,
        connectSimple,
        connectWithToken,
        unlockVault,
        lockApplication,
        disconnectGitHub,
        refreshConnection,
        selectRepo,
        selectBranch,
        refreshTree,
        refreshRepos,
        removeRepoLocally,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
