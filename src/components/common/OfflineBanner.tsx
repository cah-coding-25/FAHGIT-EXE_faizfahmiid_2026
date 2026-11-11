/**
 * FAHGIT - Status Koneksi & Banner Adaptif Offline
 * By: Faiz_Fahmi_ID
 *
 * Menginformasikan status koneksi secara non-intrusif:
 * - Menjelaskan fitur lokal yang tetap aktif (Editor, Ekstraktor ZIP, Vault Lokal)
 * - Menjelaskan fitur yang membutuhkan internet (Push commit, Buat repo, Sinkronisasi)
 * - Tombol coba sambung ulang instan
 */

import React, { useState, useEffect } from 'react';
import { offlineSyncEngine, ConnectionState } from '../../services/offlineSync';
import { WifiOff, RefreshCw, CheckCircle2, ShieldCheck, CloudOff, Info } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('online');
  const [isApiReachable, setIsApiReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubConn = offlineSyncEngine.subscribeConnection((state, reachable) => {
      setConnectionState(state);
      setIsApiReachable(reachable);
      if (state === 'online') {
        setIsDismissed(false);
      }
    });

    const unsubQueue = offlineSyncEngine.subscribeQueue((queue) => {
      setPendingCount(queue.length);
    });

    return () => {
      unsubConn();
      unsubQueue();
    };
  }, []);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      await offlineSyncEngine.verifyConnection();
    } finally {
      setIsChecking(false);
    }
  };

  const isOffline = connectionState === 'offline' || !isApiReachable;

  if (!isOffline || isDismissed) {
    return null;
  }

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 transition-all animate-in slide-in-from-top duration-300">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="font-bold">Mode Offline Adaptif Aktif</strong>
              {pendingCount > 0 && (
                <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-amber-500/25 border border-amber-500/40">
                  {pendingCount} antrean tersimpan lokal
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
              Fitur lokal (Editor Monaco, Ekstraktor ZIP, Vault token) tetap aktif. Fitur sinkronisasi GitHub akan otomatis dilanjutkan saat internet kembali.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleRetry}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 text-[11px] font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Memeriksa...' : 'Coba Sambungkan'}</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-white px-2 py-1 text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
