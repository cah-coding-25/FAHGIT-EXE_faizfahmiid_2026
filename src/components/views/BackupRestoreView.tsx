/**
 * FAHGIT - Cadangkan & Pulihkan Konfigurasi
 * 100% Bahasa Indonesia
 * Ekspor konfigurasi terenkripsi, pulihkan pengaturan lokal,
 * dan unduh seluruh repositori sebagai arsip ZIP.
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  saveFavorites,
  saveAppSettings,
  purgeAllLocalData,
} from '../../services/storage';
import { triggerDownload } from '../../utils/fileUtils';
import { createZipFromFiles } from '../../services/zip';
import { getBlob } from '../../services/github';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  FileArchive,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const {
    vaultInfo,
    favorites,
    settings,
    activeRepo,
    treeItems,
    token,
    notify,
    disconnectGitHub,
  } = useApp();

  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [confirmPurgeModal, setConfirmPurgeModal] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Export encrypted backup configuration
  const handleExportBackup = async () => {
    const backupData = {
      app: 'Fahgit',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      vault: vaultInfo,
      favorites,
      settings,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    triggerDownload(blob, `fahgit-cadangan-${new Date().toISOString().slice(0, 10)}.json`);
    notify('success', 'Cadangan konfigurasi berhasil diekspor.', 'Ekspor Selesai');
  };

  // Restore configuration from JSON file
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.app || (data.app !== 'Fahgit' && data.app !== 'FAHGIT')) {
        notify('error', 'Berkas cadangan tidak valid untuk aplikasi Fahgit.', 'Gagal Pulihkan');
        return;
      }

      if (data.favorites) {
        await saveFavorites(data.favorites);
      }
      if (data.settings) {
        await saveAppSettings(data.settings);
      }

      notify('success', 'Konfigurasi favorit dan pengaturan berhasil dipulihkan!', 'Berhasil');
      setTimeout(() => window.location.reload(), 800);
    } catch {
      notify('error', 'Gagal memproses berkas JSON cadangan.', 'Error');
    }
  };

  // Download entire repository as ZIP
  const handleDownloadFullRepoZip = async () => {
    if (!token || !activeRepo || treeItems.length === 0) {
      notify('warning', 'Tidak ada file dalam repositori aktif.', 'Peringatan');
      return;
    }

    setIsExportingZip(true);
    setZipProgress(5);

    try {
      const filesToDownload = treeItems.filter((i) => i.type === 'blob');
      const filesPayload: Array<{ path: string; data: Uint8Array }> = [];

      for (let i = 0; i < filesToDownload.length; i++) {
        const item = filesToDownload[i];
        try {
          const blobData = await getBlob(token, activeRepo.owner.login, activeRepo.name, item.sha);
          const binaryString = atob(blobData.content.replace(/\s/g, ''));
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          filesPayload.push({ path: item.path, data: bytes });
        } catch {
          // Continue with remaining files
        }

        const pct = Math.round(5 + ((i + 1) / filesToDownload.length) * 85);
        setZipProgress(pct);
      }

      const zipBlob = await createZipFromFiles(filesPayload);
      setZipProgress(100);
      triggerDownload(zipBlob, `${activeRepo.name}-main.zip`);
      notify('success', `Berhasil mengunduh seluruh isi repositori ${activeRepo.name} sebagai ZIP!`, 'Selesai');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal mengekspor repositori', 'Gagal');
    } finally {
      setIsExportingZip(false);
      setZipProgress(0);
    }
  };

  const handlePurgeAll = async () => {
    setConfirmPurgeModal(false);
    await purgeAllLocalData();
    await disconnectGitHub(true);
    notify('info', 'Seluruh data lokal telah dihapus.', 'Pembersihan Selesai');
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          Cadangkan & Pulihkan Data
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Ekspor pengaturan dan favorit, unduh repositori penuh sebagai ZIP, atau bersihkan penyimpanan lokal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Restore Config */}
        <div className="clay-card rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Cadangan Konfigurasi Lokal
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ekspor preferensi tema, pengaturan Monaco editor, dan daftar repositori favorit ke dalam berkas JSON cadangan.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs clay-button-rgb shadow-md hover:opacity-90 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Berkas Cadangan</span>
            </button>

            <button
              onClick={() => restoreInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-bold transition-colors clay-button-rgb"
            >
              <Upload className="w-4 h-4" />
              <span>Pulihkan dari JSON</span>
            </button>
            <input
              type="file"
              ref={restoreInputRef}
              onChange={handleRestoreFile}
              accept=".json,application/json"
              className="hidden"
            />
          </div>
        </div>

        {/* Full Repo ZIP Download */}
        <div className="clay-card rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-purple-400" />
            Unduh Repositori Penuh (ZIP)
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {activeRepo
              ? `Kompres seluruh file dari repositori ${activeRepo.name} secara langsung di browser dan unduh sebagai arsip ZIP.`
              : 'Pilih repositori terlebih dahulu untuk mengunduh seluruh file sebagai ZIP.'}
          </p>

          {isExportingZip && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs font-mono text-cyan-400">
                <span>Mengunduh blob & mengompres...</span>
                <span>{zipProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${zipProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleDownloadFullRepoZip}
              disabled={isExportingZip || !activeRepo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs clay-button-rgb shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isExportingZip ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingZip ? 'Sedang Memproses ZIP...' : 'Unduh Repositori sebagai ZIP'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Purge All */}
      <div className="clay-card rounded-3xl p-6 border-red-500/30 space-y-3">
        <h2 className="text-sm font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Zona Bahaya: Bersihkan Seluruh Penyimpanan Browser
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Menghapus seluruh token tersimpan, riwayat log audit aktivitas, file terakhir dibuka, dan konfigurasi dari IndexedDB dan LocalStorage di browser ini.
        </p>

        <button
          onClick={() => setConfirmPurgeModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Hapus Bersih Semua Data Lokal</span>
        </button>
      </div>

      {confirmPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-red-500/30 space-y-4">
            <h3 className="text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Hapus Semua Data Lokal?
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Seluruh token GitHub terenkripsi, log aktivitas, favorit, dan pengaturan lokal akan dihapus permanen dari perangkat ini.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPurgeModal(false)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePurgeAll}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs shadow-md hover:scale-105"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
