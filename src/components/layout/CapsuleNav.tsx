/**
 * FAHGIT by: Faiz_Fahmi_ID
 * Kapsul Navigasi Clay (100% Bahasa Indonesia)
 * - Mode Desktop: Menggunakan Kapsul Header Logo 'F' yang rapi & simetris di tengah atas.
 * - Mode Android / Mobile: Di Bawah Sendiri (Floating Bottom Horizontal Capsule).
 * - Tidak ada menu bundar di samping kiri tengah, sehingga website berada persis di tengah secara simetris.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AppView } from '../../types';
import {
  LayoutDashboard,
  FolderGit2,
  Files,
  UploadCloud,
  Settings,
  HelpCircle,
  Menu,
  X,
  Sparkles,
  GitFork,
} from 'lucide-react';

interface CapsuleItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  gradient: string;
}

export const CapsuleNav: React.FC = () => {
  const { view, setView } = useApp();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar pada mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileRef.current && !mobileRef.current.contains(event.target as Node)) {
        setIsOpenMobile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: CapsuleItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    },
    {
      id: 'repositories',
      label: 'Repositori',
      icon: FolderGit2,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
    },
    {
      id: 'repo-cloner',
      label: 'Klon Repo',
      icon: GitFork,
      gradient: 'from-violet-500 via-purple-500 to-indigo-600',
    },
    {
      id: 'file-manager',
      label: 'Penjelajah & Editor',
      icon: Files,
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
    },
    {
      id: 'upload-center',
      label: 'Unggah & ZIP',
      icon: UploadCloud,
      gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    },
    {
      id: 'settings',
      label: 'Pengaturan & Cabang',
      icon: Settings,
      gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    },
    {
      id: 'about',
      label: 'Tentang FAHGIT',
      icon: HelpCircle,
      gradient: 'from-fuchsia-400 via-purple-500 to-pink-500',
    },
  ];

  const getEffectiveItemId = (): AppView => {
    if (view === 'code-editor') return 'file-manager';
    if (view === 'zip-manager') return 'upload-center';
    if (view === 'branches' || view === 'connection') return 'settings';
    return view;
  };

  const effectiveId = getEffectiveItemId();
  const activeItem = navItems.find((item) => item.id === effectiveId) || navItems[0];
  const ActiveIcon = activeItem.icon;

  const handleSelectView = (targetView: AppView) => {
    setView(targetView);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* ANDROID / MOBILE: Di Bawah Sendiri (Bottom Floating Clay Capsule Dock)    */}
      {/* ========================================================================= */}
      <nav
        ref={mobileRef}
        aria-label="Navigasi Kapsul Bawah Mobile"
        className="md:hidden fixed bottom-4 inset-x-4 z-50 flex flex-col items-center"
      >
        {/* EXPANDABLE POPUP CONTAINER */}
        <div
          className={`w-full max-w-sm clay-dock rounded-3xl p-3.5 mb-2.5 border border-slate-300 dark:border-white/15 transition-all duration-300 shadow-2xl ${
            isOpenMobile
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none hidden'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-white/10 text-xs px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
              <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] font-mono">
                Menu Utama FAHGIT
              </span>
            </div>
            <button
              onClick={() => setIsOpenMobile(false)}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="Tutup Menu Mobile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {navItems.map((item) => {
              const isActive = effectiveId === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectView(item.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${
                    isActive
                      ? `bg-gradient-to-tr ${item.gradient} text-white clay-button-rgb font-bold shadow-md ring-2 ring-white/30`
                      : 'bg-slate-100 dark:bg-[#192237] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1.5" />
                  <span className="text-[10px] truncate max-w-[80px] font-semibold leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BOTTOM FLOATING CAPSULE BAR (Mengapung di bawah layar Android) */}
        <div className="clay-dock rounded-full px-3.5 py-2 flex items-center justify-between gap-3 shadow-2xl max-w-xs w-full border border-slate-300 dark:border-white/15">
          <div
            onClick={() => setIsOpenMobile(!isOpenMobile)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
          >
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-tr ${activeItem.gradient} flex items-center justify-center text-white clay-button-rgb shrink-0 shadow-sm`}
            >
              <ActiveIcon className="w-4 h-4 drop-shadow-xs" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                {activeItem.label}
              </span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-300 font-mono flex items-center gap-1 font-semibold">
                <Sparkles className="w-2.5 h-2.5" />
                FAHGIT Pro
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsOpenMobile(!isOpenMobile)}
            className={`px-4 py-2 rounded-full font-black text-xs text-white transition-all clay-button-rgb flex items-center gap-1.5 shadow-md ${
              isOpenMobile
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 ring-2 ring-white/30'
                : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:opacity-95'
            }`}
          >
            {isOpenMobile ? (
              <>
                <span>Tutup</span>
                <X className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Menu</span>
                <Menu className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
