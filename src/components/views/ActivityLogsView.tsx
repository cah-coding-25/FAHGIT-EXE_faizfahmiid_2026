/**
 * FAHGIT - Log Audit & Riwayat Aktivitas
 * 100% Bahasa Indonesia
 * Catatan audit lokal tanpa rahasia, dapat diunduh sebagai JSON,
 * dengan filter aksi dan status.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { clearActivityLogs } from '../../services/storage';
import { triggerDownload } from '../../utils/fileUtils';
import {
  ScrollText,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

export const ActivityLogsView: React.FC = () => {
  const { activityLogs, refreshActivityLogs, notify } = useApp();
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUCCESS' | 'ERROR' | 'INFO'>('ALL');

  const filteredLogs = activityLogs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (filterStatus !== 'ALL' && log.status !== filterStatus) return false;
    return true;
  });

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(activityLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    triggerDownload(blob, `fahgit-log-aktivitas-${new Date().toISOString().slice(0, 10)}.json`);
    notify('success', 'Log aktivitas berhasil diekspor ke berkas JSON.', 'Ekspor Selesai');
  };

  const handleClearLogs = async () => {
    if (window.confirm('Bersihkan seluruh catatan audit aktivitas lokal?')) {
      await clearActivityLogs();
      await refreshActivityLogs();
      notify('info', 'Seluruh log aktivitas telah dibersihkan.', 'Dibersihkan');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-cyan-400" />
            Log Aktivitas & Audit Sesi
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Catatan lokal browser untuk setiap operasi Git dan file. Nol risiko kebocoran token.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            disabled={activityLogs.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#172033] hover:bg-slate-700/80 text-slate-200 border border-white/10 text-xs font-semibold disabled:opacity-50 transition-colors clay-button-rgb shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor JSON</span>
          </button>

          <button
            onClick={handleClearLogs}
            disabled={activityLogs.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Log</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 clay-card p-3 rounded-full text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold px-2">Status:</span>
          {(['ALL', 'SUCCESS', 'ERROR', 'INFO'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterStatus === s
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'Semua' : s === 'SUCCESS' ? 'Berhasil' : s === 'ERROR' ? 'Gagal' : 'Info'}
            </button>
          ))}
        </div>

        <span className="text-slate-400 font-mono pr-3">
          {filteredLogs.length} catatan
        </span>
      </div>

      {/* Logs Table */}
      <div className="clay-card rounded-3xl overflow-hidden shadow-xl divide-y divide-white/10 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-sans">
            <ScrollText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <span>Belum ada log aktivitas yang tercatat.</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {log.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : log.status === 'ERROR' ? (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Info className="w-4 h-4 text-cyan-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white font-sans text-xs">
                      {log.action}
                    </span>
                    {log.repo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0F172A] border border-white/10 text-cyan-300">
                        {log.repo}
                      </span>
                    )}
                  </div>
                  {log.details && (
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString('id-ID')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
