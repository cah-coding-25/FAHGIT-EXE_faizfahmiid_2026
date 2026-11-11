/**
 * FAHGIT - Penjelajah & Editor Terpadu (100% Bahasa Indonesia)
 * Menyatukan Penjelajah File (File Explorer) dan Editor Kode Monaco dalam 1 Layar Terintegrasi.
 * Fitur:
 * 1. Jelajahi struktur direktori, breadcrumb, cari berkas seketika
 * 2. Klik berkas langsung membuka tab di Monaco Editor pada layar yang sama
 * 3. Tambah berkas baru, buat folder bertingkat (.gitkeep commit), ganti nama, pindahkan, hapus berkas
 * 4. Simpan & commit langsung ke GitHub dengan pesan commit khusus
 * 5. Format JSON, pratinjau Markdown & HTML interaktif, unduh ZIP folder
 * 6. Responsif: Split-pane pada Desktop/Tablet, Pill Switcher pada Mobile/Android
 */

import React, { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../../context/AppContext';
import { FileItem } from '../../types';
import { FileIcon } from '../common/FileIcon';
import {
  saveFile,
  deleteFile,
  getBlob,
} from '../../services/github';
import {
  formatFileSize,
  isImageFile,
  isBinaryFile,
  base64ToUtf8,
  triggerDownload,
} from '../../utils/fileUtils';
import { createZipFromFiles } from '../../services/zip';
import {
  FolderPlus,
  FilePlus,
  RefreshCw,
  Search,
  Download,
  Trash2,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  Eye,
  X,
  Save,
  RotateCcw,
  AlignLeft,
  Maximize2,
  Minimize2,
  FileCode,
  FolderGit2,
  Edit3,
  Move,
  Code2,
  Files,
  Loader2,
  Sparkles,
} from 'lucide-react';

export const FileManagerView: React.FC = () => {
  const {
    token,
    activeRepo,
    activeBranch,
    treeItems,
    isLoadingTree,
    refreshTree,
    currentPath,
    setCurrentPath,
    editorTabs,
    activeTabId,
    setActiveTabId,
    updateTabContent,
    openInEditor,
    closeEditorTab,
    saveActiveEditorTab,
    settings,
    notify,
  } = useApp();

  // Mode Tampilan Mobile: 'explorer' (Daftar File) vs 'editor' (Editor Kode)
  const [mobileTab, setMobileTab] = useState<'explorer' | 'editor'>('explorer');

  // Filter pencarian berkas
  const [searchFilter, setSearchFilter] = useState('');

  // Modals Penjelajah
  const [isNewFileModal, setIsNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileCommitMsg, setNewFileCommitMsg] = useState('');
  const [isSubmittingNewFile, setIsSubmittingNewFile] = useState(false);

  const [isNewFolderModal, setIsNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Move modal
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null);
  const [moveDestinationPath, setMoveDestinationPath] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<{ name: string; url: string; size?: number } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Unduh ZIP
  const [isZipping, setIsZipping] = useState(false);

  // State Editor Monaco
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  // Filter item di folder saat ini
  const currentItems = useMemo<FileItem[]>(() => {
    if (!treeItems || treeItems.length === 0) return [];

    const normalizedCurrentPath = currentPath
      ? currentPath.endsWith('/')
        ? currentPath
        : `${currentPath}/`
      : '';
    const foldersMap = new Map<string, FileItem>();
    const filesList: FileItem[] = [];

    for (const item of treeItems) {
      if (!item.path.startsWith(normalizedCurrentPath)) continue;

      const subPath = item.path.slice(normalizedCurrentPath.length);
      if (!subPath) continue;

      const slashIndex = subPath.indexOf('/');

      if (slashIndex !== -1) {
        // Sub-folder
        const folderName = subPath.slice(0, slashIndex);
        const folderFullPath = `${normalizedCurrentPath}${folderName}`;

        if (!foldersMap.has(folderName)) {
          foldersMap.set(folderName, {
            name: folderName,
            path: folderFullPath,
            type: 'folder',
            sha: item.sha,
          });
        }
      } else {
        // File biasa
        if (item.type === 'blob') {
          // Jangan tampilkan .gitkeep kosong jika ada file lain
          filesList.push({
            name: subPath,
            path: item.path,
            type: 'file',
            size: item.size,
            sha: item.sha,
            mode: item.mode,
            extension: subPath.includes('.') ? subPath.split('.').pop() : '',
          });
        }
      }
    }

    const foldersList = Array.from(foldersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    filesList.sort((a, b) => a.name.localeCompare(b.name));

    let combined = [...foldersList, ...filesList];

    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      combined = combined.filter((i) => i.name.toLowerCase().includes(term));
    }

    return combined;
  }, [treeItems, currentPath, searchFilter]);

  // Breadcrumbs path
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [];
    return currentPath.split('/').filter(Boolean);
  }, [currentPath]);

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentPath('');
    } else {
      const sub = breadcrumbs.slice(0, index + 1).join('/');
      setCurrentPath(sub);
    }
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  // Klik berkas -> Buka di Editor seketika & ganti tab mobile ke editor
  const handleFileClick = async (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
      return;
    }

    if (isImageFile(item.name)) {
      handleOpenImagePreview(item);
      return;
    }

    // Buka berkas kode di Monaco Editor
    await openInEditor(item.path, item.sha);
    setMobileTab('editor');
  };

  // Pratinjau gambar
  const handleOpenImagePreview = async (item: FileItem) => {
    if (!token || !activeRepo) return;
    setIsLoadingPreview(true);
    try {
      const blob = await getBlob(token, activeRepo.owner.login, activeRepo.name, item.sha);
      const mime = item.name.endsWith('.svg')
        ? 'image/svg+xml'
        : item.name.endsWith('.png')
        ? 'image/png'
        : item.name.endsWith('.gif')
        ? 'image/gif'
        : 'image/jpeg';
      const dataUrl = `data:${mime};base64,${blob.content.replace(/\n/g, '')}`;
      setPreviewImage({ name: item.name, url: dataUrl, size: blob.size });
    } catch {
      notify('error', 'Gagal memuat pratinjau gambar.', 'Error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Buat berkas baru
  const handleCreateNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo || !newFileName.trim()) return;

    setIsSubmittingNewFile(true);
    try {
      const cleanPath = currentPath
        ? `${currentPath.replace(/^\/+|\/+$/g, '')}/${newFileName.trim()}`
        : newFileName.trim();

      await saveFile(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        cleanPath,
        newFileContent,
        newFileCommitMsg || `Buat berkas ${cleanPath}`,
        activeBranch
      );

      notify('success', `Berkas '${cleanPath}' berhasil dibuat!`, 'Berkas Dibuat');
      setIsNewFileModal(false);
      setNewFileName('');
      setNewFileContent('');
      setNewFileCommitMsg('');
      await refreshTree();

      // Buka langsung di editor
      const updatedItem = treeItems.find((i) => i.path === cleanPath);
      if (updatedItem) {
        await openInEditor(cleanPath, updatedItem.sha);
        setMobileTab('editor');
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal membuat file', 'Error');
    } finally {
      setIsSubmittingNewFile(false);
    }
  };

  // Buat folder baru dengan commit .gitkeep
  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo || !newFolderName.trim()) return;

    setIsSubmittingFolder(true);
    try {
      const cleanFolder = newFolderName.trim().replace(/^\/+|\/+$/g, '');
      const cleanPath = currentPath
        ? `${currentPath.replace(/^\/+|\/+$/g, '')}/${cleanFolder}/.gitkeep`
        : `${cleanFolder}/.gitkeep`;

      await saveFile(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        cleanPath,
        '',
        `Inisialisasi folder ${cleanFolder}`,
        activeBranch
      );

      notify('success', `Folder '${cleanFolder}' berhasil dibuat!`, 'Folder Dibuat');
      setIsNewFolderModal(false);
      setNewFolderName('');
      await refreshTree();
      setCurrentPath(currentPath ? `${currentPath}/${cleanFolder}` : cleanFolder);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal membuat folder', 'Error');
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  // Hapus berkas
  const handleDeleteSubmit = async () => {
    if (!token || !activeRepo || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteFile(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        deleteTarget.path,
        deleteTarget.sha,
        `Hapus ${deleteTarget.path}`,
        activeBranch
      );

      notify('success', `Berkas '${deleteTarget.name}' berhasil dihapus.`, 'Berkas Dihapus');

      // Jika berkas ini sedang terbuka di editor, tutup tabnya
      const tabToClose = editorTabs.find((t) => t.path === deleteTarget.path);
      if (tabToClose) {
        closeEditorTab(tabToClose.id);
      }

      setDeleteTarget(null);
      await refreshTree();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal menghapus berkas', 'Error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Ganti nama berkas (Rename)
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo || !renameTarget || !renameNewName.trim()) return;

    setIsRenaming(true);
    try {
      const parentDir = renameTarget.path.includes('/')
        ? renameTarget.path.substring(0, renameTarget.path.lastIndexOf('/'))
        : '';
      const newPath = parentDir ? `${parentDir}/${renameNewName.trim()}` : renameNewName.trim();

      const blob = await getBlob(token, activeRepo.owner.login, activeRepo.name, renameTarget.sha);
      const content = isBinaryFile(renameTarget.name) ? blob.content : base64ToUtf8(blob.content);

      await saveFile(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        newPath,
        content,
        `Ganti nama ${renameTarget.path} menjadi ${newPath}`,
        activeBranch
      );

      await deleteFile(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        renameTarget.path,
        renameTarget.sha,
        `Hapus berkas lama setelah ganti nama`,
        activeBranch
      );

      notify('success', `Berhasil mengganti nama menjadi '${renameNewName.trim()}'`, 'Selesai');
      setRenameTarget(null);
      setRenameNewName('');
      await refreshTree();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal mengganti nama', 'Error');
    } finally {
      setIsRenaming(false);
    }
  };

  // Unduh folder sebagai file ZIP
  const handleDownloadFolderZip = async () => {
    if (!token || !activeRepo) return;
    setIsZipping(true);
    try {
      const folderPrefix = currentPath ? (currentPath.endsWith('/') ? currentPath : `${currentPath}/`) : '';
      const itemsInFolder = treeItems.filter(
        (i) => i.type === 'blob' && i.path.startsWith(folderPrefix)
      );

      if (itemsInFolder.length === 0) {
        notify('warning', 'Tidak ada berkas di dalam folder ini untuk diunduh.', 'Folder Kosong');
        return;
      }

      notify('info', `Mengemas ${itemsInFolder.length} berkas menjadi ZIP...`, 'Memproses Unduhan');

      const filePayloads = await Promise.all(
        itemsInFolder.map(async (item) => {
          const blob = await getBlob(token, activeRepo.owner.login, activeRepo.name, item.sha);
          const relativePath = item.path.slice(folderPrefix.length);
          return {
            path: relativePath,
            data: blob.content,
            isBase64: true,
          };
        })
      );

      const zipBlob = await createZipFromFiles(filePayloads);
      const zipFileName = `${activeRepo.name}-${currentPath ? currentPath.replace(/\//g, '-') : 'root'}.zip`;
      triggerDownload(zipBlob, zipFileName);
      notify('success', `Arsip ${zipFileName} siap diunduh!`, 'Unduh Sukses');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal mengemas folder ZIP', 'Error');
    } finally {
      setIsZipping(false);
    }
  };

  // Editor Actions
  const handleEditorChange = (value: string | undefined) => {
    if (activeTabId && value !== undefined) {
      updateTabContent(activeTabId, value);
    }
  };

  const handleSaveEditorClick = () => {
    if (!activeTab) return;
    setCommitMessage(`Perbarui ${activeTab.name}`);
    setIsCommitModalOpen(true);
  };

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await saveActiveEditorTab(commitMessage);
      if (success) {
        setIsCommitModalOpen(false);
        await refreshTree();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!activeTab) return;
    if (window.confirm(`Batalkan perubahan yang belum disimpan pada ${activeTab.name}?`)) {
      updateTabContent(activeTab.id, activeTab.originalContent);
      notify('info', `Perubahan pada ${activeTab.name} telah dibatalkan`, 'Dibatalkan');
    }
  };

  const formatJson = () => {
    if (!activeTab || activeTab.language !== 'json') return;
    try {
      const parsed = JSON.parse(activeTab.content);
      const formatted = JSON.stringify(parsed, null, 2);
      updateTabContent(activeTab.id, formatted);
      notify('success', 'Format JSON berhasil dirapikan.', 'Format Selesai');
    } catch {
      notify('error', 'Sintaks JSON tidak valid.', 'Kesalahan Sintaks');
    }
  };

  const isMarkdown = activeTab?.name.endsWith('.md') || activeTab?.name.endsWith('.markdown');
  const isHtml = activeTab?.name.endsWith('.html') || activeTab?.name.endsWith('.htm');

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* HEADER PENJELAJAH & EDITOR TERPADU                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Files className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            Penjelajah & Editor File
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Jelajahi struktur folder, klik berkas untuk langsung mengedit kode di Monaco Editor, tambah file baru, atau hapus.
          </p>
        </div>

        {/* Status Repositori & Cabang Aktif */}
        {activeRepo && (
          <div className="clay-dock rounded-full px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 border border-slate-300 dark:border-white/10">
            <FolderGit2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-white">{activeRepo.name}</span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">{activeBranch}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE PILL SWITCHER (Beralih antara Daftar File & Editor pada Android)     */}
      {/* ========================================================================= */}
      <div className="flex md:hidden items-center gap-2 bg-slate-200 dark:bg-[#0F172A] p-1 rounded-2xl border border-slate-300 dark:border-white/10 max-w-xs mx-auto">
        <button
          onClick={() => setMobileTab('explorer')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'explorer'
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Files className="w-3.5 h-3.5" />
          <span>Daftar File</span>
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'editor'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Editor ({editorTabs.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* AREA UTAMA TERPADU: KIRI PENJELAJAH, KANAN EDITOR MONACO                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start min-h-[600px]">
        {/* ======================================================================= */}
        {/* PANEL KIRI: PENJELAJAH DIREKTORI & BERKAS (md:col-span-4 atau 5)        */}
        {/* ======================================================================= */}
        <div
          className={`md:col-span-5 lg:col-span-4 clay-card rounded-3xl p-4 shadow-xl flex flex-col h-[650px] ${
            mobileTab === 'explorer' ? 'block' : 'hidden md:flex'
          }`}
        >
          {/* Action Toolbar Penjelajah: Tambah File, Tambah Folder, Unduh ZIP */}
          <div className="flex items-center justify-between gap-1.5 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsNewFileModal(true)}
                className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold clay-button-rgb shadow-sm hover:scale-105 transition-transform"
                title="Buat Berkas Baru"
              >
                <FilePlus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsNewFolderModal(true)}
                className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold clay-button-rgb shadow-sm hover:scale-105 transition-transform"
                title="Buat Folder Baru"
              >
                <FolderPlus className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownloadFolderZip}
                disabled={isZipping}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors"
                title="Unduh Isi Folder Ini sebagai ZIP"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => refreshTree()}
              disabled={isLoadingTree}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs transition-colors"
              title="Muat Ulang Berkas"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingTree ? 'animate-spin text-cyan-500 dark:text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Breadcrumb Path & Search Bar */}
          <div className="py-2.5 space-y-2 border-b border-slate-200 dark:border-white/10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-nowrap py-0.5">
              <button
                onClick={() => handleNavigateBreadcrumb(-1)}
                className="hover:text-cyan-600 dark:hover:text-cyan-400 font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300"
              >
                <FolderOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>root</span>
              </button>
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />
                  <button
                    onClick={() => handleNavigateBreadcrumb(idx)}
                    className={`hover:text-cyan-600 dark:hover:text-cyan-400 truncate max-w-[90px] ${
                      idx === breadcrumbs.length - 1 ? 'text-cyan-700 dark:text-cyan-300 font-bold' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {b}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari berkas di folder ini..."
                className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Daftar Berkas & Folder */}
          <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
            {/* Tombol kembali ke folder atas jika bukan di root */}
            {currentPath && (
              <div
                onClick={handleNavigateUp}
                className="flex items-center gap-2 p-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono">.. (Folder Sebelumnya)</span>
              </div>
            )}

            {isLoadingTree ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <span>Memuat berkas repositori...</span>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <span>Folder ini masih kosong atau tidak ada berkas yang cocok.</span>
              </div>
            ) : (
              currentItems.map((item) => {
                const isItemActiveInEditor = activeTab?.path === item.path;

                return (
                  <div
                    key={item.path}
                    className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isItemActiveInEditor
                        ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-200'
                        : 'hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <div
                      onClick={() => handleFileClick(item)}
                      className="flex items-center gap-2 min-w-0 flex-1 mr-2"
                    >
                      {item.type === 'folder' ? (
                        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <FileIcon filename={item.name} className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate font-mono">{item.name}</span>
                    </div>

                    {/* Aksi Berkas: Rename & Hapus */}
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {item.type === 'file' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameTarget(item);
                              setRenameNewName(item.name);
                            }}
                            className="p-1 hover:text-cyan-400 text-slate-400"
                            title="Ganti Nama"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(item);
                            }}
                            className="p-1 hover:text-rose-400 text-slate-400"
                            title="Hapus Berkas"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL KANAN: EDITOR KODE MONACO (md:col-span-7 atau 8)                  */}
        {/* ======================================================================= */}
        <div
          className={`md:col-span-7 lg:col-span-8 clay-card rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px] border border-white/10 ${
            mobileTab === 'editor' ? 'block' : 'hidden md:flex'
          }`}
        >
          {editorTabs.length === 0 || !activeTab ? (
            /* Empty State jika belum ada file terbuka */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
                <FileCode className="w-8 h-8 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Editor Kode Siap Digunakan</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Pilih salah satu berkas di sebelah kiri untuk membaca & mengedit kode, atau klik tombol{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+ Buat Berkas Baru</span> di atas.
                </p>
              </div>
              <button
                onClick={() => setIsNewFileModal(true)}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs clay-button-rgb shadow-md hover:scale-105 transition-transform flex items-center gap-1.5"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Buat Berkas Baru Sekarang</span>
              </button>
            </div>
          ) : (
            /* Tampilan Editor Aktif */
            <div
              className={`flex-1 flex flex-col overflow-hidden ${
                isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-slate-100 dark:bg-[#0A0F1D]' : ''
              }`}
            >
              {/* Tabs Strip Berkas yang Terbuka */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/10 px-3 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1.5 py-2 overflow-x-auto max-w-[80%]">
                  {editorTabs.map((tab) => {
                    const isActive = tab.id === activeTabId;

                    return (
                      <div
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all shrink-0 ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-md'
                            : 'bg-white dark:bg-[#172033] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-white/5'
                        }`}
                      >
                        <FileIcon filename={tab.name} className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[120px] font-medium">{tab.name}</span>

                        {tab.isDirty && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 dark:bg-cyan-400 animate-pulse shrink-0"
                            title="Belum disimpan"
                          />
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeEditorTab(tab.id);
                          }}
                          className="hover:text-rose-600 dark:hover:text-red-400 p-0.5 rounded-full"
                          title="Tutup Tab"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Tombol Simpan & Toolbar Atas */}
                <div className="flex items-center gap-1.5 shrink-0 py-1.5">
                  <button
                    onClick={handleSaveEditorClick}
                    disabled={!activeTab.isDirty}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md clay-button-rgb ${
                      activeTab.isDirty
                        ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 hover:scale-105'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan</span>
                  </button>

                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                    title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Sub-Toolbar: Discard, Format JSON, Preview Markdown/HTML */}
              <div className="h-8 bg-slate-50 dark:bg-[#121826] border-b border-slate-200 dark:border-white/5 px-3 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold truncate max-w-xs">{activeTab.path}</span>
                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <span className="font-mono">{activeTab.language}</span>
                  {activeTab.isDirty && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Diedit
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeTab.language === 'json' && (
                    <button
                      onClick={formatJson}
                      className="hover:text-cyan-400 flex items-center gap-1"
                      title="Rapikan Sintaks JSON"
                    >
                      <AlignLeft className="w-3 h-3" />
                      <span>Format</span>
                    </button>
                  )}

                  {(isMarkdown || isHtml) && (
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={`hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-md ${
                        showPreview ? 'bg-cyan-500/20 text-cyan-300' : ''
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Pratinjau</span>
                    </button>
                  )}

                  {activeTab.isDirty && (
                    <button
                      onClick={handleDiscardChanges}
                      className="hover:text-rose-400 flex items-center gap-1"
                      title="Batalkan perubahan"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Batalkan</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Canvas Monaco Editor & Live Preview Split */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                <div className={`h-full ${showPreview ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
                  <Editor
                    height="100%"
                    language={activeTab.language}
                    theme={settings.monacoTheme || 'vs-dark'}
                    value={activeTab.content}
                    onChange={handleEditorChange}
                    options={{
                      fontSize: settings.monacoFontSize || 14,
                      minimap: { enabled: settings.minimap ?? true },
                      wordWrap: settings.wordWrap || 'on',
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      readOnly: activeTab.readOnly || activeTab.isBinary,
                    }}
                  />
                </div>

                {/* Pratinjau Markdown / HTML */}
                {showPreview && (
                  <div className="w-1/2 h-full bg-[#0F172A] overflow-y-auto p-4 text-xs text-slate-200">
                    {isMarkdown ? (
                      <div className="space-y-3 leading-relaxed whitespace-pre-wrap font-sans">
                        <div className="p-2 bg-[#172033] rounded-xl border border-white/10 text-[10px] text-cyan-300 font-mono">
                          Pratinjau Markdown
                        </div>
                        {activeTab.content}
                      </div>
                    ) : isHtml ? (
                      <iframe
                        title="HTML Preview"
                        sandbox="allow-scripts"
                        srcDoc={activeTab.content}
                        className="w-full h-full bg-white rounded-2xl border border-white/20"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS: BUAT FILE, BUAT FOLDER, COMMIT, RENAME, HAPUS, GAMBAR            */}
      {/* ========================================================================= */}

      {/* Modal Buat Berkas Baru */}
      {isNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Buat Berkas Baru
              </h3>
              <button onClick={() => setIsNewFileModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNewFile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Berkas (beserta ekstensi, misal: index.ts):
                </label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="contoh: util.ts atau README.md"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Isi Awal Berkas (Opsional):
                </label>
                <textarea
                  rows={4}
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  placeholder="// Tulis kode atau konten di sini..."
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-mono resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewFile || !newFileName.trim()}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs clay-button-rgb shadow-md hover:scale-105"
                >
                  {isSubmittingNewFile ? 'Membuat...' : 'Buat Berkas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buat Folder Baru */}
      {isNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-500" />
                Buat Folder Baru
              </h3>
              <button onClick={() => setIsNewFolderModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNewFolder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Folder:
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="contoh: komponen-baru"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFolder || !newFolderName.trim()}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs clay-button-rgb shadow-md hover:scale-105"
                >
                  {isSubmittingFolder ? 'Membuat...' : 'Buat Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Commit Perubahan Editor */}
      {isCommitModalOpen && activeTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Simpan & Commit ke GitHub
              </h3>
              <button onClick={() => setIsCommitModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCommitSubmit} className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Berkas target:</span>
                <span className="text-xs font-mono text-cyan-700 dark:text-cyan-300 font-bold block">{activeTab.path}</span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pesan Commit:
                </label>
                <input
                  type="text"
                  required
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Contoh: Perbarui logika komponen"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCommitModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !commitMessage.trim()}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black text-xs clay-button-rgb shadow-md hover:scale-105"
                >
                  {isSaving ? 'Menyimpan...' : 'Commit Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Berkas */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <h3 className="text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Hapus Berkas Ini?
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong> dari cabang{' '}
              <strong>{activeBranch}</strong>? Tindakan ini akan membuat commit penghapusan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs shadow-md hover:scale-105"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rename Berkas */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Ganti Nama Berkas
              </h3>
              <button onClick={() => setRenameTarget(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Baru:
                </label>
                <input
                  type="text"
                  required
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRenaming || !renameNewName.trim()}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs clay-button-rgb shadow-md hover:scale-105"
                >
                  {isRenaming ? 'Menyimpan...' : 'Simpan Nama'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Gambar */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="clay-card rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate max-w-xs">
                {previewImage.name}
              </span>
              <button onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-100 dark:bg-[#0F172A] rounded-2xl p-4 max-h-96 overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-80 max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
