/**
 * FAHGIT - Riwayat Commit & Inspeksi Perubahan (Diff)
 * 100% Bahasa Indonesia
 * Daftar log commit, metadata penulis, berkas yang diubah, dan pratinjau kode patch.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GitCommit } from '../../types';
import { getCommits, getCommitDetails } from '../../services/github';
import {
  GitCommitHorizontal,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  FileText,
  FilePlus,
  FileMinus,
  FileDiff,
  Calendar,
  User,
  X,
  Sparkles,
} from 'lucide-react';

export const CommitHistoryView: React.FC = () => {
  const {
    token,
    activeRepo,
    activeBranch,
    notify,
  } = useApp();

  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    async function loadCommits() {
      if (!token || !activeRepo) return;
      setIsLoading(true);
      try {
        const list = await getCommits(token, activeRepo.owner.login, activeRepo.name, activeBranch, 40);
        setCommits(list);
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Gagal memuat daftar commit', 'Error');
      } finally {
        setIsLoading(false);
      }
    }
    loadCommits();
  }, [token, activeRepo, activeBranch, notify]);

  const handleSelectCommit = async (commit: GitCommit) => {
    if (!token || !activeRepo) return;
    setIsLoadingDetails(true);
    setSelectedCommit(commit);

    try {
      const details = await getCommitDetails(token, activeRepo.owner.login, activeRepo.name, commit.sha);
      setSelectedCommit(details);
    } catch {
      // Keep basic commit if detail fetch fails
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (!activeRepo) {
    return (
      <div className="clay-card rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xl">
        <GitCommitHorizontal className="w-12 h-12 text-cyan-500 dark:text-cyan-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Belum Ada Repositori Aktif</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
          Silakan pilih repositori terlebih dahulu untuk melihat riwayat commit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <GitCommitHorizontal className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Riwayat Commit
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Audit riwayat commit pada cabang <code className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">{activeBranch}</code>.
          </p>
        </div>

        <button
          onClick={async () => {
            if (!token) return;
            setIsLoading(true);
            try {
              const list = await getCommits(token, activeRepo.owner.login, activeRepo.name, activeBranch, 40);
              setCommits(list);
              notify('info', 'Riwayat commit diperbarui', 'Segarkan');
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-200 dark:bg-[#172033] hover:bg-slate-300 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 text-xs font-semibold transition-colors clay-button-rgb shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Commits List (Left Column) */}
        <div className={`space-y-2 ${selectedCommit ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
          {isLoading ? (
            <div className="clay-card rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500 mx-auto mb-2" />
              <span>Memuat commit dari GitHub...</span>
            </div>
          ) : commits.length === 0 ? (
            <div className="clay-card rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400">
              <p>Tidak ada riwayat commit pada cabang ini.</p>
            </div>
          ) : (
            commits.map((c) => {
              const isSelected = selectedCommit?.sha === c.sha;

              return (
                <div
                  key={c.sha}
                  onClick={() => handleSelectCommit(c)}
                  className={`clay-card rounded-2xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-500 dark:border-cyan-400 bg-cyan-500/10 shadow-lg ring-1 ring-cyan-400/50'
                      : 'hover:border-cyan-400/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate leading-snug">
                        {c.commit.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                          <User className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          {c.commit.author.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {new Date(c.commit.author.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 text-cyan-700 dark:text-cyan-300 font-bold">
                        {c.sha.substring(0, 7)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Commit Details / Diff Inspector (Right Column) */}
        {selectedCommit && (
          <div className="lg:col-span-6 clay-card rounded-3xl p-6 space-y-4 sticky top-6">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider block">
                  Detail Commit
                </span>
                <h3 className="font-black text-sm text-slate-900 dark:text-white mt-1 leading-snug">
                  {selectedCommit.commit.message}
                </h3>
              </div>

              <button
                onClick={() => setSelectedCommit(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-full"
                title="Tutup Detail"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#0F172A] p-3 rounded-2xl border border-slate-200 dark:border-white/10 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">SHA Penuh:</span>
                <span className="text-slate-900 dark:text-white select-all">{selectedCommit.sha.substring(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penulis:</span>
                <span className="text-slate-900 dark:text-white">{selectedCommit.commit.author.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Surel:</span>
                <span className="text-slate-900 dark:text-white">{selectedCommit.commit.author.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu:</span>
                <span className="text-slate-900 dark:text-white">
                  {new Date(selectedCommit.commit.author.date).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={selectedCommit.html_url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-cyan-700 dark:text-cyan-300 font-bold border border-slate-200 dark:border-white/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di GitHub Web</span>
              </a>
            </div>

            {/* Changed Files & Patches */}
            {isLoadingDetails ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-500 mx-auto mb-1" />
                <span>Memuat berkas & diff perubahan...</span>
              </div>
            ) : selectedCommit.files && selectedCommit.files.length > 0 ? (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Berkas yang Berubah ({selectedCommit.files.length}):
                </span>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {selectedCommit.files.map((file) => (
                    <div key={file.filename} className="bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-2xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-900 dark:text-white truncate max-w-[200px]" title={file.filename}>
                          {file.filename}
                        </span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-emerald-500 dark:text-emerald-400">+{file.additions}</span>
                          <span className="text-rose-500 dark:text-rose-400">-{file.deletions}</span>
                        </div>
                      </div>

                      {file.patch && (
                        <pre className="p-2.5 rounded-xl bg-slate-900 text-[10px] text-slate-200 overflow-x-auto font-mono max-h-36 leading-relaxed border border-slate-800">
                          {file.patch}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
