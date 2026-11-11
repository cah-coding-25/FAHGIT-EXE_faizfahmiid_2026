/**
 * FAHGIT - Pengelola Repositori
 * 100% Bahasa Indonesia
 * Tampilan Grid & List, Pencarian, Filter Visibilitas, Pembuatan Repositori Baru,
 * dan Penghapusan Aman 2 Langkah dengan konfirmasi nama repositori.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GitHubRepo } from '../../types';
import { createRepo, deleteRepo } from '../../services/github';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Star,
  ExternalLink,
  Trash2,
  Lock,
  Globe,
  RefreshCw,
  AlertTriangle,
  FolderOpen,
  X,
  Code,
  GitBranch,
  Sparkles,
} from 'lucide-react';

export const RepositoriesView: React.FC = () => {
  const {
    token,
    repos,
    isLoadingRepos,
    refreshRepos,
    activeRepo,
    selectRepo,
    setView,
    favorites,
    toggleFavoriteRepo,
    notify,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'created'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [newRepoInitReadme, setNewRepoInitReadme] = useState(true);
  const [newRepoGitignore, setNewRepoGitignore] = useState('Node');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<GitHubRepo | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter & Sort Repos
  const filteredRepos = repos
    .filter((repo) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'public') return !repo.private;
      if (filterType === 'private') return repo.private;
      if (filterType === 'archived') return repo.archived;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  // Open repository in File Manager
  const handleOpenRepo = async (repo: GitHubRepo) => {
    await selectRepo(repo);
    setView('file-manager');
  };

  // Create repository
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newRepoName.trim()) return;

    setIsCreating(true);
    try {
      const created = await createRepo(token, {
        name: newRepoName.trim(),
        description: newRepoDesc.trim(),
        private: newRepoPrivate,
        auto_init: newRepoInitReadme,
        gitignore_template: newRepoGitignore === 'None' ? undefined : newRepoGitignore,
      });

      notify('success', `Repositori ${created.name} berhasil dibuat!`, 'Berhasil Dibuat');
      setIsCreateOpen(false);
      setNewRepoName('');
      setNewRepoDesc('');
      await refreshRepos();
      await handleOpenRepo(created);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal membuat repositori baru', 'Gagal');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete repository execution
  const handleDeleteExecute = async () => {
    if (!token || !deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.name) {
      notify('error', 'Konfirmasi nama repositori tidak cocok.', 'Verifikasi Gagal');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteRepo(token, deleteTarget.owner.login, deleteTarget.name);
      notify('success', `Repositori ${deleteTarget.full_name} telah dihapus permanen.`, 'Berhasil Dihapus');
      setDeleteTarget(null);
      setDeleteConfirmText('');
      setDeleteStep(1);
      await refreshRepos();
    } catch (err) {
      notify(
        'error',
        err instanceof Error
          ? err.message
          : 'Gagal menghapus repositori. Pastikan token Anda memiliki izin "delete_repo".',
        'Gagal Menghapus'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Pengelola Repositori
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Kelola seluruh repositori GitHub pribadi dan kolaborasi Anda secara visual.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshRepos}
            disabled={isLoadingRepos}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-[#172033] hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-colors border border-slate-300 dark:border-white/10 clay-button-rgb"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? 'animate-spin text-cyan-500' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white transition-all clay-button-rgb shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Repositori Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 clay-card p-4 rounded-3xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari repositori berdasarkan nama atau deskripsi..."
            className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-full p-1 text-xs">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'public', label: 'Publik' },
                { id: 'private', label: 'Privat' },
                { id: 'archived', label: 'Arsip' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setFilterType(item.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  filterType === item.id
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updated' | 'name' | 'created')}
            className="bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-hidden focus:border-cyan-500 font-medium"
          >
            <option value="updated">Terakhir Diperbarui</option>
            <option value="name">Nama (A-Z)</option>
            <option value="created">Tanggal Dibuat</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              title="Tampilan Kotak"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              title="Tampilan Daftar"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Daftar Repositori */}
      {isLoadingRepos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-[#172033]/60 border border-white/5 animate-pulse p-4" />
          ))}
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="clay-card rounded-3xl p-12 text-center">
          <FolderGit2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tidak ada repositori yang cocok</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Coba sesuaikan kata kunci pencarian Anda, atau buat repositori baru sekarang.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.map((repo) => {
            const isFav = favorites.repos.includes(repo.full_name);
            const isActive = activeRepo?.id === repo.id;

            return (
              <div
                key={repo.id}
                className={`clay-card rounded-3xl p-5 flex flex-col justify-between transition-all hover:border-cyan-400/50 ${
                  isActive ? 'ring-2 ring-cyan-400/40 border-cyan-400/60' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {repo.private ? (
                        <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <h3
                        onClick={() => handleOpenRepo(repo)}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-300 cursor-pointer truncate"
                        title={repo.name}
                      >
                        {repo.name}
                      </h3>
                    </div>

                    <button
                      onClick={() => toggleFavoriteRepo(repo.full_name)}
                      className={`p-1 rounded-full transition-colors ${
                        isFav ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                      title={isFav ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[32px] mb-3 leading-relaxed">
                    {repo.description || 'Tidak ada deskripsi repositori.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 mb-4 font-mono">
                    {repo.language && (
                      <span className="flex items-center gap-1 text-slate-800 dark:text-slate-300 font-semibold">
                        <Code className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {repo.default_branch}
                    </span>
                    <span className="tabular-nums">
                      {(repo.size / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenRepo(repo)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-bold transition-all clay-button-rgb shadow-sm hover:opacity-90"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Jelajahi File</span>
                  </button>

                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="p-2 rounded-full bg-[#0F172A] text-slate-300 hover:text-white border border-white/10 transition-colors"
                    title="Buka di GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => {
                      setDeleteTarget(repo);
                      setDeleteConfirmText('');
                      setDeleteStep(1);
                    }}
                    className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    title="Hapus Repositori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="clay-card rounded-3xl overflow-hidden divide-y divide-white/10">
          {filteredRepos.map((repo) => {
            const isFav = favorites.repos.includes(repo.full_name);
            const isActive = activeRepo?.id === repo.id;

            return (
              <div
                key={repo.id}
                className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                  isActive ? 'bg-cyan-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleFavoriteRepo(repo.full_name)}
                    className={`p-1 rounded transition-colors ${
                      isFav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenRepo(repo)}
                        className="font-bold text-xs text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-300 truncate text-left"
                      >
                        {repo.name}
                      </button>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          repo.private
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {repo.private ? 'privat' : 'publik'}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-xl">
                        {repo.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                  <span className="hidden sm:inline font-mono">{repo.default_branch}</span>
                  <button
                    onClick={() => handleOpenRepo(repo)}
                    className="px-3 py-1 text-xs font-bold rounded-full bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                  >
                    Buka
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(repo);
                      setDeleteConfirmText('');
                      setDeleteStep(1);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    title="Hapus Repositori"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Buat Repositori Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Buat Repositori GitHub Baru
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Repositori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value.replace(/\s+/g, '-'))}
                  placeholder="misal: proyek-aplikasi-hebat"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-hidden focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Deskripsi (Opsional)</label>
                <input
                  type="text"
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  placeholder="Deskripsi singkat mengenai proyek ini"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <span className="block text-slate-700 dark:text-slate-300 font-semibold">Visibilitas</span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    onClick={() => setNewRepoPrivate(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer ${
                      !newRepoPrivate
                        ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">Publik</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Dapat dilihat siapa saja</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setNewRepoPrivate(true)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer ${
                      newRepoPrivate
                        ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-white'
                        : 'border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">Privat</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Hanya Anda yang dapat melihat</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRepoInitReadme}
                    onChange={(e) => setNewRepoInitReadme(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-900 w-4 h-4"
                  />
                  <span className="text-slate-300">Inisialisasi repositori dengan file README.md</span>
                </label>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Templat .gitignore</label>
                  <select
                    value={newRepoGitignore}
                    onChange={(e) => setNewRepoGitignore(e.target.value)}
                    className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-3 py-1.5 text-slate-200 focus:outline-hidden focus:border-cyan-400"
                  >
                    <option value="None">Tidak ada</option>
                    <option value="Node">Node.js</option>
                    <option value="Python">Python</option>
                    <option value="Java">Java</option>
                    <option value="Go">Go</option>
                    <option value="Rust">Rust</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-full text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newRepoName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-bold disabled:opacity-50 transition-colors clay-button-rgb shadow-md"
                >
                  {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isCreating ? 'Sedang Membuat...' : 'Buat Repositori'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hapus Repositori (Konfirmasi 2 Langkah) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-red-500/40">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Hapus Repositori</h2>
                <span className="text-xs text-red-500 font-mono">
                  {deleteTarget.owner.login}/{deleteTarget.name}
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-2xl text-xs text-red-200 space-y-1">
              <strong className="block text-red-100 font-bold">Peringatan Permanen</strong>
              <p className="text-[11px] text-red-300 leading-relaxed">
                Tindakan ini TIDAK DAPAT dibatalkan. Ini akan menghapus permanen repositori <strong>{deleteTarget.full_name}</strong> beserta seluruh file, riwayat commit, cabang, dan rilisnya.
              </p>
            </div>

            {deleteStep === 1 ? (
              <div className="space-y-3 text-xs">
                <p className="text-slate-700 dark:text-slate-300">
                  Ketik nama repositori <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-900 text-red-500 font-mono font-bold">{deleteTarget.name}</code> untuk konfirmasi:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Ketik nama repositori di sini"
                  className="w-full bg-white dark:bg-[#0F172A] border border-red-400 dark:border-red-500/40 rounded-2xl px-3.5 py-2 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-red-500 text-xs"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={deleteConfirmText !== deleteTarget.name}
                    onClick={() => setDeleteStep(2)}
                    className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50 transition-colors shadow-md"
                  >
                    Lanjut ke Konfirmasi Akhir
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  Apakah Anda benar-benar yakin 100%? Sistem akan memanggil GitHub API DELETE method langsung menggunakan token PAT Anda.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    className="px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteExecute}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50 transition-colors shadow-md"
                  >
                    {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{isDeleting ? 'Sedang Menghapus...' : 'Saya Mengerti, Hapus Repositori Ini'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
