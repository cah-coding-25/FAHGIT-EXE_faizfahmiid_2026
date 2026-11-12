/**
 * FAHGIT - Tampilan Dashboard Utama
 * 100% Bahasa Indonesia
 * Desain Semi-Dark Claymorphism dengan aksen RGB cerah yang menarik:
 * - Electric Cyan, Neon Purple, Emerald, Coral Pink, dan Gold
 * - Kartu clay 3D yang lembut dan taktil
 * - Irama 3 Kartu Bawah yang senada dengan referensi gambar arsitektural
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FolderGit2,
  ArrowRight,
  ArrowUpRight,
  Files,
  Code2,
  UploadCloud,
  FileArchive,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  GitFork,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    repos,
    activeRepo,
    selectRepo,
    setView,
    isConnected,
  } = useApp();

  const [activeRepoIndex, setActiveRepoIndex] = useState(0);

  const currentFeaturedRepo = repos.length > 0 ? (activeRepo || repos[activeRepoIndex % repos.length]) : null;

  const handleNextRepo = () => {
    if (repos.length === 0) return;
    const nextIdx = (activeRepoIndex + 1) % repos.length;
    setActiveRepoIndex(nextIdx);
    selectRepo(repos[nextIdx]);
  };

  const handlePrevRepo = () => {
    if (repos.length === 0) return;
    const prevIdx = (activeRepoIndex - 1 + repos.length) % repos.length;
    setActiveRepoIndex(prevIdx);
    selectRepo(repos[prevIdx]);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 lg:pb-8">
      {/* ============================================================== */}
      {/* 1. HERO SECTION (Semi-Dark Clay + Aksen RGB Cerah)             */}
      {/* ============================================================== */}
      <section className="relative rounded-3xl overflow-hidden clay-card-glow p-8 sm:p-12">
        {/* Luminous RGB Ambient Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/20 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-to-tr from-pink-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>PLATFORM PENGELOLA REPOSITORI & BERKAS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Your GitHub. <br />
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-300 dark:via-blue-400 dark:to-pink-400 bg-clip-text text-transparent">
              Under Total Control.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
            Kelola repositori dan seluruh berkas GitHub Anda dengan antarmuka visual yang modern, simpel, dan ramah bagi pemula. Buka folder bertingkat, edit kode dengan Monaco Editor, serta unggah dan ekstrak berkas ZIP secara instan.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => setView(isConnected ? 'repositories' : 'connection')}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs transition-all clay-button-rgb shadow-lg group"
            >
              <span>{isConnected ? 'Jelajahi Repositori' : 'Mulai Hubungkan GitHub'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setView('about')}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-slate-100 dark:bg-[#1F2B44] hover:bg-slate-200 dark:hover:bg-[#253352] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 font-bold text-xs transition-colors clay-button-rgb"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Tentang FAHGIT</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. THREE CLAY CARDS (Irama Sesuai Screenshot Referensi)        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Kartu Kiri: Repositori Utama Pilihan (5 Cols) */}
        <div className="lg:col-span-5 clay-card rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-4">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                REPOSITORI UTAMA
              </span>
              <span className="font-mono text-[11px] tabular-nums font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-[#0F172A] px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/10">
                {repos.length > 0
                  ? `${String(activeRepoIndex + 1).padStart(2, '0')} / ${String(repos.length).padStart(2, '0')}`
                  : '00 / 00'}
              </span>
            </div>

            {currentFeaturedRepo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl clay-button-rgb shrink-0">
                    <FolderGit2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-base text-slate-900 dark:text-white truncate" title={currentFeaturedRepo.name}>
                      {currentFeaturedRepo.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                      <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{currentFeaturedRepo.private ? 'Privat' : 'Publik'}</span>
                      <span className="text-slate-400 dark:text-slate-500">·</span>
                      <span className="text-slate-600 dark:text-slate-300">{currentFeaturedRepo.default_branch}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 min-h-[34px]">
                  {currentFeaturedRepo.description || 'Tidak ada deskripsi pada repositori ini.'}
                </p>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      selectRepo(currentFeaturedRepo);
                      setView('file-manager');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold clay-button-rgb hover:opacity-90 transition-all group"
                  >
                    <span>Buka Penjelajah File</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                <FolderGit2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
                <p className="font-medium text-slate-700 dark:text-slate-300">Belum ada repositori terhubung.</p>
                <button
                  onClick={() => setView('connection')}
                  className="inline-block mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs clay-button-rgb shadow-sm"
                >
                  Hubungkan Token GitHub
                </button>
              </div>
            )}
          </div>

          {/* Kontrol Navigasi Repositori Sebelumnya / Selanjutnya */}
          {repos.length > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
              <span className="text-[11px] text-slate-400 font-mono">
                {repos.length} total repositori
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevRepo}
                  className="w-8 h-8 rounded-full bg-[#1F2B44] hover:bg-[#283858] flex items-center justify-center text-slate-300 hover:text-white transition-colors border border-white/10 clay-button-rgb"
                  aria-label="Repositori Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextRepo}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 font-black flex items-center justify-center transition-transform hover:scale-105 clay-button-rgb"
                  aria-label="Repositori Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Kartu Tengah: Metrik Statistik Ringkas (4 Cols) */}
        <div className="lg:col-span-4 clay-card rounded-3xl p-6 flex flex-col justify-around">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A]/70 rounded-2xl border border-slate-200 dark:border-white/10 clay-button-rgb">
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono tabular-nums">
                {repos.length}
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                Total Repositori
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A]/70 rounded-2xl border border-slate-200 dark:border-white/10 clay-button-rgb">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                100%
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                Klien Langsung
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A]/70 rounded-2xl border border-slate-200 dark:border-white/10 clay-button-rgb">
              <div className="text-2xl font-black text-pink-600 dark:text-pink-400 font-mono tabular-nums">
                30+
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                Format Berkas Kode
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-[#0F172A]/70 rounded-2xl border border-slate-200 dark:border-white/10 clay-button-rgb">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                ZIP
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                Ekstraktor Otomatis
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Penyimpanan aman lokal langsung di browser Anda.</span>
          </div>
        </div>

        {/* Kartu Kanan: Tombol Aksi Cepat dengan Panah Melingkar (3 Cols) */}
        <div
          onClick={() => setView('upload-center')}
          className="lg:col-span-3 clay-card rounded-3xl p-6 flex flex-col justify-between cursor-pointer hover:border-cyan-500/50 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white clay-button-rgb shadow-md">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shadow-lg font-bold">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1.5 mt-6">
            <h3 className="font-black text-slate-900 dark:text-white text-base group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              Pusat Unggah & ZIP
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Unggah file tunggal, folder bertingkat, atau ekstrak ZIP langsung.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. UBIN CLAY RGB UNTUK NAVIGASI CEPAT                         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => setView('repo-cloner')}
          className="p-4 rounded-3xl clay-card hover:border-violet-500/50 text-left transition-all group relative overflow-hidden"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform clay-button-rgb shadow-sm">
            <GitFork className="w-5 h-5" />
          </div>
          <strong className="block text-slate-900 dark:text-white text-xs font-bold flex items-center gap-1.5">
            <span>Klon Repo</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-300 font-bold">BARU</span>
          </strong>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Salin repo GitHub orang lain</span>
        </button>

        <button
          onClick={() => setView('file-manager')}
          className="p-4 rounded-3xl clay-card hover:border-amber-400/40 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform clay-button-rgb shadow-sm">
            <Files className="w-5 h-5" />
          </div>
          <strong className="block text-slate-900 dark:text-white text-xs font-bold">Penjelajah & Editor</strong>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Jelajahi & edit kode seketika</span>
        </button>

        <button
          onClick={() => setView('repositories')}
          className="p-4 rounded-3xl clay-card hover:border-indigo-400/40 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform clay-button-rgb shadow-sm">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <strong className="block text-slate-900 dark:text-white text-xs font-bold">Repositori</strong>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Daftar & buat repo baru</span>
        </button>

        <button
          onClick={() => setView('upload-center')}
          className="p-4 rounded-3xl clay-card hover:border-emerald-400/40 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform clay-button-rgb shadow-sm">
            <UploadCloud className="w-5 h-5" />
          </div>
          <strong className="block text-slate-900 dark:text-white text-xs font-bold">Unggah & ZIP</strong>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Berkas, folder & ekstrak ZIP</span>
        </button>

        <button
          onClick={() => setView('settings')}
          className="p-4 rounded-3xl clay-card hover:border-cyan-400/40 text-left transition-all group col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform clay-button-rgb shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <strong className="block text-slate-900 dark:text-white text-xs font-bold">Pengaturan</strong>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">Tema, token & cabang</span>
        </button>
      </div>
    </div>
  );
};
