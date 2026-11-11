/**
 * FAHGIT - Tampilan Favorit & Penanda
 * 100% Bahasa Indonesia
 * Akses cepat ke repositori berbintang dan file yang ditandai.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { Star, FolderGit2, FileText, ArrowRight, Trash2 } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const {
    favorites,
    repos,
    selectRepo,
    setView,
    toggleFavoriteRepo,
    toggleFavoriteFile,
    openInEditor,
    treeItems,
  } = useApp();

  const favoriteRepos = repos.filter((r) => favorites.repos.includes(r.full_name));

  const handleOpenRepo = async (fullName: string) => {
    const target = repos.find((r) => r.full_name === fullName);
    if (target) {
      await selectRepo(target);
      setView('file-manager');
    }
  };

  const handleOpenFile = async (filePath: string) => {
    const matchedItem = treeItems.find((i) => i.path === filePath);
    if (matchedItem) {
      await openInEditor(matchedItem.path, matchedItem.sha);
    } else {
      setView('file-manager');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200 dark:border-white/10">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          Favorit & Penanda
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
          Beralih cepat antara repositori berbintang dan berkas penting yang disematkan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Starred Repositories */}
        <div className="clay-card rounded-3xl p-6 flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Repositori Favorit ({favoriteRepos.length})
          </h2>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-80 pr-1">
            {favoriteRepos.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                <Star className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                <p>Belum ada repositori yang ditandai favorit.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Klik ikon bintang pada repositori untuk menyematkannya di sini.
                </p>
              </div>
            ) : (
              favoriteRepos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 hover:border-cyan-500 dark:hover:border-cyan-400/40 text-xs transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <span
                      onClick={() => handleOpenRepo(repo.full_name)}
                      className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-300 cursor-pointer block truncate"
                    >
                      {repo.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                      {repo.owner.login}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => handleOpenRepo(repo.full_name)}
                      className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold hover:bg-cyan-500/20 text-xs"
                    >
                      Buka
                    </button>
                    <button
                      onClick={() => toggleFavoriteRepo(repo.full_name)}
                      className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-red-500"
                      title="Hapus dari Favorit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pinned Files */}
        <div className="clay-card rounded-3xl p-6 flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            File Favorit ({favorites.files.length})
          </h2>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-80 pr-1">
            {favorites.files.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                <FileText className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                <p>Belum ada berkas yang ditandai favorit.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Sematkan berkas yang sering Anda buka dari Penjelajah File.
                </p>
              </div>
            ) : (
              favorites.files.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 hover:border-emerald-500 dark:hover:border-emerald-400/40 text-xs transition-colors"
                >
                  <span
                    onClick={() => handleOpenFile(path)}
                    className="font-mono text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-300 cursor-pointer truncate max-w-[240px]"
                    title={path}
                  >
                    {path}
                  </span>

                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      onClick={() => handleOpenFile(path)}
                      className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/20 text-xs"
                    >
                      Buka
                    </button>
                    <button
                      onClick={() => toggleFavoriteFile(path)}
                      className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-red-500"
                      title="Hapus dari Favorit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
