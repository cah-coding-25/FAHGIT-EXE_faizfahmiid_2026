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

import React, { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../../context/AppContext';
import { FileItem } from '../../types';
import { FileIcon } from '../common/FileIcon';
import {
  saveFile,
  deleteFile,
  getBlob,
  createBatchCommit,
  TreeEntryInput,
} from '../../services/github';
import { addActivityLog } from '../../services/storage';
import {
  isImageFile,
  utf8ToBase64,
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
  Code2,
  Files,
  Loader2,
  CheckSquare,
  Square,
  Check,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

function normalizeGitMode(mode?: string): TreeEntryInput['mode'] {
  if (mode === '100755' || mode === '120000' || mode === '160000') {
    return mode;
  }
  return '100644';
}

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
    closeEditorTabsByPaths,
    refreshActivityLogs,
    saveActiveEditorTab,
    settings,
    notify,
  } = useApp();

  // Mode Tampilan Mobile: 'explorer' (Daftar File) vs 'editor' (Editor Kode)
  const [mobileTab, setMobileTab] = useState<'explorer' | 'editor'>('explorer');

  // Filter pencarian berkas
  const [searchFilter, setSearchFilter] = useState('');

  // Umpan balik visual inline di panel penjelajah
  const [explorerFeedback, setExplorerFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Pilihan banyak item (checkbox multi-select)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // Modals Penjelajah
  const [isNewFileModal, setIsNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFileCommitMsg, setNewFileCommitMsg] = useState('');
  const [isSubmittingNewFile, setIsSubmittingNewFile] = useState(false);
  const [newFileError, setNewFileError] = useState<string | null>(null);

  const [isNewFolderModal, setIsNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);
  const [newFolderError, setNewFolderError] = useState<string | null>(null);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete single (file atau folder), bulk delete, dan wipe seluruh repo/folder
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [isBulkDeleteModal, setIsBulkDeleteModal] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeScope, setWipeScope] = useState<'repo' | 'folder'>('repo');
  const [deleteCommitMsg, setDeleteCommitMsg] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  // Bersihkan pilihan checkbox saat pindah repositori, cabang, atau folder
  useEffect(() => {
    setSelectedPaths(new Set());
  }, [activeRepo?.full_name, activeBranch, currentPath]);

  // Daftar seluruh item leaf (blob/commit) pada cabang aktif
  const allLeafItems = useMemo(
    () => (treeItems || []).filter((i) => i.type !== 'tree'),
    [treeItems]
  );

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
    setNewFileError(null);
    try {
      const cleanPath = currentPath
        ? `${currentPath.replace(/^\/+|\/+$/g, '')}/${newFileName.trim()}`
        : newFileName.trim();

      const saved = await saveFile(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        cleanPath,
        utf8ToBase64(newFileContent),
        newFileCommitMsg || `Buat berkas ${cleanPath}`,
        activeBranch
      );

      setExplorerFeedback({
        type: 'success',
        message: `Berkas '${cleanPath}' berhasil dibuat.`,
      });
      setIsNewFileModal(false);
      setNewFileName('');
      setNewFileContent('');
      setNewFileCommitMsg('');
      await refreshTree();

      if (saved?.content?.sha) {
        await openInEditor(cleanPath, saved.content.sha);
        setMobileTab('editor');
      }
    } catch (err) {
      setNewFileError(err instanceof Error ? err.message : 'Gagal membuat berkas');
    } finally {
      setIsSubmittingNewFile(false);
    }
  };

  // Buat folder baru dengan commit .gitkeep
  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo || !newFolderName.trim()) return;

    setIsSubmittingFolder(true);
    setNewFolderError(null);
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

      setExplorerFeedback({
        type: 'success',
        message: `Folder '${cleanFolder}' berhasil dibuat.`,
      });
      setIsNewFolderModal(false);
      setNewFolderName('');
      await refreshTree();
      setCurrentPath(currentPath ? `${currentPath}/${cleanFolder}` : cleanFolder);
    } catch (err) {
      setNewFolderError(err instanceof Error ? err.message : 'Gagal membuat folder');
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  // Hitung total berkas leaf yang terdampak oleh sekumpulan path (file maupun folder)
  const getAffectedLeaves = (targetPaths: string[]) => {
    if (targetPaths.length === 0) return [];
    return allLeafItems.filter((item) =>
      targetPaths.some((tp) => item.path === tp || item.path.startsWith(`${tp}/`))
    );
  };

  // Eksekusi penghapusan atomik untuk daftar path (file, folder, beberapa pilihan, maupun seluruh repositori)
  const executePathsDeletion = async (
    targetPaths: string[],
    commitMsg: string,
    successSummary: string,
    logAction: 'FILE_DELETED' | 'FOLDER_DELETED'
  ): Promise<boolean> => {
    if (!token || !activeRepo || !activeBranch || targetPaths.length === 0) return false;

    const matchesTarget = (itemPath: string) =>
      targetPaths.some((tp) => itemPath === tp || itemPath.startsWith(`${tp}/`));

    const targetedItems = allLeafItems.filter((item) => matchesTarget(item.path));
    const remainingItems = allLeafItems.filter((item) => !matchesTarget(item.path));

    if (targetedItems.length === 0) {
      await refreshTree();
      return true;
    }

    const owner = activeRepo.owner.login;
    const repo = activeRepo.name;

    if (remainingItems.length > 0) {
      // Hapus seluruh target beserta folder-nya dalam 1 commit atomik (tanpa base_tree)
      const remainingEntries: TreeEntryInput[] = remainingItems.map((item) => ({
        path: item.path,
        mode: normalizeGitMode(item.mode),
        type: item.type === 'commit' ? 'commit' : 'blob',
        sha: item.sha,
      }));

      await createBatchCommit(
        token,
        owner,
        repo,
        activeBranch,
        remainingEntries,
        commitMsg,
        { replaceTree: true }
      );
    } else {
      // Menghapus SELURUH isi repositori / file terakhir di cabang aktif
      try {
        await createBatchCommit(
          token,
          owner,
          repo,
          activeBranch,
          [],
          commitMsg,
          { replaceTree: true }
        );
      } catch (emptyTreeErr) {
        // Fallback jika GitHub menolak tree kosong via Git Trees API:
        // sisakan 1 blob dalam 1 batch commit (jika >1 file), lalu hapus blob terakhir via Contents API
        const targetedBlobs = targetedItems.filter((i) => i.type === 'blob');
        if (targetedBlobs.length === 0) {
          throw emptyTreeErr;
        }

        if (targetedBlobs.length > 1) {
          const lastBlob = targetedBlobs[targetedBlobs.length - 1];
          await createBatchCommit(
            token,
            owner,
            repo,
            activeBranch,
            [
              {
                path: lastBlob.path,
                mode: normalizeGitMode(lastBlob.mode),
                type: 'blob',
                sha: lastBlob.sha,
              },
            ],
            `${commitMsg} (tahap pembersihan)`,
            { replaceTree: true }
          );
          await deleteFile(token, owner, repo, lastBlob.path, lastBlob.sha, commitMsg, activeBranch);
        } else {
          const singleBlob = targetedBlobs[0];
          await deleteFile(token, owner, repo, singleBlob.path, singleBlob.sha, commitMsg, activeBranch);
        }
      }
    }

    // Tutup seluruh tab editor yang berkasnya ikut terhapus
    closeEditorTabsByPaths(new Set(targetedItems.map((i) => i.path)));
    setSelectedPaths(new Set());

    // Jika repo kosong atau folder aktif ikut terhapus, kembali ke root
    if (
      remainingItems.length === 0 ||
      (currentPath && targetPaths.some((tp) => currentPath === tp || currentPath.startsWith(`${tp}/`)))
    ) {
      setCurrentPath('');
    }

    await addActivityLog({
      action: logAction,
      repo: activeRepo.full_name,
      target: targetPaths.length === 1 ? targetPaths[0] : `${targetPaths.length} item`,
      status: 'SUCCESS',
      details: `${successSummary} (${targetedItems.length} berkas pada cabang ${activeBranch})`,
    });
    refreshActivityLogs();

    await refreshTree();
    setExplorerFeedback({
      type: 'success',
      message: successSummary,
    });
    return true;
  };

  // Toggle pilih 1 item (file/folder)
  const toggleSelectPath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Toggle pilih semua item yang terlihat di folder saat ini
  const allVisibleSelected =
    currentItems.length > 0 && currentItems.every((item) => selectedPaths.has(item.path));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(currentItems.map((item) => item.path)));
    }
  };

  // Hapus 1 berkas atau 1 folder beserta seluruh isinya
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const isFolder = deleteTarget.type === 'folder';
      const defaultMsg = isFolder
        ? `Hapus folder ${deleteTarget.path} beserta seluruh isinya`
        : `Hapus ${deleteTarget.path}`;
      const affectedCount = isFolder ? getAffectedLeaves([deleteTarget.path]).length : 1;
      const summary = isFolder
        ? `Folder '${deleteTarget.name}' beserta ${affectedCount} berkas di dalamnya berhasil dihapus.`
        : `Berkas '${deleteTarget.name}' berhasil dihapus.`;

      await executePathsDeletion(
        [deleteTarget.path],
        deleteCommitMsg.trim() || defaultMsg,
        summary,
        isFolder ? 'FOLDER_DELETED' : 'FILE_DELETED'
      );
      setDeleteTarget(null);
      setDeleteCommitMsg('');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus item dari repositori.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Hapus banyak item terpilih (file & folder)
  const handleBulkDeleteSubmit = async () => {
    const targets = Array.from(selectedPaths);
    if (targets.length === 0) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const affectedCount = getAffectedLeaves(targets).length;
      const defaultMsg = `Hapus ${targets.length} item terpilih (${affectedCount} berkas)`;
      await executePathsDeletion(
        targets,
        deleteCommitMsg.trim() || defaultMsg,
        `${targets.length} item terpilih (${affectedCount} berkas) berhasil dihapus.`,
        'FOLDER_DELETED'
      );
      setIsBulkDeleteModal(false);
      setDeleteCommitMsg('');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus item terpilih.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Hapus SELURUH file dan folder (Repositori penuh atau Folder saat ini)
  const handleWipeAllSubmit = async () => {
    if (!activeRepo) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const targetPaths =
        wipeScope === 'folder' && currentPath
          ? [currentPath]
          : Array.from(new Set(allLeafItems.map((i) => i.path.split('/')[0])));

      const affectedCount =
        wipeScope === 'folder' && currentPath
          ? getAffectedLeaves([currentPath]).length
          : allLeafItems.length;

      const defaultMsg =
        wipeScope === 'folder' && currentPath
          ? `Hapus seluruh isi folder ${currentPath}`
          : `Hapus seluruh file & folder di repositori ${activeRepo.name}`;

      const summary =
        wipeScope === 'folder' && currentPath
          ? `Seluruh isi folder '${currentPath}' (${affectedCount} berkas) berhasil dihapus.`
          : `Seluruh file & folder (${affectedCount} berkas) di repositori '${activeRepo.name}' berhasil dihapus.`;

      await executePathsDeletion(
        targetPaths,
        deleteCommitMsg.trim() || defaultMsg,
        summary,
        'FOLDER_DELETED'
      );
      setIsWipeModalOpen(false);
      setDeleteCommitMsg('');
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Gagal menghapus seluruh file & folder.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Ganti nama berkas (Rename)
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo || !renameTarget || !renameNewName.trim()) return;

    setIsRenaming(true);
    setRenameError(null);
    try {
      const parentDir = renameTarget.path.includes('/')
        ? renameTarget.path.substring(0, renameTarget.path.lastIndexOf('/'))
        : '';
      const newPath = parentDir ? `${parentDir}/${renameNewName.trim()}` : renameNewName.trim();

      const blob = await getBlob(token, activeRepo.owner.login, activeRepo.name, renameTarget.sha);
      const base64Content = blob.content.replace(/\s/g, '');

      await saveFile(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        newPath,
        base64Content,
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

      setExplorerFeedback({
        type: 'success',
        message: `Berkas berhasil diganti nama menjadi '${renameNewName.trim()}'.`,
      });
      setRenameTarget(null);
      setRenameNewName('');
      await refreshTree();
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Gagal mengganti nama berkas.');
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
        setExplorerFeedback({
          type: 'error',
          message: 'Tidak ada berkas di dalam folder ini untuk diunduh.',
        });
        return;
      }

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
      setExplorerFeedback({
        type: 'success',
        message: `Arsip '${zipFileName}' (${itemsInFolder.length} berkas) siap diunduh.`,
      });
    } catch (err) {
      setExplorerFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengemas folder ZIP.',
      });
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
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      setTimeout(() => setConfirmDiscard(false), 4000);
      return;
    }
    updateTabContent(activeTab.id, activeTab.originalContent);
    setConfirmDiscard(false);
    notify('info', `Perubahan pada ${activeTab.name} telah dibatalkan`, 'Dibatalkan');
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
            mobileTab === 'explorer' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Action Toolbar Penjelajah: Tambah File, Tambah Folder, Unduh ZIP, Hapus Semua, Refresh */}
          <div className="flex items-center justify-between gap-1.5 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setNewFileError(null);
                  setIsNewFileModal(true);
                }}
                className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold clay-button-rgb shadow-sm hover:scale-105 transition-transform"
                title="Buat Berkas Baru"
              >
                <FilePlus className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setNewFolderError(null);
                  setIsNewFolderModal(true);
                }}
                className="p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold clay-button-rgb shadow-sm hover:scale-105 transition-transform"
                title="Buat Folder Baru"
              >
                <FolderPlus className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownloadFolderZip}
                disabled={isZipping || allLeafItems.length === 0}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Unduh Isi Folder Ini sebagai ZIP"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setDeleteError(null);
                  setDeleteCommitMsg('');
                  setWipeScope('repo');
                  setIsWipeModalOpen(true);
                }}
                disabled={!activeRepo || allLeafItems.length === 0 || isLoadingTree}
                className="px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Hapus Seluruh File & Folder di Repositori"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>

              <button
                onClick={() => refreshTree()}
                disabled={isLoadingTree}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 text-xs transition-colors"
                title="Muat Ulang Berkas"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTree ? 'animate-spin text-cyan-500 dark:text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Inline Feedback Banner Penjelajah */}
          {explorerFeedback && (
            <div
              className={`mt-2.5 px-3 py-2 rounded-xl text-[11px] font-medium flex items-start justify-between gap-2 border ${
                explorerFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2 min-w-0">
                {explorerFeedback.type === 'success' ? (
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug break-words">{explorerFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setExplorerFeedback(null)}
                className="opacity-70 hover:opacity-100 shrink-0"
                title="Tutup"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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

            {/* Bar Multi-Pilih & Hapus Terpilih */}
            {currentItems.length > 0 && (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={toggleSelectAllVisible}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                >
                  {allVisibleSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  <span>{allVisibleSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
                </button>

                {selectedPaths.size > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteCommitMsg('');
                      setIsBulkDeleteModal(true);
                    }}
                    className="px-2.5 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Terpilih ({selectedPaths.size})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Daftar Berkas & Folder */}
          <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
            {/* Tombol kembali ke folder atas jika bukan di root */}
            {currentPath && (
              <div
                onClick={handleNavigateUp}
                className="flex items-center gap-2 p-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="font-mono">.. (Folder Sebelumnya)</span>
              </div>
            )}

            {isLoadingTree ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500 dark:text-cyan-400 mx-auto" />
                <span>Memuat berkas repositori...</span>
              </div>
            ) : currentItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                <span>
                  {allLeafItems.length === 0
                    ? 'Repositori ini kosong (tidak ada file atau folder).'
                    : 'Folder ini masih kosong atau tidak ada berkas yang cocok.'}
                </span>
              </div>
            ) : (
              currentItems.map((item) => {
                const isItemActiveInEditor = activeTab?.path === item.path;
                const isSelected = selectedPaths.has(item.path);

                return (
                  <div
                    key={item.path}
                    className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isItemActiveInEditor
                        ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-800 dark:text-cyan-200'
                        : isSelected
                        ? 'bg-rose-500/10 border border-rose-500/30 text-slate-900 dark:text-white'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectPath(item.path);
                        }}
                        className="p-0.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 shrink-0"
                        title={isSelected ? 'Batal Pilih' : 'Pilih Item Ini'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>

                      <div
                        onClick={() => handleFileClick(item)}
                        className="flex items-center gap-2 min-w-0 flex-1"
                      >
                        {item.type === 'folder' ? (
                          <FolderOpen className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        ) : (
                          <FileIcon filename={item.name} className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate font-mono">{item.name}</span>
                      </div>
                    </div>

                    {/* Aksi Item: Rename (file) & Hapus (file maupun folder) */}
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                      {item.type === 'file' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameError(null);
                            setRenameTarget(item);
                            setRenameNewName(item.name);
                          }}
                          className="p-1 hover:text-cyan-600 dark:hover:text-cyan-400 text-slate-500 dark:text-slate-400 rounded-md"
                          title="Ganti Nama Berkas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteError(null);
                          setDeleteCommitMsg('');
                          setDeleteTarget(item);
                        }}
                        className="p-1 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 rounded-md"
                        title={item.type === 'folder' ? 'Hapus Folder beserta Isinya' : 'Hapus Berkas'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
            mobileTab === 'editor' ? 'flex' : 'hidden md:flex'
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
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                        confirmDiscard
                          ? 'bg-rose-500/20 text-rose-400 font-bold'
                          : 'hover:text-rose-400'
                      }`}
                      title="Batalkan perubahan"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{confirmDiscard ? 'Klik lagi untuk konfirmasi' : 'Batalkan'}</span>
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
              {newFileError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-500 dark:text-rose-400">
                  {newFileError}
                </div>
              )}
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

              {newFolderError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-500 dark:text-rose-400">
                  {newFolderError}
                </div>
              )}

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

      {/* Modal Konfirmasi Hapus 1 File atau 1 Folder */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <h3 className="text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              {deleteTarget.type === 'folder' ? 'Hapus Folder Ini?' : 'Hapus Berkas Ini?'}
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {deleteTarget.type === 'folder' ? (
                <>
                  Apakah Anda yakin ingin menghapus folder{' '}
                  <strong className="font-mono text-rose-600 dark:text-rose-300">{deleteTarget.path}</strong>{' '}
                  beserta seluruh <strong>{getAffectedLeaves([deleteTarget.path]).length} berkas</strong> di dalamnya dari cabang{' '}
                  <strong>{activeBranch}</strong>?
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin menghapus berkas{' '}
                  <strong className="font-mono text-rose-600 dark:text-rose-300">{deleteTarget.name}</strong> dari cabang{' '}
                  <strong>{activeBranch}</strong>?
                </>
              )}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Pesan Commit (Opsional):
              </label>
              <input
                type="text"
                value={deleteCommitMsg}
                onChange={(e) => setDeleteCommitMsg(e.target.value)}
                placeholder={
                  deleteTarget.type === 'folder'
                    ? `Hapus folder ${deleteTarget.path} beserta seluruh isinya`
                    : `Hapus ${deleteTarget.path}`
                }
                className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs shadow-md hover:scale-105 disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Item Terpilih (Multi-Select) */}
      {isBulkDeleteModal && selectedPaths.size > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <h3 className="text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Hapus {selectedPaths.size} Item Terpilih?
            </h3>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <p>
                Total terdampak:{' '}
                <strong className="text-rose-600 dark:text-rose-300">
                  {getAffectedLeaves(Array.from(selectedPaths)).length} berkas
                </strong>{' '}
                di cabang <strong>{activeBranch}</strong>.
              </p>
              <ul className="text-[11px] font-mono text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto space-y-0.5 pt-1">
                {Array.from(selectedPaths)
                  .slice(0, 6)
                  .map((p) => (
                    <li key={p} className="truncate">
                      • {p}
                    </li>
                  ))}
                {selectedPaths.size > 6 && (
                  <li className="italic">...dan {selectedPaths.size - 6} item lainnya</li>
                )}
              </ul>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Pesan Commit (Opsional):
              </label>
              <input
                type="text"
                value={deleteCommitMsg}
                onChange={(e) => setDeleteCommitMsg(e.target.value)}
                placeholder={`Hapus ${selectedPaths.size} item terpilih`}
                className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsBulkDeleteModal(false)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteSubmit}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs shadow-md hover:scale-105 disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : `Hapus ${selectedPaths.size} Item`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Seluruh File & Folder (Repo Penuh / Folder Saat Ini) */}
      {isWipeModalOpen && activeRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-500/30 space-y-4">
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    Hapus Seluruh File &amp; Folder
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {activeRepo.full_name} · {activeBranch}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsWipeModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentPath && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWipeScope('repo')}
                  className={`p-2.5 rounded-2xl border text-left text-xs transition-all ${
                    wipeScope === 'repo'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold'
                      : 'border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div>Seluruh Repositori</div>
                  <div className="text-[10px] opacity-80 font-normal">
                    {allLeafItems.length} berkas (root)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setWipeScope('folder')}
                  className={`p-2.5 rounded-2xl border text-left text-xs transition-all ${
                    wipeScope === 'folder'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold'
                      : 'border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div>Folder Saat Ini</div>
                  <div className="text-[10px] opacity-80 font-normal truncate">
                    {getAffectedLeaves([currentPath]).length} berkas ({currentPath})
                  </div>
                </button>
              </div>
            )}

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {wipeScope === 'folder' && currentPath ? (
                <>
                  Tindakan ini akan menghapus permanen seluruh file dan subfolder di dalam{' '}
                  <strong className="font-mono text-rose-600 dark:text-rose-300">{currentPath}</strong> (
                  <strong>{getAffectedLeaves([currentPath]).length} berkas</strong>) pada cabang{' '}
                  <strong>{activeBranch}</strong>.
                </>
              ) : (
                <>
                  Tindakan ini akan mengosongkan repositori dengan menghapus seluruh{' '}
                  <strong className="text-rose-600 dark:text-rose-300">
                    {allLeafItems.length} berkas &amp; seluruh folder
                  </strong>{' '}
                  pada cabang <strong>{activeBranch}</strong> (repositori tetap ada).
                </>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Pesan Commit (Opsional):
              </label>
              <input
                type="text"
                value={deleteCommitMsg}
                onChange={(e) => setDeleteCommitMsg(e.target.value)}
                placeholder={
                  wipeScope === 'folder' && currentPath
                    ? `Hapus seluruh isi folder ${currentPath}`
                    : `Hapus seluruh file & folder di ${activeRepo.name}`
                }
                className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleWipeAllSubmit}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs shadow-md hover:scale-105 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua</span>
                  </>
                )}
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
              {renameError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-600 dark:text-rose-400">
                  {renameError}
                </div>
              )}
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
