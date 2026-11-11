/**
 * FAHGIT Platform Footer
 * Identity: FAHGIT by: Faiz_Fahmi_ID
 * Tagline: Your GitHub. Your Files. Your Control.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  const { isConnected, isLocked, vaultInfo } = useApp();

  return (
    <footer className="border-t border-slate-800/40 dark:border-white/10 bg-transparent px-4 sm:px-8 py-4 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 max-w-6xl w-full mx-auto">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-900 dark:text-white font-mono">FAHGIT</span>
        <span className="text-slate-400 dark:text-slate-600">·</span>
        <span className="text-slate-600 dark:text-slate-400">by: <strong className="font-semibold text-slate-800 dark:text-slate-200">Faiz_Fahmi_ID</strong></span>
        <span className="hidden md:inline text-slate-400 dark:text-slate-600">·</span>
        <span className="hidden md:inline text-slate-600 dark:text-slate-400">Your GitHub. Your Files. Your Control.</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-mono">
        {isConnected ? (
          <div className="flex items-center gap-1.5 text-emerald-400 font-sans font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Terhubung ke GitHub API</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 font-sans">
            <Cpu className="w-3.5 h-3.5" />
            <span>Direct Client-Side HTTPS</span>
          </div>
        )}
        <span className="text-slate-700">|</span>
        <span className="text-slate-400">v1.0.0 Capsule</span>
      </div>
    </footer>
  );
};
