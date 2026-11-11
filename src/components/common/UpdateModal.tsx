/**
 * FAHGIT - Pop-up Update Permanen (Wajib Bagian F)
 * By: Faiz_Fahmi_ID
 *
 * Menampilkan:
 * 1. Nama Aplikasi: FAHGIT by: Faiz_Fahmi_ID
 * 2. Versi Saat Ini vs Versi Terbaru
 * 3. Daftar Perubahan (Changelog)
 * 4. Tanggal Rilis & Ukuran Unduhan
 * 5. Tombol Wajib: UPDATE SEKARANG, LEWATI, SILANG (X)
 * 6. Progress bar pengunduhan & tombol Restart & Pasang
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UpdateInfoPayload, DownloadProgressPayload } from '../../types/electron';
import {
  Sparkles,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  HardDrive,
} from 'lucide-react';

export const UpdateModal: React.FC = () => {
  const { token } = useApp();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfoPayload | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressPayload | null>(null);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Trigger auto check with token for private or public repos
  useEffect(() => {
    if (window.electronAPI) {
      const timer = setTimeout(() => {
        window.electronAPI?.checkForUpdates(token || undefined);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [token]);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('fahgit_update_dismissed');

    // 1. Electron IPC Listener
    if (window.electronAPI) {
      const unsubAvailable = window.electronAPI.onUpdateAvailable((info) => {
        if (isDismissed === info.latestVersion) return;
        setUpdateInfo(info);
        setIsOpen(true);
      });

      const unsubProgress = window.electronAPI.onDownloadProgress((progress) => {
        setIsDownloading(true);
        setDownloadProgress(progress);
      });

      const unsubDownloaded = () => {
        setIsDownloading(false);
        setIsReadyToInstall(true);
      };
      const cleanupDownloaded = window.electronAPI.onUpdateDownloaded(unsubDownloaded);

      const unsubError = window.electronAPI.onUpdateError((err) => {
        setIsDownloading(false);
        setUpdateError(err);
      });

      return () => {
        unsubAvailable();
        unsubProgress();
        cleanupDownloaded();
        unsubError();
      };
    } else {
      // 2. Web / Browser direct check fallback
      const checkWebRelease = async () => {
        const endpoints = [
          'https://api.github.com/repos/ghfghjk94-hash/fahgirexe_update/releases/latest',
          'https://api.github.com/repos/FaizFahmiID/fahgit/releases/latest',
        ];
        let release = null;
        for (const ep of endpoints) {
          try {
            const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
            if (token) headers['Authorization'] = `token ${token}`;
            const res = await fetch(ep, { headers });
            if (res.ok) {
              release = await res.json();
              break;
            }
          } catch {
            // try next
          }
        }
        if (!release) return;
        const latestVersion = (release.tag_name || '').replace(/^v/, '');
        const currentVersion = '1.0.0';

        if (isDismissed === latestVersion) return;

        // Compare semver
        const c = currentVersion.split('.').map(Number);
        const t = latestVersion.split('.').map(Number);
        const isNewer = t[0] > c[0] || (t[0] === c[0] && t[1] > c[1]) || (t[0] === c[0] && t[1] === c[1] && t[2] > c[2]);

        if (isNewer) {
          setUpdateInfo({
            currentVersion,
            latestVersion,
            releaseName: release.name || `FAHGIT v${latestVersion}`,
            releaseNotes: release.body || 'Pembaruan aplikasi desktop & web.',
            releaseDate: release.published_at || new Date().toISOString(),
            downloadUrl: release.html_url,
            downloadSize: 0,
          });
          setIsOpen(true);
        }
      };

      checkWebRelease().catch(() => {});
    }
  }, []);

  const handleSkip = () => {
    if (updateInfo) {
      sessionStorage.setItem('fahgit_update_dismissed', updateInfo.latestVersion);
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleUpdateNow = async () => {
    if (window.electronAPI) {
      setIsDownloading(true);
      setUpdateError(null);
      const res = await window.electronAPI.startUpdateDownload();
      if (res && res.status === 'use-browser' && updateInfo?.downloadUrl) {
        window.electronAPI.openExternal(updateInfo.downloadUrl);
        setIsDownloading(false);
        setIsOpen(false);
      }
    } else if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer');
      setIsOpen(false);
    }
  };

  const handleInstallNow = async () => {
    if (window.electronAPI) {
      await window.electronAPI.installUpdate();
    }
  };

  if (!isOpen || !updateInfo) return null;

  const formattedDate = new Date(updateInfo.releaseDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return null;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="clay-card rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-5 relative overflow-hidden">
        {/* Glowing aura background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-500/15 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header with Title & SILANG (X) Button */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-mono font-black text-xl clay-button-rgb shadow-md shrink-0">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  UPDATE TERSEDIA
                </span>
                {updateInfo.isPortable && (
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    PORTABLE
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                FAHGIT by: Faiz_Fahmi_ID
              </h2>
            </div>
          </div>

          {/* TOMBOL SILANG (X) WAJIB */}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            title="Tutup Popup"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Comparison Badge Card */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs relative z-10">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Versi Saat Ini:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
              v{updateInfo.currentVersion}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30 font-mono text-xs">
            <span>Baru: v{updateInfo.latestVersion}</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Release Metadata (Date & Size) */}
        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 font-mono relative z-10">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{formattedDate}</span>
          </div>
          {formatSize(updateInfo.downloadSize) && (
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{formatSize(updateInfo.downloadSize)}</span>
            </div>
          )}
        </div>

        {/* Changelog / Release Notes */}
        <div className="space-y-2 relative z-10">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Catatan Rilis & Perubahan:</span>
          </h3>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* Download Progress Bar if downloading */}
        {isDownloading && (
          <div className="space-y-2 p-3 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 relative z-10">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 animate-bounce text-cyan-600 dark:text-cyan-400" />
                Mengunduh pembaruan...
              </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                {downloadProgress?.percent || 0}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress?.percent || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Ready to Install Notice */}
        {isReadyToInstall && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 relative z-10">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Pembaruan berhasil diunduh dan diverifikasi! Siap dipasang.</span>
          </div>
        )}

        {/* Update Error Notice */}
        {updateError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Gagal mengunduh pembaruan: {updateError}</span>
          </div>
        )}

        {/* TOMBOL WAJIB: UPDATE SEKARANG & LEWATI */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 relative z-10">
          {/* TOMBOL 2: LEWATI */}
          <button
            onClick={handleSkip}
            disabled={isDownloading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            LEWATI
          </button>

          {/* TOMBOL 1: UPDATE SEKARANG */}
          {isReadyToInstall ? (
            <button
              onClick={handleInstallNow}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-wider clay-button-rgb shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART & PASANG SEKARANG</span>
            </button>
          ) : (
            <button
              onClick={handleUpdateNow}
              disabled={isDownloading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black text-xs uppercase tracking-wider clay-button-rgb shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>UPDATE SEKARANG</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
