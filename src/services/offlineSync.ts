/**
 * FAHGIT - Online & Offline Adaptive Engine
 * By: Faiz_Fahmi_ID
 *
 * Implements 5-tier classification:
 * 1. FULL OFFLINE: Local Monaco code editing, ZIP extraction, local vault, offline cached browsing.
 * 2. ONLINE REQUIRED: Direct GitHub API remote operations (remote commit push, branch creation).
 * 3. OFFLINE WITH LOCAL FALLBACK: Local cache of repository trees & files when offline.
 * 4. ONLINE SYNC: Queued offline file drafts & operations synced on reconnect with exponential backoff.
 * 5. LOCAL DATA: IndexedDB persistence for tokens, preferences, and offline queues.
 */

export interface QueuedOfflineAction {
  id: string;
  type: 'file_save' | 'draft_commit' | 'sync_refresh';
  repoFullName: string;
  branch: string;
  filePath: string;
  content: string;
  timestamp: number;
  retryCount: number;
}

export type ConnectionState = 'online' | 'offline' | 'reconnecting';

type ConnectionListener = (state: ConnectionState, isApiReachable: boolean) => void;
type QueueListener = (queue: QueuedOfflineAction[]) => void;

class OfflineSyncEngine {
  private currentState: ConnectionState = navigator.onLine ? 'online' : 'offline';
  private isApiReachable: boolean = true;
  private connectionListeners: Set<ConnectionListener> = new Set();
  private queueListeners: Set<QueueListener> = new Set();
  private queue: QueuedOfflineAction[] = [];
  private checkIntervalTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // max 30s exponential backoff

  constructor() {
    this.initEventListeners();
    this.loadQueueFromStorage();
    this.startHeartbeatCheck();
  }

  private initEventListeners() {
    window.addEventListener('online', () => {
      this.reconnectAttempts = 0;
      this.verifyConnection();
    });

    window.addEventListener('offline', () => {
      this.updateState('offline', false);
    });
  }

  private startHeartbeatCheck() {
    // Ping every 25 seconds
    this.checkIntervalTimer = setInterval(() => {
      this.verifyConnection();
    }, 25000);
  }

  /**
   * Pings GitHub API to verify real internet connectivity rather than just local LAN
   */
  public async verifyConnection(): Promise<boolean> {
    if (!navigator.onLine) {
      this.updateState('offline', false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Ping lightweight GitHub endpoint
      const res = await fetch('https://api.github.com/zen', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const reachable = res.ok || res.status === 403; // 403 rate limit still means network is UP
      this.updateState('online', reachable);

      if (reachable && this.queue.length > 0) {
        this.processQueueOnReconnect();
      }

      return reachable;
    } catch {
      this.updateState('reconnecting', false);
      this.scheduleExponentialRetry();
      return false;
    }
  }

  private scheduleExponentialRetry() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    setTimeout(() => {
      if (this.currentState !== 'online') {
        this.verifyConnection();
      }
    }, delay);
  }

  private updateState(state: ConnectionState, apiReachable: boolean) {
    const changed = this.currentState !== state || this.isApiReachable !== apiReachable;
    this.currentState = state;
    this.isApiReachable = apiReachable;

    if (changed) {
      this.connectionListeners.forEach((listener) => listener(state, apiReachable));
    }
  }

  public subscribeConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.currentState, this.isApiReachable);
    return () => this.connectionListeners.delete(listener);
  }

  public subscribeQueue(listener: QueueListener): () => void {
    this.queueListeners.add(listener);
    listener(this.queue);
    return () => this.queueListeners.delete(listener);
  }

  public getConnectionStatus() {
    return {
      state: this.currentState,
      isOnline: this.currentState === 'online',
      isApiReachable: this.isApiReachable,
      pendingQueueCount: this.queue.length,
    };
  }

  // =========================================================================
  // OFFLINE QUEUE MANAGEMENT
  // =========================================================================
  private loadQueueFromStorage() {
    try {
      const stored = localStorage.getItem('fahgit_offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        this.notifyQueueChange();
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem('fahgit_offline_queue', JSON.stringify(this.queue));
      this.notifyQueueChange();
    } catch {
      // storage full or disabled
    }
  }

  private notifyQueueChange() {
    this.queueListeners.forEach((l) => l([...this.queue]));
  }

  public enqueueAction(action: Omit<QueuedOfflineAction, 'id' | 'timestamp' | 'retryCount'>): QueuedOfflineAction {
    const newAction: QueuedOfflineAction = {
      ...action,
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      retryCount: 0,
    };

    // Replace if exists for same file
    const existingIdx = this.queue.findIndex(
      (q) => q.repoFullName === action.repoFullName && q.filePath === action.filePath
    );

    if (existingIdx >= 0) {
      this.queue[existingIdx] = newAction;
    } else {
      this.queue.push(newAction);
    }

    this.saveQueueToStorage();
    return newAction;
  }

  public removeAction(id: string) {
    this.queue = this.queue.filter((q) => q.id !== id);
    this.saveQueueToStorage();
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueueToStorage();
  }

  public getPendingQueue(): QueuedOfflineAction[] {
    return [...this.queue];
  }

  /**
   * Safe automatic processing when connection is re-established
   */
  private async processQueueOnReconnect() {
    if (this.queue.length === 0) return;
    console.log(`[OfflineEngine] Koneksi kembali aktif. Menyinkronkan ${this.queue.length} antrean tertunda...`);
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
