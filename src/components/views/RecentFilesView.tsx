/**
 * FAHGIT - File Terakhir Dibuka
 * 100% Bahasa Indonesia
 * Menampilkan riwayat berkas yang baru saja dibuka atau diedit di browser.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { FileIcon } from '../common/FileIcon';
import { Clock, ExternalLink, FolderGit2 } from 'lucide-react';

export const RecentFilesView: React.FC = () => {
  const {
    recentFiles,
    activeRepo,
    treeItems,
    openInEditor,
    selectRepo,
    repos,
    setView,
  } = useApp();

  const handleOpenRecent = async (repoName: string, path: string) => {
    // If not in this repo, switch first
    if (!activeRepo || activeRepo.full_name !== repoName) {
      const targetRepo = repos.find((r) => r.full_name === repoName);
      if (targetRepo) {
        await selectRepo(targetRepo);
      }
    }

    const matchedTreeItem = treeItems.find((i) => i.path === path);
    if (matchedTreeItem) {
      await openInEditor(matchedTreeItem.path, matchedTreeItem.sha);
    } else {
      setView('file-manager');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          File Terakhir Dibuka
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Riwayat berkas yang terakhir kali Anda buka atau edit, tersimpan aman di browser Anda.
        </p>
      </div>

      <div className="clay-card rounded-3xl overflow-hidden shadow-xl divide-y divide-white/10">
        {recentFiles.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <span>Belum ada riwayat berkas. Buka berkas apa saja di Penjelajah File atau Editor Kode.</span>
          </div>
        ) : (
          recentFiles.map((record) => (
            <div
              key={record.id}
              onClick={() => handleOpenRecent(record.repo, record.path)}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon filename={record.path} className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold text-white truncate block">
                    {record.path}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                    <span className="text-cyan-400">{record.repo}</span>
                    <span>·</span>
                    <span>{new Date(record.lastOpened).toLocaleTimeString('id-ID')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold shrink-0">
                <span>Buka di Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
