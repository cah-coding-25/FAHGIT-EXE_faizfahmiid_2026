/**
 * FAHGIT - Header Kapsul Bersih & Rapi (100% Bahasa Indonesia)
 * Logo 'F' berbentuk Kapsul Rapi (Capsule Pill) sebagai pemicu menu navigasi terpusat.
 * Warna kontras tinggi & tajam pada tema terang maupun gelap.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppView } from '../../types';
import {
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  Files,
  UploadCloud,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  ChevronDown,
  X,
  Sparkles,
  GitFork,
} from 'lucide-react';

export const TopHeader: React.FC = () => {
  const {
    activeRepo,
    activeBranch,
    branches,
    selectBranch,
    view,
    setView,
    settings,
    updateSettings,
  } = useApp();

  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const logoMenuRef = useRef<HTMLDivElement>(null);

  // Tutup popup jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (logoMenuRef.current && !logoMenuRef.current.contains(e.target as Node)) {
        setIsLogoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 6 Menu Terfokus & Terpadu
  const menuItems: Array<{ id: AppView; label: string; icon: React.ElementType; color: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-cyan-500 dark:text-cyan-400' },
    { id: 'repositories', label: 'Repositori', icon: FolderGit2, color: 'text-indigo-500 dark:text-indigo-400' },
    { id: 'repo-cloner', label: 'Klon Repositori', icon: GitFork, color: 'text-violet-500 dark:text-violet-400' },
    { id: 'file-manager', label: 'Penjelajah & Editor', icon: Files, color: 'text-amber-500 dark:text-amber-400' },
    { id: 'upload-center', label: 'Pusat Unggah & ZIP', icon: UploadCloud, color: 'text-emerald-500 dark:text-emerald-400' },
    { id: 'settings', label: 'Pengaturan & Cabang', icon: Settings, color: 'text-sky-500 dark:text-sky-400' },
    { id: 'about', label: 'Tentang Fahgit', icon: HelpCircle, color: 'text-fuchsia-500 dark:text-fuchsia-400' },
  ];

  const handleSelectView = (targetView: AppView) => {
    setView(targetView);
    setIsLogoMenuOpen(false);
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({
      theme: nextTheme,
      monacoTheme: nextTheme === 'dark' ? 'vs-dark' : 'light',
    });
  };

  // Label nama menu yang sedang aktif
  const currentViewLabel =
    menuItems.find((m) => m.id === view)?.label ||
    (view === 'code-editor' ? 'Penjelajah & Editor' : 'Fahgit Pro');

  return (
    <header className="w-full pt-4 pb-3 px-4 sm:px-8 max-w-6xl mx-auto flex items-center justify-between gap-4 relative z-40">
      {/* LOGO F BERBENTUK KAPSUL RAPI (Capsule Pill Trigger) */}
      <div ref={logoMenuRef} className="relative">
        <button
          onClick={() => setIsLogoMenuOpen(!isLogoMenuOpen)}
          className="clay-dock rounded-full px-3.5 py-1.5 flex items-center gap-2.5 shadow-lg border border-slate-300 dark:border-white/15 hover:border-cyan-500 dark:hover:border-cyan-400/40 hover:scale-[1.02] active:scale-95 transition-all group text-left focus:outline-hidden"
          title="Klik Kapsul Logo Fahgit untuk membuka Menu Navigasi"
          aria-expanded={isLogoMenuOpen}
        >
          {/* App Icon Badge */}
          <div className="w-8 h-8 relative shrink-0 flex items-center justify-center">
            <img
              src="./icon.png"
              alt="Fahgit"
              className="w-8 h-8 rounded-xl object-contain drop-shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#0A0F1D]" />
          </div>

          {/* Brand & Active Pill Status */}
          <div className="flex items-center gap-2 pr-1">
            <span className="font-black text-slate-900 dark:text-white tracking-wide text-sm font-mono group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              Fahgit
            </span>

            <span className="hidden sm:inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-medium">
              {currentViewLabel}
            </span>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-transform duration-200 ${
                isLogoMenuOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
              }`}
            />
          </div>
        </button>

        {/* POPUP MENU KAPSUL RATA KANAN-KIRI SIMETRIS */}
        {isLogoMenuOpen && (
          <div className="absolute top-14 left-0 w-72 clay-dock rounded-3xl p-3.5 shadow-2xl border border-slate-200 dark:border-white/20 animate-in fade-in zoom-in-95 duration-150 z-50">
            {/* Header Popup */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-white/10 px-2 text-xs">
              <span className="font-bold text-slate-900 dark:text-white tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                Menu Navigasi Fahgit
              </span>
              <button
                onClick={() => setIsLogoMenuOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Tutup Menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Menu Items Rata Kanan-Kiri */}
            <div className="space-y-1">
              {menuItems.map((item) => {
                const isActive =
                  view === item.id || (item.id === 'file-manager' && view === 'code-editor');
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-md'
                        : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : item.color}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Toggle Tema Gelap / Terang */}
            <div className="pt-2.5 mt-2.5 border-t border-slate-200 dark:border-white/10 px-1">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {settings.theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-600" />
                  )}
                  <span className="font-medium">{settings.theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                  Ubah
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bagian Kanan Header: Status Repositori Aktif & Tombol Cepat Tema */}
      <div className="flex items-center gap-2.5">
        {activeRepo && (
          <div className="clay-dock rounded-full px-3.5 py-1.5 text-xs shadow-md flex items-center gap-2 border border-slate-300 dark:border-white/10">
            <FolderGit2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[110px] sm:max-w-xs">
              {activeRepo.name}
            </span>
            <span className="text-slate-400 dark:text-slate-500">/</span>
            <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-mono">
              <GitBranch className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
              {branches.length > 1 ? (
                <select
                  value={activeBranch}
                  onChange={(e) => selectBranch(e.target.value)}
                  className="bg-transparent text-indigo-700 dark:text-indigo-400 border-none cursor-pointer focus:outline-hidden text-xs py-0 pl-0 pr-1 font-mono"
                  title="Ganti Branch Aktif"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{activeBranch}</span>
              )}
            </div>
          </div>
        )}

        {/* Tombol Tema Gelap / Terang */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full clay-dock flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:scale-105 transition-all shadow-md border border-slate-300 dark:border-white/10"
          title={settings.theme === 'dark' ? 'Beralih ke Tema Terang' : 'Beralih ke Tema Gelap'}
          aria-label="Toggle Tema"
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-600" />
          )}
        </button>
      </div>
    </header>
  );
};
