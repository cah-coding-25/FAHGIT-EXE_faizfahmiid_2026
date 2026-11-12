/**
 * FAHGIT - Tampilan Pengaturan Terpadu (100% Bahasa Indonesia)
 * Menampung:
 * 1. Tema Tampilan Seluruh Website (Gelap & Terang)
 * 2. Akun & Token GitHub (Koneksi, Verifikasi, Ganti Token, Pemantau Kuota REST API)
 * 3. Kelola Cabang / Branches (Beralih Cabang, Buat Cabang Baru, Hapus Cabang)
 * 4. Preferensi Editor Monaco & Keamanan Sesi
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { createBranch, deleteBranch } from '../../services/github';
import {
  Settings,
  Moon,
  Sun,
  Code2,
  Shield,
  Activity,
  RefreshCw,
  Sparkles,
  Check,
  KeyRound,
  GitBranch,
  FolderGit2,
  Trash2,
  Plus,
  LogOut,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface SettingsViewProps {
  initialTab?: 'theme' | 'connection' | 'branches' | 'editor';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'theme' }) => {
  const {
    settings,
    updateSettings,
    rateLimit,
    refreshConnection,
    isVerifying,
    token,
    user,
    scopes,
    isConnected,
    connectSimple,
    disconnectGitHub,
    activeRepo,
    activeBranch,
    branches,
    isLoadingBranches,
    selectBranch,
    refreshTree,
    notify,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'theme' | 'connection' | 'branches' | 'editor'>(
    initialTab
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Token GitHub Form State
  const [newTokenInput, setNewTokenInput] = useState('');
  const [rememberToken, setRememberToken] = useState(true);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);

  // Kelola Cabang State
  const [isCreateBranchModal, setIsCreateBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [sourceBranch, setSourceBranch] = useState(activeBranch || 'main');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<string | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  useEffect(() => {
    if (activeBranch) {
      setSourceBranch(activeBranch);
    }
  }, [activeBranch]);

  // Simpan / Perbarui Token GitHub
  const handleUpdateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenInput.trim()) return;

    setIsUpdatingToken(true);
    try {
      const ok = await connectSimple(newTokenInput.trim(), rememberToken);
      if (ok) {
        setNewTokenInput('');
        notify('success', 'Token GitHub berhasil diperbarui dan diverifikasi!', 'Token Aktif');
      }
    } finally {
      setIsUpdatingToken(false);
    }
  };

  // Buat Cabang Baru
  const handleCreateBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo || !newBranchName.trim()) return;

    const src = branches.find((b) => b.name === sourceBranch) || branches[0];
    if (!src) {
      notify('error', 'Cabang sumber tidak ditemukan.', 'Error');
      return;
    }

    setIsCreatingBranch(true);
    try {
      await createBranch(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        newBranchName.trim(),
        src.commit.sha
      );

      notify('success', `Cabang '${newBranchName.trim()}' berhasil dibuat!`, 'Cabang Dibuat');
      setIsCreateBranchModal(false);
      setNewBranchName('');
      await selectBranch(newBranchName.trim());
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal membuat cabang', 'Error');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // Hapus Cabang
  const handleDeleteBranchSubmit = async () => {
    if (!token || !activeRepo || !deleteBranchTarget) return;

    if (deleteBranchTarget === activeRepo.default_branch) {
      notify('error', 'Tidak dapat menghapus cabang standar (default branch).', 'Aksi Ditolak');
      return;
    }

    setIsDeletingBranch(true);
    try {
      await deleteBranch(token, activeRepo.owner.login, activeRepo.name, deleteBranchTarget);
      notify('success', `Cabang '${deleteBranchTarget}' berhasil dihapus.`, 'Cabang Dihapus');
      setDeleteBranchTarget(null);

      if (activeBranch === deleteBranchTarget) {
        await selectBranch(activeRepo.default_branch);
      } else {
        await refreshTree();
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal menghapus cabang', 'Error');
    } finally {
      setIsDeletingBranch(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Halaman Pengaturan */}
      <div className="pb-3 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Pengaturan Platform & Cabang
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Kelola tema tampilan seluruh website, akun & token GitHub, cabang (branches), dan preferensi editor.
          </p>
        </div>
      </div>

      {/* Navigasi Tab Pengaturan */}
      <div className="flex items-center gap-2 bg-slate-200/80 dark:bg-[#0F172A] p-1.5 rounded-2xl border border-slate-300 dark:border-white/10 max-w-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'theme'
              ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 clay-button-rgb shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Tema Seluruh Website</span>
        </button>

        <button
          onClick={() => setActiveTab('connection')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'connection'
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 clay-button-rgb shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Akun & Token GitHub</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'branches'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white clay-button-rgb shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Kelola Cabang</span>
        </button>

        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'editor'
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 clay-button-rgb shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Editor & Keamanan</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TEMA TAMPILAN SELURUH WEBSITE                                      */}
      {/* ========================================================================= */}
      {activeTab === 'theme' && (
        <div className="clay-card rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Tema Tampilan Seluruh Website
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Tema ini berlaku untuk seluruh latar belakang website, kartu claymorphic, navbar kapsul, editor, dan teks.
              </p>
            </div>
            <span className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 font-bold px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Aktif: {settings.theme === 'dark' ? 'Tema Gelap' : 'Tema Terang'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Tombol Tema Gelap */}
            <div
              onClick={() => {
                updateSettings({ theme: 'dark', monacoTheme: 'vs-dark' });
              }}
              className={`p-5 rounded-3xl cursor-pointer transition-all border clay-card ${
                settings.theme === 'dark'
                  ? 'border-cyan-500 ring-2 ring-cyan-500/40 shadow-xl'
                  : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md">
                  <Moon className="w-5 h-5" />
                </div>
                {settings.theme === 'dark' && (
                  <span className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Tema Gelap (Dark Mode)</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Nuansa semi-dark bernada deep space (#0A0F1D) dengan aksen RGB cerah, pencahayaan claymorphic lembut, dan aura glowing yang memanjakan mata developer.
              </p>
            </div>

            {/* Tombol Tema Terang */}
            <div
              onClick={() => {
                updateSettings({ theme: 'light', monacoTheme: 'light' });
              }}
              className={`p-5 rounded-3xl cursor-pointer transition-all border clay-card ${
                settings.theme === 'light'
                  ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-xl'
                  : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
                  <Sun className="w-5 h-5" />
                </div>
                {settings.theme === 'light' && (
                  <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Tema Terang (Light Mode)</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Nuansa bersih, segar, dan terang (#EEF2F6) dengan kartu clay putih bersinar, teks kontras tinggi yang tajam, dan elemen visual cerah yang estetik.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AKUN & TOKEN GITHUB                                               */}
      {/* ========================================================================= */}
      {activeTab === 'connection' && (
        <div className="space-y-6">
          {/* Status Akun GitHub */}
          {isConnected && user ? (
            <div className="clay-card rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full border-2 border-cyan-500 dark:border-cyan-400 object-cover shadow-lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{user.name || user.login}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        Terhubung
                      </span>
                    </div>
                    <a
                      href={`https://github.com/${user.login}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline font-mono inline-flex items-center gap-1 mt-0.5"
                    >
                      @{user.login}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => disconnectGitHub(true)}
                  className="px-4 py-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-center"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan Akun</span>
                </button>
              </div>

              {/* Scopes & Rate Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/5">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] block mb-1">Izin Token (Scopes):</span>
                  <div className="flex flex-wrap gap-1">
                    {scopes.length > 0 ? (
                      scopes.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 font-mono text-[10px] border border-cyan-500/20"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">Izin default publik</span>
                    )}
                  </div>
                </div>

                {rateLimit && (
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/5">
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] block mb-1">Sisa Kuota API:</span>
                    <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="clay-card rounded-3xl p-6 text-center space-y-3 shadow-xl">
              <KeyRound className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Terhubung ke GitHub</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Masukkan Personal Access Token (PAT) GitHub Anda di bawah untuk mengelola repositori dan berkas secara visual.
              </p>
            </div>
          )}

          {/* Form Perbarui / Ganti Token PAT GitHub */}
          <div className="clay-card rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                {isConnected ? 'Ganti Token GitHub' : 'Hubungkan Token GitHub'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Token disimpan secara aman di peramban lokal Anda dan tidak dikirimkan ke server backend mana pun.
              </p>
            </div>

            <form onSubmit={handleUpdateToken} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  GitHub Personal Access Token (classic atau fine-grained):
                </label>
                <input
                  type="password"
                  required
                  value={newTokenInput}
                  onChange={(e) => setNewTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx atau github_pat_..."
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-hidden focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberToken}
                    onChange={(e) => setRememberToken(e.target.checked)}
                    className="rounded border-slate-400 dark:border-slate-700 text-cyan-500 bg-white dark:bg-slate-900 w-4 h-4"
                  />
                  <span>Ingat token di penyimpanan lokal browser</span>
                </label>

                <button
                  type="submit"
                  disabled={isUpdatingToken || !newTokenInput.trim()}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-black text-xs clay-button-rgb shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingToken ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                      <span>Verifikasi & Simpan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KELOLA CABANG (BRANCHES)                                           */}
      {/* ========================================================================= */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="clay-card rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Daftar Cabang Repositori ({activeRepo?.name || 'Pilih Repositori'})
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Beralih cabang aktif, buat cabang baru dari SHA, atau hapus cabang yang sudah tidak digunakan.
                </p>
              </div>

              <button
                onClick={() => setIsCreateBranchModal(true)}
                disabled={!activeRepo}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs clay-button-rgb shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 self-start sm:self-center disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Cabang Baru</span>
              </button>
            </div>

            {/* List Branches */}
            <div className="space-y-2 pt-1">
              {branches.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  {isLoadingBranches
                    ? 'Memuat daftar cabang...'
                    : 'Belum ada cabang terdeteksi atau pilih repositori terlebih dahulu.'}
                </div>
              ) : (
                branches.map((b) => {
                  const isCurrent = b.name === activeBranch;
                  const isDefault = b.name === activeRepo?.default_branch;

                  return (
                    <div
                      key={b.name}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-500/15 border-indigo-400/40 text-slate-900 dark:text-white'
                          : 'bg-slate-100 dark:bg-[#0F172A] border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch
                          className={`w-4 h-4 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{b.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                                Aktif
                              </span>
                            )}
                            {isDefault && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                Utama
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            SHA: {b.commit.sha.substring(0, 7)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <button
                            onClick={() => selectBranch(b.name)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            Jadikan Aktif
                          </button>
                        )}

                        {!isDefault && (
                          <button
                            onClick={() => setDeleteBranchTarget(b.name)}
                            className="p-1.5 rounded-xl hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                            title="Hapus Cabang"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PREFERENSI EDITOR & KEAMANAN SESI                                 */}
      {/* ========================================================================= */}
      {activeTab === 'editor' && (
        <div className="clay-card rounded-3xl p-6 shadow-xl space-y-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
            <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Preferensi Monaco Code Editor
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Ukuran Font Editor (px)
              </label>
              <select
                value={settings.monacoFontSize}
                onChange={(e) => updateSettings({ monacoFontSize: parseInt(e.target.value, 10) })}
                className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-200 focus:outline-hidden focus:border-cyan-400 font-mono"
              >
                <option value="12">12 px (Ringkas)</option>
                <option value="14">14 px (Standar)</option>
                <option value="16">16 px (Nyaman)</option>
                <option value="18">18 px (Besar)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Pembungkus Teks (Word Wrap)
              </label>
              <select
                value={settings.wordWrap}
                onChange={(e) => updateSettings({ wordWrap: e.target.value as 'on' | 'off' })}
                className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-3.5 py-2.5 text-slate-200 focus:outline-hidden focus:border-cyan-400"
              >
                <option value="on">Aktif (Bungkus baris panjang)</option>
                <option value="off">Nonaktif (Scroll horizontal)</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 pt-4">
              <input
                type="checkbox"
                id="minimapToggle"
                checked={settings.minimap}
                onChange={(e) => updateSettings({ minimap: e.target.checked })}
                className="rounded border-slate-400 dark:border-slate-700 text-cyan-500 focus:ring-0 bg-white dark:bg-slate-900 cursor-pointer w-4 h-4"
              />
              <label htmlFor="minimapToggle" className="text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer select-none">
                Tampilkan minimap kode di sisi kanan editor
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Cabang Baru */}
      {isCreateBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Buat Cabang Baru
              </h3>
              <button
                onClick={() => setIsCreateBranchModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranchSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Cabang Baru:
                </label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="contoh: fitur-pembayaran"
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bercabang Dari:
                </label>
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-cyan-400 font-mono"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBranchModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBranch || !newBranchName.trim()}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs clay-button-rgb shadow-md hover:scale-105"
                >
                  {isCreatingBranch ? 'Membuat...' : 'Buat Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Cabang */}
      {deleteBranchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="clay-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/20 space-y-4">
            <h3 className="text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Hapus Cabang?
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus cabang <strong>{deleteBranchTarget}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteBranchTarget(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteBranchSubmit}
                disabled={isDeletingBranch}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs shadow-md hover:scale-105"
              >
                {isDeletingBranch ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
