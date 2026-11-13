/**
 * FAHGIT GitHub Connection & Simple Setup
 * Super beginner-friendly: Just paste GitHub PAT, 1-click connect, standard & maximum function.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  KeyRound,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Trash2,
  FolderGit2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const ConnectionView: React.FC = () => {
  const {
    token,
    user,
    scopes,
    rateLimit,
    isConnected,
    isVerifying,
    connectSimple,
    disconnectGitHub,
    refreshConnection,
    setView,
  } = useApp();

  const [inputToken, setInputToken] = useState('');
  const [rememberToken, setRememberToken] = useState(true);

  const handleSimpleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) return;
    await connectSimple(inputToken.trim(), rememberToken);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* If Already Connected -> Show Clean Profile Card */}
      {isConnected && user ? (
        <div className="space-y-6">
          <div className="bg-[#121826]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full border-2 border-white/20 shadow-lg object-cover"
                />
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {user.name || user.login}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      Terhubung
                    </span>
                  </div>
                  <a
                    href={`https://github.com/${user.login}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-slate-400 hover:text-white font-mono flex items-center justify-center sm:justify-start gap-1 mt-1"
                  >
                    @{user.login}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {user.bio && (
                    <p className="text-xs text-slate-300 mt-2 max-w-md">{user.bio}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setView('dashboard')}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-950 font-semibold text-xs hover:bg-slate-100 transition-colors shadow-md"
                >
                  <span>Buka Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => disconnectGitHub(true)}
                  className="px-3.5 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-colors"
                  title="Putuskan koneksi dan hapus token lokal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
              <div className="bg-[#0B0F17]/60 p-3.5 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Public Repos</span>
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {user.public_repos.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#0B0F17]/60 p-3.5 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Private Repos</span>
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {user.total_private_repos !== undefined ? user.total_private_repos.toLocaleString() : 'Tersedia'}
                </span>
              </div>
              <div className="bg-[#0B0F17]/60 p-3.5 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Sisa Kuota API</span>
                <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                  {rateLimit?.remaining.toLocaleString() || '5,000'}
                </span>
              </div>
              <div className="bg-[#0B0F17]/60 p-3.5 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 text-[11px] block">Status Keamanan</span>
                <span className="text-xs font-semibold text-slate-200 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Penyimpanan Lokal
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* If Not Connected -> Super Clean, Beginner-Friendly Form */
        <div className="space-y-6">
          <div className="clay-card rounded-3xl p-6 sm:p-10">
            <div className="text-center max-w-lg mx-auto mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 clay-button-rgb shadow-lg">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Hubungkan GitHub Anda
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                Cukup masukkan <strong>Personal Access Token (PAT)</strong> GitHub Anda di bawah ini untuk mulai mengelola file dan repository secara langsung. Sangat simpel, tanpa aturan rumit.
              </p>
            </div>

            <form onSubmit={handleSimpleConnect} className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-hidden focus:border-cyan-400 transition-colors shadow-inner"
                  required
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="rememberSimple"
                  checked={rememberToken}
                  onChange={(e) => setRememberToken(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 bg-slate-900 cursor-pointer w-4 h-4"
                />
                <label htmlFor="rememberSimple" className="text-xs text-slate-300 cursor-pointer select-none">
                  Ingat saya di browser ini (otomatis masuk saat buka website)
                </label>
              </div>

              <button
                type="submit"
                disabled={isVerifying || !inputToken.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs disabled:opacity-50 transition-all clay-button-rgb shadow-xl mt-3 group"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghubungkan ke GitHub...</span>
                  </>
                ) : (
                  <>
                    <span>Hubungkan Sekarang</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Simple 3-Step Guide for Beginners */}
          <div className="clay-card rounded-3xl p-6 sm:p-8">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Panduan Mudah Mendapatkan Token GitHub (1 Menit Selesai):
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="bg-[#0F172A]/80 p-4 rounded-2xl border border-white/10 clay-button-rgb">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 font-black flex items-center justify-center text-xs mb-2 shadow-sm">
                  1
                </div>
                <strong className="block text-white mb-1">Buka GitHub Tokens</strong>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Buka tautan{' '}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-cyan-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                  >
                    github.com/settings/tokens
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  lalu klik <strong>Generate new token (classic)</strong>.
                </p>
              </div>

              <div className="bg-[#0F172A]/80 p-4 rounded-2xl border border-white/10 clay-button-rgb">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-black flex items-center justify-center text-xs mb-2 shadow-sm">
                  2
                </div>
                <strong className="block text-white mb-1">Centang Izin "repo"</strong>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Beri nama (misal: <em>Fahgit</em>) dan centang kotak <strong>repo</strong> agar aplikasi bisa melihat dan mengedit file.
                </p>
              </div>

              <div className="bg-[#0F172A]/80 p-4 rounded-2xl border border-white/10 clay-button-rgb">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-slate-950 font-black flex items-center justify-center text-xs mb-2 shadow-sm">
                  3
                </div>
                <strong className="block text-white mb-1">Salin & Tempel</strong>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Klik tombol hijau <strong>Generate token</strong> di bawah, lalu salin kodenya dan tempelkan di form di atas!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
