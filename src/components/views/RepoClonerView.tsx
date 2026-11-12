/**
 * FAHGIT - Klon Repositori GitHub
 * By: Faiz_Fahmi_ID
 *
 * Menu khusus untuk mengkloning seluruh isi repositori GitHub orang lain
 * dan mengunggahnya secara langsung ke repositori pribadi pengguna,
 * lengkap dengan persentase progres real-time dan tanda selesai.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GitFork,
  Copy,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FolderGit2,
  Sparkles,
  DownloadCloud,
  UploadCloud,
  Star,
  Lock,
  Globe,
  RefreshCw,
  Terminal,
  Files,
  Layers,
  ArrowDownToLine,
  Check,
} from 'lucide-react';
import {
  parseGitHubRepoUrl,
  fetchSourceRepoMetadata,
  executeCloneRepository,
  SourceRepoInfo,
  CloneProgress,
  CloneResult,
} from '../../services/repoCloner';

import { getUserRepos, getBranches } from '../../services/github';
import { GitHubBranch } from '../../types';

export const RepoClonerView: React.FC = () => {
  const { token, repos, refreshRepos, selectRepo, setView } = useApp();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Input State
  const [sourceInput, setSourceInput] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [sourceRepo, setSourceRepo] = useState<SourceRepoInfo | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Target Destination State
  const [targetMode, setTargetMode] = useState<'new' | 'existing'>('new');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [selectedExistingRepoId, setSelectedExistingRepoId] = useState<number | null>(null);
  const [existingRepoBranches, setExistingRepoBranches] = useState<GitHubBranch[]>([]);
  const [selectedTargetBranch, setSelectedTargetBranch] = useState('main');

  // Cloning Execution State
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState<CloneProgress | null>(null);
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // Quick paste from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSourceInput(text.trim());
        inspectRepository(text.trim());
      }
    } catch {
      // ignore clipboard error
    }
  };

  // Inspect Source Repository
  const inspectRepository = async (inputUrl = sourceInput) => {
    const parsed = parseGitHubRepoUrl(inputUrl);
    if (!parsed) {
      setInspectError('Format tautan tidak valid. Gunakan format seperti: https://github.com/owner/repo atau owner/repo');
      setSourceRepo(null);
      return;
    }

    setIsInspecting(true);
    setInspectError(null);
    setCloneResult(null);
    setCloneError(null);

    try {
      const data = await fetchSourceRepoMetadata(parsed.owner, parsed.repo, token || undefined);
      setSourceRepo(data);
      // Auto-fill new repo name defaults
      setNewRepoName(data.repo);
      setNewRepoDesc(`Cloned from ${data.fullName} via FAHGIT by Faiz_Fahmi_ID`);
    } catch (err) {
      setSourceRepo(null);
      setInspectError(err instanceof Error ? err.message : 'Gagal memeriksa repositori sumber');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSelectExistingRepo = async (repoId: number) => {
    setSelectedExistingRepoId(repoId || null);
    setExistingRepoBranches([]);
    const found = repos.find((r) => r.id === repoId);
    if (!found) return;

    setSelectedTargetBranch(found.default_branch || 'main');
    if (token) {
      try {
        const branchList = await getBranches(token, found.owner.login, found.name);
        setExistingRepoBranches(branchList);
        if (branchList.length > 0 && !branchList.some((b) => b.name === found.default_branch)) {
          setSelectedTargetBranch(branchList[0].name);
        }
      } catch {
        // Repo bisa saja masih kosong (0 branch), pakai default_branch
      }
    }
  };

  // Trigger cloning execution
  const handleStartClone = async () => {
    if (!token) {
      setCloneError('Anda harus menghubungkan GitHub Personal Access Token terlebih dahulu.');
      return;
    }

    if (!sourceRepo) {
      setCloneError('Silakan periksa dan pastikan repositori sumber valid terlebih dahulu.');
      return;
    }

    if (!isOnline) {
      setCloneError('Kloning repositori membutuhkan koneksi internet aktif.');
      return;
    }

    if (targetMode === 'new' && !newRepoName.trim()) {
      setCloneError('Nama repositori baru tidak boleh kosong.');
      return;
    }

    if (targetMode === 'existing' && !selectedExistingRepoId) {
      setCloneError('Pilih salah satu repositori pribadi yang sudah ada sebagai wadah.');
      return;
    }

    setIsCloning(true);
    setCloneError(null);
    setCloneResult(null);
    setProgress({
      percentage: 5,
      stage: 'Memulai proses kloning repositori...',
    });

    try {
      const existingRepoObj =
        targetMode === 'existing'
          ? repos.find((r) => r.id === selectedExistingRepoId)
          : undefined;

      const result = await executeCloneRepository({
        token,
        sourceRepo,
        sourceBranch: sourceRepo.defaultBranch,
        isCreateNewRepo: targetMode === 'new',
        targetRepoName: newRepoName.trim().replace(/\s+/g, '-'),
        targetRepoDescription: newRepoDesc.trim(),
        targetIsPrivate: newRepoPrivate,
        existingTargetRepo: existingRepoObj,
        targetBranch:
          targetMode === 'existing'
            ? selectedTargetBranch.trim() || existingRepoObj?.default_branch || 'main'
            : sourceRepo.defaultBranch,
        onProgress: (p) => setProgress(p),
      });

      setCloneResult(result);
      await refreshRepos();
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengkloning repositori.');
    } finally {
      setIsCloning(false);
    }
  };

  // Reset form to clone another
  const handleResetForm = () => {
    setSourceInput('');
    setSourceRepo(null);
    setInspectError(null);
    setCloneResult(null);
    setCloneError(null);
    setProgress(null);
  };

  // Open the newly cloned repo in File Manager
  const handleOpenInFileManager = async () => {
    if (!cloneResult) return;
    let repoMatch = repos.find((r) => r.full_name === cloneResult.destinationRepo);
    if (!repoMatch && token) {
      try {
        const latestRepos = await getUserRepos(token);
        repoMatch = latestRepos.find((r) => r.full_name === cloneResult.destinationRepo);
      } catch {
        // fallback silently
      }
    }
    if (repoMatch) {
      await selectRepo(repoMatch);
    }
    setView('file-manager');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Utama Kloning */}
      <div className="clay-card-glow rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-violet-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shrink-0 clay-button-rgb">
              <GitFork className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  Klon Repositori GitHub
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-400/30 uppercase tracking-wider font-mono">
                  Auto Transfer Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                Salin seluruh berkas dan struktur folder repositori GitHub orang lain langsung ke akun pribadi Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              100% Client-Side HTTPS
            </span>
          </div>
        </div>
      </div>

      {/* Peringatan Token jika belum terhubung */}
      {!token && (
        <div className="clay-card rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5 flex items-start gap-3.5 text-amber-800 dark:text-amber-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Hubungkan Akun GitHub Terlebih Dahulu</p>
            <p className="text-slate-600 dark:text-slate-400">
              Untuk mengunggah hasil kloning ke akun Anda, Personal Access Token (PAT) dengan hak akses repositori diperlukan.
            </p>
            <button
              onClick={() => setView('connection')}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Hubungkan Token GitHub
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TANDA SELESAI / HASIL SUKSES KLONING */}
      {cloneResult && (
        <div className="clay-card-glow rounded-3xl p-6 sm:p-8 border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  <span>Kloning Repositori Selesai 100%!</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                    SUKSES
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Seluruh berkas dan struktur folder berhasil disalin dan diunggah ke repositori pribadi Anda.
                </p>
              </div>
            </div>

            {/* Ringkasan Hasil */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="clay-card rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Repositori Target</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono truncate">
                  {cloneResult.destinationRepo}
                </p>
              </div>

              <div className="clay-card rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Total Berkas Dipindahkan</span>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {cloneResult.totalFilesCloned} Berkas & Folder
                </p>
              </div>

              <div className="clay-card rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Cabang Git Target</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  {cloneResult.branch}
                </p>
              </div>
            </div>

            {/* Tombol Aksi Pasca Kloning */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenInFileManager}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/25 flex items-center gap-2 transition-all active:scale-95"
              >
                <Files className="w-4 h-4" />
                Buka di Penjelajah & Editor FAHGIT
              </button>

              <a
                href={cloneResult.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="clay-button px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-2 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Lihat di GitHub
              </a>

              <button
                onClick={handleResetForm}
                className="clay-button px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-all ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Kloning Repositori Lain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORM UTAMA: 2 LANGKAH SEDERHANA */}
      {!cloneResult && (
        <div className="space-y-6">
          {/* LANGKAH 1: TEMPEL LINK REPOSITORI SUMBER */}
          <div className="clay-card rounded-3xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-bold font-mono flex items-center justify-center">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                  Tempel Tautan Repositori GitHub yang Ingin Dikloning
                </h2>
              </div>

              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                Publik atau Privat
              </span>
            </div>

            {/* Input Bar & Tombol Paste / Periksa */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <GitFork className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') inspectRepository();
                    }}
                    placeholder="Contoh: https://github.com/facebook/react atau username/nama-repo"
                    disabled={isCloning}
                    className="w-full pl-10 pr-24 py-3 rounded-2xl text-xs font-mono bg-white dark:bg-[#0E1528] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-violet-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    disabled={isCloning}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl text-[11px] font-bold font-mono text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Tempel
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => inspectRepository()}
                  disabled={isInspecting || isCloning || !sourceInput.trim()}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 shadow-md shadow-violet-500/20 flex items-center gap-2 shrink-0 transition-all active:scale-95"
                >
                  {isInspecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Memeriksa...
                    </>
                  ) : (
                    <>
                      Periksa
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

              {inspectError && (
                <p className="text-xs text-rose-500 flex items-center gap-1.5 font-medium pl-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {inspectError}
                </p>
              )}
            </div>

            {/* Kartu Pratinjau Repositori Sumber */}
            {sourceRepo && (
              <div className="clay-card rounded-2xl p-4 sm:p-5 border border-violet-500/30 bg-violet-500/5 space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black text-sm shrink-0 font-mono">
                      {sourceRepo.owner.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                        <span>{sourceRepo.fullName}</span>
                        {sourceRepo.isPrivate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            <Lock className="w-2.5 h-2.5" />
                            Privat
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            <Globe className="w-2.5 h-2.5" />
                            Publik
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {sourceRepo.description || 'Tidak ada deskripsi.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400 self-start sm:self-center">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {sourceRepo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5 text-cyan-500" />
                      {sourceRepo.forks}
                    </span>
                    {sourceRepo.language && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                        {sourceRepo.language}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <span>Cabang Utama: <strong className="text-slate-900 dark:text-white">{sourceRepo.defaultBranch}</strong></span>
                  <span>Ukuran: <strong className="text-slate-900 dark:text-white">~{(sourceRepo.sizeKb / 1024).toFixed(1)} MB</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* LANGKAH 2: PILIH WADAH REPOSITORI PRIBADI */}
          <div className="clay-card rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono flex items-center justify-center">
                  2
                </span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                  Pilih Wadah Repositori Pribadi Anda
                </h2>
              </div>
            </div>

            {/* Pilihan Mode Wadah (Baru vs Ada) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetMode('new')}
                disabled={isCloning}
                className={`clay-card rounded-2xl p-4 text-left border transition-all ${
                  targetMode === 'new'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono">
                    Rekomendasi
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Buat Repositori Baru Otomatis</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Membuat repositori baru di akun Anda khusus untuk menampung seluruh berkas hasil kloning.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('existing')}
                disabled={isCloning}
                className={`clay-card rounded-2xl p-4 text-left border transition-all ${
                  targetMode === 'existing'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Gunakan Repositori yang Sudah Ada</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Pindahkan seluruh berkas ke salah satu repositori pribadi yang sudah Anda miliki saat ini.
                </p>
              </button>
            </div>

            {/* Form Mode A: Buat Repositori Baru */}
            {targetMode === 'new' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Repositori Baru di Akun Anda:
                  </label>
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="nama-repositori-anda"
                    disabled={isCloning}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-mono bg-white dark:bg-[#0E1528] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Deskripsi Repositori:
                  </label>
                  <input
                    type="text"
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="Deskripsi singkat repositori..."
                    disabled={isCloning}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-mono bg-white dark:bg-[#0E1528] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Toggle Visibilitas */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Visibilitas Repositori Baru:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRepoPrivate(false)}
                      disabled={isCloning}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                        !newRepoPrivate
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Publik
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRepoPrivate(true)}
                      disabled={isCloning}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                        newRepoPrivate
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Privat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form Mode B: Pilih Repositori yang Ada */}
            {targetMode === 'existing' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pilih Repositori Milik Anda:
                  </label>
                  <select
                    value={selectedExistingRepoId || ''}
                    onChange={(e) => handleSelectExistingRepo(Number(e.target.value))}
                    disabled={isCloning}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-mono bg-white dark:bg-[#0E1528] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">-- Pilih Salah Satu Repositori Anda --</option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.private ? '(Privat)' : '(Publik)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cabang Git Target (otomatis menyesuaikan cabang repo atau buat baru):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={selectedTargetBranch}
                      onChange={(e) => setSelectedTargetBranch(e.target.value)}
                      placeholder="main"
                      disabled={isCloning}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-mono bg-white dark:bg-[#0E1528] border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                    />
                    {existingRepoBranches.length > 0 && (
                      <select
                        value={selectedTargetBranch}
                        onChange={(e) => setSelectedTargetBranch(e.target.value)}
                        disabled={isCloning}
                        className="px-3 py-2.5 rounded-xl text-xs font-mono bg-white dark:bg-[#0E1528] border border-slate-300 dark:border-white/10 text-indigo-600 dark:text-indigo-300 focus:outline-hidden focus:border-indigo-500"
                      >
                        {existingRepoBranches.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STATUS PROGRES REAL-TIME & PROGRESS BAR */}
          {isCloning && progress && (
            <div className="clay-card-glow rounded-3xl p-6 sm:p-7 space-y-4 border border-violet-500/30 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-violet-500 animate-spin" />
                  {progress.stage}
                </span>
                <span className="text-lg font-black font-mono text-violet-600 dark:text-violet-400">
                  {progress.percentage}%
                </span>
              </div>

              {/* Progress Bar Persentase */}
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              {progress.currentFile && (
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  Memproses: {progress.currentFile}
                </p>
              )}
            </div>
          )}

          {cloneError && (
            <div className="clay-card rounded-2xl p-4 border border-rose-500/30 bg-rose-500/5 flex items-center gap-2.5 text-xs text-rose-500 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cloneError}</span>
            </div>
          )}

          {/* TOMBOL AKSI UTAMA KLONING REPOSITORI */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartClone}
              disabled={isCloning || !sourceRepo || !token || !isOnline}
              className="w-full py-4 px-6 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:via-indigo-500 hover:to-cyan-500 disabled:opacity-50 shadow-xl shadow-indigo-500/25 clay-button-rgb flex items-center justify-center gap-3 transition-all active:scale-[0.99] font-mono tracking-wide"
            >
              {isCloning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Sedang Mengkloning Repositori... ({progress?.percentage || 0}%)
                </>
              ) : (
                <>
                  <GitFork className="w-5 h-5" />
                  Mulai Kloning Repositori Sekarang
                  <ArrowRight className="w-5 h-5 ml-1" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2">
              Seluruh berkas dan folder akan diunduh dan di-commit langsung ke repositori pribadi Anda.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
