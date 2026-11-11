/**
 * FAHGIT - Pengelola Cabang (Branch Manager)
 * 100% Bahasa Indonesia
 * Buat branch baru dari commit SHA, beralih branch aktif,
 * dan hapus branch dengan aman melalui GitHub Git References API.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { createBranch, deleteBranch } from '../../services/github';
import {
  GitBranch,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  FolderGit2,
  X,
  AlertTriangle,
} from 'lucide-react';

export const BranchManagerView: React.FC = () => {
  const {
    token,
    activeRepo,
    activeBranch,
    branches,
    isLoadingBranches,
    selectBranch,
    refreshTree,
    notify,
  } = useApp();

  const [isCreateModal, setIsCreateModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [sourceBranch, setSourceBranch] = useState(activeBranch);
  const [isCreating, setIsCreating] = useState(false);

  // Delete branch modal
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !activeRepo || !newBranchName.trim()) return;

    // Find the SHA of the source branch
    const src = branches.find((b) => b.name === sourceBranch) || branches[0];
    if (!src) {
      notify('error', 'Cabang sumber tidak ditemukan.', 'Error');
      return;
    }

    setIsCreating(true);
    try {
      await createBranch(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        newBranchName.trim(),
        src.commit.sha
      );

      notify('success', `Cabang '${newBranchName.trim()}' berhasil dibuat!`, 'Cabang Dibuat');
      setIsCreateModal(false);
      setNewBranchName('');
      await selectBranch(newBranchName.trim());
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal membuat cabang baru', 'Gagal');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!token || !activeRepo || !deleteTarget) return;

    if (deleteTarget === activeRepo.default_branch) {
      notify('error', 'Tidak dapat menghapus cabang standar (default branch).', 'Aksi Ditolak');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteBranch(token, activeRepo.owner.login, activeRepo.name, deleteTarget);
      notify('success', `Cabang '${deleteTarget}' berhasil dihapus.`, 'Cabang Dihapus');
      setDeleteTarget(null);

      if (activeBranch === deleteTarget) {
        await selectBranch(activeRepo.default_branch);
      } else {
        await refreshTree();
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal menghapus cabang', 'Gagal');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeRepo) {
    return (
      <div className="clay-card rounded-3xl p-12 text-center max-w-lg mx-auto shadow-xl">
        <GitBranch className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white">Belum Ada Repositori Aktif</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
          Silakan pilih repositori terlebih dahulu untuk melihat dan mengelola cabang (branch).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            Pengelola Cabang (Branches)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Beralih cabang aktif, buat cabang baru dari commit SHA, atau hapus cabang yang sudah tidak terpakai.
          </p>
        </div>

        <button
          onClick={() => {
            setSourceBranch(activeBranch);
            setIsCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:opacity-95 text-slate-950 font-bold text-xs transition-all clay-button-rgb shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Cabang Baru</span>
        </button>
      </div>

      {/* Branches List */}
      <div className="clay-card rounded-3xl overflow-hidden shadow-xl divide-y divide-white/10">
        <div className="p-4 bg-[#0F172A]/70 text-xs font-bold text-slate-400 flex items-center justify-between">
          <span>{branches.length} Cabang dalam {activeRepo.name}</span>
          <span>Standar: <strong className="text-cyan-400 font-mono">{activeRepo.default_branch}</strong></span>
        </div>

        {isLoadingBranches ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
            <span>Memuat referensi cabang dari GitHub...</span>
          </div>
        ) : (
          branches.map((b) => {
            const isCurrent = b.name === activeBranch;
            const isDefault = b.name === activeRepo.default_branch;

            return (
              <div
                key={b.name}
                className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                  isCurrent ? 'bg-cyan-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GitBranch
                    className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-cyan-400' : 'text-slate-500'}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {b.name}
                      </span>
                      {isDefault && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                          standar
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          aktif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Commit: {b.commit.sha.substring(0, 7)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isCurrent && (
                    <button
                      onClick={() => selectBranch(b.name)}
                      className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#0F172A] hover:bg-slate-800 text-slate-200 border border-white/10 transition-colors"
                    >
                      Beralih ke Cabang Ini
                    </button>
                  )}

                  {!isDefault && (
                    <button
                      onClick={() => setDeleteTarget(b.name)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Hapus Cabang"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Buat Cabang Baru */}
      {isCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-white/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Buat Cabang (Branch) Baru
              </h2>
              <button
                onClick={() => setIsCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nama Cabang Baru <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value.replace(/\s+/g, '-'))}
                  placeholder="misal: feature/tampilan-baru, bugfix-login"
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-3.5 py-2 text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Bercabang dari (Sumber SHA)
                </label>
                <select
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-2xl px-3.5 py-2 text-slate-200 font-mono focus:outline-hidden focus:border-cyan-400"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name} className="bg-slate-900">
                      {b.name} ({b.commit.sha.substring(0, 7)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModal(false)}
                  className="px-4 py-2 rounded-full text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newBranchName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-bold disabled:opacity-50 transition-colors clay-button-rgb shadow-md"
                >
                  {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{isCreating ? 'Sedang Membuat...' : 'Buat Cabang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hapus Cabang */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-red-500/40">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Hapus Cabang (Branch)</h2>
                <span className="text-xs text-red-400 font-mono">{deleteTarget}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus referensi cabang <strong>{deleteTarget}</strong> dari GitHub? Tindakan ini permanen.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-full text-slate-300 hover:text-white text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSubmit}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50 transition-colors text-xs shadow-md"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Sedang Menghapus...' : 'Hapus Cabang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
