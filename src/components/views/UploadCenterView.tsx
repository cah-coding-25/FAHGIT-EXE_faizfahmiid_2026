/**
 * FAHGIT - Pusat Unggah & ZIP Terpadu (100% Bahasa Indonesia)
 * Disederhanakan sesuai permintaan pengguna:
 * 1. Hanya 2 pilihan bersih:
 *    - Pilih File Tunggal / Banyak (Termasuk file .ZIP)
 *    - Pilih Folder Bertingkat
 * 2. Menghapus 3 kotak tab agar antarmuka sangat rapi & bebas ruwet.
 * 3. Dilengkapi pengaturan Repositori Tujuan langsung di halaman ini:
 *    - Dropdown Pilih Repositori & Cabang
 *    - Tombol '+ Buat Repositori Baru' dengan modal instan tanpa harus berpindah halaman.
 * 4. Deteksi otomatis file .ZIP: pratinjau isi arsip, pilih berkas, dan ekstrak atomik ke GitHub.
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { createGitBlob, createBatchCommit, createRepo, saveFile, getBranchRefSha } from '../../services/github';
import { analyzeZipArchive, ZipAnalysis } from '../../services/zip';
import { uint8ArrayToBase64, formatFileSize } from '../../utils/fileUtils';
import { FileIcon } from '../common/FileIcon';
import {
  UploadCloud,
  FolderUp,
  FileUp,
  FileArchive,
  CheckCircle2,
  FolderGit2,
  Trash2,
  GitCommitHorizontal,
  CheckSquare,
  Square,
  Sparkles,
  Plus,
  X,
  Lock,
  Globe,
  Loader2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface QueuedFile {
  id: string;
  file?: File;
  relativePath: string;
  size: number;
  status: 'pending' | 'uploading_blob' | 'completed' | 'failed';
  sha?: string;
  data?: Uint8Array;
  error?: string;
}

// Hapus folder pembungkus utama tunggal agar berkas di dalamnya langsung masuk ke repositori
function stripCommonOuterFolder(paths: string[]): string[] {
  if (paths.length === 0) return paths;
  if (!paths.every((p) => p.includes('/'))) return paths;

  const firstSeg = paths[0].split('/')[0];
  if (!firstSeg) return paths;

  const allSameOuter = paths.every((p) => p.split('/')[0] === firstSeg);
  if (!allSameOuter) return paths;

  const prefix = `${firstSeg}/`;
  return paths.map((p) => p.slice(prefix.length));
}

// Baca rekursif seluruh entri folder dari Drag & Drop
async function readDroppedEntries(dataTransfer: DataTransfer): Promise<Array<{ file: File; relativePath: string }>> {
  const results: Array<{ file: File; relativePath: string }> = [];

  const traverseEntry = async (entry: FileSystemEntry, parentPath = ''): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => fileEntry.file(resolve, reject));
      const fullPath = parentPath ? `${parentPath}/${file.name}` : file.name;
      results.push({ file, relativePath: fullPath });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const readAllEntries = async (): Promise<FileSystemEntry[]> => {
        const all: FileSystemEntry[] = [];
        while (true) {
          const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
          if (batch.length === 0) break;
          all.push(...batch);
        }
        return all;
      };
      const entries = await readAllEntries();
      const nextParent = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      for (const child of entries) {
        await traverseEntry(child, nextParent);
      }
    }
  };

  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      for (const entry of entries) {
        await traverseEntry(entry, '');
      }
      return results;
    }
  }

  for (let i = 0; i < dataTransfer.files.length; i++) {
    const f = dataTransfer.files[i];
    const rel = (f as { webkitRelativePath?: string }).webkitRelativePath || f.name;
    results.push({ file: f, relativePath: rel });
  }
  return results;
}

export const UploadCenterView: React.FC = () => {
  const {
    token,
    repos,
    activeRepo,
    activeBranch,
    branches,
    selectRepo,
    selectBranch,
    refreshRepos,
    currentPath,
    notify,
  } = useApp();

  // Mode Unggah: 'files' (termasuk ZIP) atau 'folder'
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');

  // Antrean File
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [destPath, setDestPath] = useState(currentPath || '');
  const [commitMessage, setCommitMessage] = useState('Unggah berkas melalui FAHGIT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Status ZIP Terdeteksi
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [zipAnalysis, setZipAnalysis] = useState<ZipAnalysis | null>(null);
  const [isAnalyzingZip, setIsAnalyzingZip] = useState(false);

  // Modal Buat Repositori Baru Langsung di Sini
  const [isCreateRepoModal, setIsCreateRepoModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Tambahkan daftar berkas (dengan penghapusan otomatis folder pembungkus luar jika dari folder)
  const processIncomingItems = (entries: Array<{ file: File; relativePath: string }>, fromFolder: boolean) => {
    setUploadFeedback(null);

    const filtered = entries.filter(({ file, relativePath }) => {
      if (relativePath.includes('__MACOSX/') || relativePath.endsWith('.DS_Store')) return false;
      if (
        file.name.startsWith('.') &&
        file.name !== '.gitkeep' &&
        file.name !== '.gitignore' &&
        file.name !== '.env'
      ) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) return;

    // Jika berasal dari folder picker atau drag-drop folder, hapus folder pembungkus utama
    const rawPaths = filtered.map((e) => e.relativePath.replace(/\\/g, '/').replace(/^\/+/, ''));
    const normalizedPaths = fromFolder || rawPaths.every((p) => p.includes('/'))
      ? stripCommonOuterFolder(rawPaths)
      : rawPaths;

    const newItems: QueuedFile[] = [];

    filtered.forEach(({ file }, i) => {
      const cleanRel = normalizedPaths[i];
      if (!cleanRel) return;

      // Jika berkas adalah arsip .ZIP (dan bukan dari dalam folder), analisis otomatis untuk ekstraksi
      if (!fromFolder && file.name.toLowerCase().endsWith('.zip')) {
        handleZipFileSelect(file);
        return;
      }

      newItems.push({
        id: `q_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        file,
        relativePath: cleanRel,
        size: file.size,
        status: 'pending',
      });
    });

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  // Tambahkan file dari FileList input
  const addFilesToQueue = (files: FileList | File[], fromFolder = false) => {
    const entries: Array<{ file: File; relativePath: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const rel = (f as { webkitRelativePath?: string }).webkitRelativePath || f.name;
      entries.push({ file: f, relativePath: rel });
    }
    processIncomingItems(entries, fromFolder);
  };

  // Analisis file ZIP di peramban secara lokal
  const handleZipFileSelect = async (file: File) => {
    setSelectedZipFile(file);
    setIsAnalyzingZip(true);
    setZipAnalysis(null);
    setUploadFeedback(null);

    try {
      const result = await analyzeZipArchive(file);
      setZipAnalysis(result);
      if (!result.isValid) {
        setUploadFeedback({
          type: 'error',
          message: result.error || 'Arsip ZIP tidak valid atau rusak.',
        });
        notify('error', result.error || 'Arsip ZIP tidak valid atau rusak.', 'Analisis Gagal');
      } else {
        notify(
          'success',
          `Arsip ZIP terdeteksi: ${result.totalFiles} berkas siap diekstrak.`,
          'ZIP Ditemukan'
        );
        setCommitMessage(`Ekstrak dan terapkan arsip ${file.name}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses file ZIP';
      setUploadFeedback({ type: 'error', message: msg });
      notify('error', msg, 'Error');
    } finally {
      setIsAnalyzingZip(false);
    }
  };

  const toggleZipItem = (path: string) => {
    if (!zipAnalysis) return;
    setZipAnalysis({
      ...zipAnalysis,
      items: zipAnalysis.items.map((item) =>
        item.path === path ? { ...item, selected: !item.selected } : item
      ),
    });
  };

  const toggleSelectAllZip = (select: boolean) => {
    if (!zipAnalysis) return;
    setZipAnalysis({
      ...zipAnalysis,
      items: zipAnalysis.items.map((item) => ({ ...item, selected: select })),
    });
  };

  // Drag and drop handler (mendukung file, ZIP, maupun folder penuh)
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const droppedEntries = await readDroppedEntries(e.dataTransfer);
      if (droppedEntries.length > 0) {
        const hasDirectoryPaths = droppedEntries.some((d) => d.relativePath.includes('/'));
        processIncomingItems(droppedEntries, hasDirectoryPaths);
      }
    } catch {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFilesToQueue(e.dataTransfer.files, false);
      }
    }
  };

  // Hapus item dari antrean
  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // Bersihkan semua antrean
  const clearQueue = () => {
    setQueue([]);
    setSelectedZipFile(null);
    setZipAnalysis(null);
    setProgressPercent(0);
  };

  // Modal Buat Repositori Baru
  const handleCreateRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newRepoName.trim()) return;

    setIsCreatingRepo(true);
    try {
      const created = await createRepo(token, {
        name: newRepoName.trim(),
        description: newRepoDesc.trim() || undefined,
        private: newRepoPrivate,
        auto_init: true,
      });

      notify('success', `Repositori '${created.name}' berhasil dibuat!`, 'Repositori Baru');
      setIsCreateRepoModal(false);
      setNewRepoName('');
      setNewRepoDesc('');
      await refreshRepos();
      await selectRepo(created);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat repositori';
      setUploadFeedback({ type: 'error', message: msg });
      notify('error', msg, 'Error');
    } finally {
      setIsCreatingRepo(false);
    }
  };

  // Helper komitmen batch yang aman untuk repositori kosong maupun sudah berisi
  const commitFilesToRepo = async (
    entries: Array<{ path: string; base64Content: string }>,
    message: string
  ) => {
    if (!token || !activeRepo || entries.length === 0) return;

    const owner = activeRepo.owner.login;
    const repoName = activeRepo.name;
    const targetBranch = activeBranch || activeRepo.default_branch || 'main';
    let remainingEntries = [...entries];

    // Jika repositori masih benar-benar kosong (belum punya branch/commit sama sekali),
    // inisialisasi dengan berkas pertama melalui Contents API lalu tunggu ref terbaca
    if (branches.length === 0) {
      const first = remainingEntries.shift()!;
      await saveFile(token, owner, repoName, first.path, first.base64Content, message, targetBranch);
      if (remainingEntries.length === 0) {
        setProgressPercent(100);
        return;
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          await getBranchRefSha(token, owner, repoName, targetBranch);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    const blobResults: Array<{
      path: string;
      mode: '100644' | '100755';
      type: 'blob';
      sha: string;
    }> = [];

    const total = remainingEntries.length;
    let completedCount = 0;

    for (let idx = 0; idx < remainingEntries.length; idx++) {
      const entry = remainingEntries[idx];
      try {
        const blob = await createGitBlob(token, owner, repoName, entry.base64Content, 'base64');
        blobResults.push({
          path: entry.path,
          sha: blob.sha,
          mode: '100644',
          type: 'blob',
        });
      } catch (err: unknown) {
        // Fallback jika ternyata repositori kosong walaupun branches sempat terbaca
        if (idx === 0 && err instanceof Error && err.message.toLowerCase().includes('empty')) {
          await saveFile(token, owner, repoName, entry.path, entry.base64Content, message, targetBranch);
          if (remainingEntries.length === 1) {
            setProgressPercent(100);
            return;
          }
          await new Promise((r) => setTimeout(r, 800));
          completedCount++;
          continue;
        }
        throw err;
      }

      completedCount++;
      setProgressPercent(Math.round(5 + (completedCount / total) * 75));
    }

    if (blobResults.length > 0) {
      setProgressPercent(85);
      await createBatchCommit(token, owner, repoName, targetBranch, blobResults, message);
    }
    setProgressPercent(100);
  };

  // Eksekusi Unggah Berkas Biasa / Folder
  const handleExecuteUpload = async () => {
    if (!token || !activeRepo) {
      setUploadFeedback({
        type: 'error',
        message: 'Silakan pilih atau buat repositori tujuan terlebih dahulu.',
      });
      return;
    }
    if (queue.length === 0) {
      setUploadFeedback({ type: 'error', message: 'Antrean berkas masih kosong.' });
      return;
    }

    setIsProcessing(true);
    setProgressPercent(5);
    setUploadFeedback(null);

    try {
      const cleanDest = destPath ? destPath.replace(/^\/+|\/+$/g, '') : '';
      const preparedEntries: Array<{ path: string; base64Content: string }> = [];

      for (const item of queue) {
        if (!item.file) continue;
        const fileObj = item.file;

        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const b64 = res.includes(',') ? res.split(',')[1] : res;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileObj);
        });

        const cleanRel = item.relativePath.replace(/^\/+/, '');
        const finalPath = cleanDest ? `${cleanDest}/${cleanRel}` : cleanRel;

        preparedEntries.push({
          path: finalPath,
          base64Content,
        });
      }

      await commitFilesToRepo(preparedEntries, commitMessage || 'Unggah berkas melalui FAHGIT');

      setUploadFeedback({
        type: 'success',
        message: `Berhasil mengunggah ${preparedEntries.length} berkas ke ${activeRepo.name} (${activeBranch || 'main'})!`,
      });
      notify(
        'success',
        `Berhasil mengunggah ${preparedEntries.length} berkas ke cabang ${activeBranch}!`,
        'Unggah Sukses'
      );

      await selectRepo(activeRepo);
      setTimeout(() => {
        clearQueue();
        setIsProcessing(false);
      }, 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah berkas';
      setUploadFeedback({ type: 'error', message: msg });
      notify('error', msg, 'Gagal Unggah');
      setIsProcessing(false);
    }
  };

  // Eksekusi Ekstraksi Berkas ZIP Langsung ke Repositori
  const handleExecuteZipExtract = async () => {
    if (!token || !activeRepo || !zipAnalysis) {
      setUploadFeedback({
        type: 'error',
        message: 'Silakan pilih repositori tujuan dan arsip ZIP yang valid.',
      });
      return;
    }

    const selectedItems = zipAnalysis.items.filter((i) => !i.isDirectory && i.selected && i.data);
    if (selectedItems.length === 0) {
      setUploadFeedback({
        type: 'error',
        message: 'Pilih setidaknya satu berkas dari dalam ZIP untuk diekstrak.',
      });
      return;
    }

    setIsProcessing(true);
    setProgressPercent(5);
    setUploadFeedback(null);

    try {
      const cleanDest = destPath ? destPath.replace(/^\/+|\/+$/g, '') : '';
      const preparedEntries = selectedItems.map((item) => {
        const cleanRel = item.path.replace(/^\/+/, '');
        const finalPath = cleanDest ? `${cleanDest}/${cleanRel}` : cleanRel;
        return {
          path: finalPath,
          base64Content: uint8ArrayToBase64(item.data!),
        };
      });

      await commitFilesToRepo(
        preparedEntries,
        commitMessage || `Ekstrak ${selectedZipFile?.name || 'arsip ZIP'} via FAHGIT`
      );

      setUploadFeedback({
        type: 'success',
        message: `Berhasil mengekstrak & menerapkan ${preparedEntries.length} berkas langsung ke ${activeRepo.name} (${activeBranch || 'main'})!`,
      });
      notify(
        'success',
        `Berhasil mengekstrak & menerapkan ${preparedEntries.length} berkas ke ${activeBranch}!`,
        'Ekstraksi Selesai'
      );

      await selectRepo(activeRepo);
      setTimeout(() => {
        clearQueue();
        setIsProcessing(false);
      }, 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengekstrak berkas ZIP';
      setUploadFeedback({ type: 'error', message: msg });
      notify('error', msg, 'Gagal Ekstrak');
      setIsProcessing(false);
    }
  };

  const totalQueueSize = queue.reduce((acc, curr) => acc + curr.size, 0);
  const zipFileItems = zipAnalysis?.items.filter((i) => !i.isDirectory) || [];
  const selectedZipCount = zipFileItems.filter((i) => i.selected).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Pusat Unggah & ZIP
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Unggah file tunggal / banyak (termasuk .ZIP) atau folder bertingkat ke GitHub secara instan & rapi.
          </p>
        </div>

        {/* Status Repositori Aktif */}
        {activeRepo && (
          <div className="clay-dock rounded-full px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 border border-slate-300 dark:border-white/10">
            <FolderGit2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-white">{activeRepo.name}</span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">{activeBranch}</span>
          </div>
        )}
      </div>

      {/* Status Hasil Unggah / Ekstraksi Inline (Tanpa Popup Mengganggu) */}
      {uploadFeedback && (
        <div
          className={`clay-card rounded-2xl p-4 border flex items-center justify-between gap-3 text-xs ${
            uploadFeedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span className="font-medium leading-relaxed">{uploadFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadFeedback(null)}
            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
            aria-label="Tutup pesan status"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PENGATURAN REPOSITORI TUJUAN LANGSUNG DI SINI                            */}
      {/* ========================================================================= */}
      <div className="clay-card rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Repositori & Lokasi Tujuan
            </h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Tentukan repositori dan folder target di mana berkas Anda akan disimpan.
            </p>
          </div>

          {/* Tombol Buat Repositori Baru */}
          <button
            onClick={() => setIsCreateRepoModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold clay-button-rgb shadow-md hover:scale-105 transition-transform shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Repositori Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Dropdown Pilih Repositori */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilih Repositori:
            </label>
            <select
              value={activeRepo?.full_name || ''}
              onChange={(e) => {
                const selected = repos.find((r) => r.full_name === e.target.value);
                if (selected) selectRepo(selected);
              }}
              className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-medium"
            >
              {repos.length === 0 ? (
                <option value="">Belum ada repositori. Buat baru!</option>
              ) : (
                repos.map((r) => (
                  <option key={r.id} value={r.full_name}>
                    {r.name} {r.private ? '🔒 (Private)' : '🌐 (Public)'}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Dropdown Pilih Cabang (Branch) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Cabang (Branch):
            </label>
            <select
              value={activeBranch}
              onChange={(e) => selectBranch(e.target.value)}
              className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-indigo-700 dark:text-indigo-400 focus:outline-hidden focus:border-cyan-500 font-mono font-medium"
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Folder Target di Repositori */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Folder Tujuan (Opsional):
            </label>
            <input
              type="text"
              value={destPath}
              onChange={(e) => setDestPath(e.target.value)}
              placeholder="Contoh: src/components (kosongkan jika root)"
              className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DUA PILIHAN BERSIH: FILE TUNGGAL / BANYAK (TERMASUK ZIP) vs FOLDER         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tombol Pilihan 1: File Tunggal / Banyak (Termasuk .ZIP) */}
        <div
          onClick={() => {
            setUploadMode('files');
            fileInputRef.current?.click();
          }}
          className={`clay-card rounded-3xl p-6 text-center cursor-pointer transition-all hover:scale-[1.02] border ${
            uploadMode === 'files'
              ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/20'
              : 'border-slate-200 dark:border-white/10'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg clay-button-rgb">
            <FileUp className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Pilih File Tunggal / Banyak (Termasuk .ZIP)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Pilih satu atau banyak file dari komputer Anda. Jika Anda memilih arsip <strong>.ZIP</strong>, sistem akan otomatis mendeteksi dan menawarkan ekstraksi instan.
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <span>Buka File Picker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tombol Pilihan 2: Folder Bertingkat */}
        <div
          onClick={() => {
            setUploadMode('folder');
            folderInputRef.current?.click();
          }}
          className={`clay-card rounded-3xl p-6 text-center cursor-pointer transition-all hover:scale-[1.02] border ${
            uploadMode === 'folder'
              ? 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-white/10'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg clay-button-rgb">
            <FolderUp className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Pilih Folder Bertingkat
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Unggah seluruh isi direktori beserta struktur sub-folder secara utuh ke GitHub tanpa perlu membuat folder satu-per-satu.
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <span>Buka Folder Picker</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files) addFilesToQueue(e.target.files, false);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard for folder picker
        webkitdirectory="true"
        multiple
        onChange={(e) => {
          if (e.target.files) addFilesToQueue(e.target.files, true);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* DRAG AND DROP ZONE                                                       */}
      {/* ========================================================================= */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="clay-card rounded-3xl p-6 border-2 border-dashed border-slate-300 dark:border-white/20 text-center hover:border-cyan-500 dark:hover:border-cyan-400/60 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud className="w-8 h-8 text-cyan-500 dark:text-cyan-400 mx-auto mb-2 animate-bounce" />
        <p className="text-xs font-bold text-slate-900 dark:text-white">
          Atau seret dan lepas (Drag & Drop) berkas, folder, atau file .ZIP langsung ke sini
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
          Folder pembungkus luar dari ZIP/Folder akan otomatis dilewati sehingga isi di dalamnya langsung masuk ke repositori.
        </p>
      </div>

      {/* Loading Indicator Saat Analisis ZIP */}
      {isAnalyzingZip && (
        <div className="clay-card rounded-3xl p-5 border border-purple-500/30 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-purple-500 shrink-0" />
          <span>Menganalisis isi arsip ZIP secara lokal...</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* JIKA FILE ZIP TERDETEKSI: KOTAK EKSTRAKSI & PRATINJAU                    */}
      {/* ========================================================================= */}
      {selectedZipFile && zipAnalysis && (
        <div className="clay-card-glow rounded-3xl p-5 border border-purple-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center clay-button-rgb shrink-0">
                <FileArchive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">
                    {selectedZipFile.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-semibold">
                    Ekstrak Langsung ke Repo
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {zipAnalysis.totalFiles} berkas ditemukan · Total Ukuran:{' '}
                  {formatFileSize(zipAnalysis.totalSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSelectAllZip(true)}
                className="text-xs text-cyan-500 dark:text-cyan-400 hover:underline px-2 py-1"
              >
                Pilih Semua
              </button>
              <button
                onClick={() => toggleSelectAllZip(false)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:underline px-2 py-1"
              >
                Batalkan Semua
              </button>
            </div>
          </div>

          {/* Daftar berkas di dalam ZIP */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs">
            {zipFileItems.map((item) => (
              <div
                key={item.path}
                onClick={() => toggleZipItem(item.path)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                  item.selected
                    ? 'bg-purple-500/10 text-slate-900 dark:text-white font-medium'
                    : 'bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 opacity-70'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.selected ? (
                    <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  )}
                  <FileIcon filename={item.path} className="w-3.5 h-3.5" />
                  <span className="truncate font-mono">{item.path}</span>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                  {formatFileSize(item.size)}
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar Ekstraksi ZIP */}
          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                <span>Mengekstrak & mengunggah berkas ke GitHub...</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Tombol Ekstrak ZIP ke Repositori */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {selectedZipCount} dari {zipAnalysis.totalFiles}{' '}
              berkas dipilih untuk diekstrak langsung.
            </span>

            <button
              onClick={handleExecuteZipExtract}
              disabled={isProcessing || !activeRepo || selectedZipCount === 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white font-bold text-xs clay-button-rgb shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengekstrak ke GitHub...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ekstrak & Terapkan Semua Berkas ke Repositori</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DAFTAR ANTREAN BERKAS YANG SIAP DIUNGGAH                                 */}
      {/* ========================================================================= */}
      {queue.length > 0 && (
        <div className="clay-card rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Antrean Berkas ({queue.length} Berkas · {formatFileSize(totalQueueSize)})
              </h3>
            </div>
            <button
              onClick={clearQueue}
              className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Antrean</span>
            </button>
          </div>

          {/* List items */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 text-xs text-slate-900 dark:text-white"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileIcon filename={item.relativePath} className="w-4 h-4 shrink-0" />
                  <span className="truncate font-mono font-medium">{item.relativePath}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {formatFileSize(item.size)}
                  </span>
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Hapus berkas ini"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Commit Message & Action Button */}
          <div className="pt-2 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Pesan Commit GitHub:
              </label>
              <div className="relative">
                <GitCommitHorizontal className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Contoh: Menambahkan berkas proyek baru"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                  <span>Mengunggah berkas & membuat commit atomik...</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExecuteUpload}
              disabled={isProcessing || !activeRepo}
              className="w-full py-3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black text-xs uppercase tracking-wider clay-button-rgb shadow-xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Sedang Mengunggah ke GitHub...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-slate-950" />
                  <span>Unggah Sekarang ke Repositori ({queue.length} Berkas)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BUAT REPOSITORI BARU INSTAN                                        */}
      {/* ========================================================================= */}
      {isCreateRepoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="clay-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Buat Repositori Baru
              </h3>
              <button
                onClick={() => setIsCreateRepoModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRepoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Repositori:
                </label>
                <input
                  type="text"
                  required
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="contoh: aplikasi-web-keren"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  placeholder="Deskripsi singkat repositori..."
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Visibilitas */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  {newRepoPrivate ? (
                    <Lock className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  )}
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      {newRepoPrivate ? 'Private (Pribadi)' : 'Public (Terbuka)'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {newRepoPrivate
                        ? 'Hanya Anda yang dapat mengakses'
                        : 'Dapat dilihat oleh semua orang'}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-400 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRepoModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRepo || !newRepoName.trim()}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs clay-button-rgb shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingRepo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Membuat...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Repositori</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
