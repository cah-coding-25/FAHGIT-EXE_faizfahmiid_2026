/**
 * FAHGIT - Editor Kode Monaco Profesional
 * 100% Bahasa Indonesia
 * Editor multi-tab, penanda dirty state, pratinjau Markdown & HTML interaktif,
 * pemformat JSON otomatis, dan dialog commit langsung ke GitHub.
 */

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useApp } from '../../context/AppContext';
import { FileIcon } from '../common/FileIcon';
import {
  Save,
  X,
  FileCode,
  Eye,
  RefreshCw,
  GitCommitHorizontal,
  RotateCcw,
  AlignLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const CodeEditorView: React.FC = () => {
  const {
    editorTabs,
    activeTabId,
    setActiveTabId,
    updateTabContent,
    closeEditorTab,
    saveActiveEditorTab,
    activeRepo,
    activeBranch,
    settings,
    notify,
  } = useApp();

  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  const handleEditorChange = (value: string | undefined) => {
    if (activeTabId && value !== undefined) {
      updateTabContent(activeTabId, value);
    }
  };

  const handleSaveClick = () => {
    if (!activeTab) return;
    setCommitMessage(`Perbarui ${activeTab.name}`);
    setIsCommitModalOpen(true);
  };

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await saveActiveEditorTab(commitMessage);
      if (success) {
        setIsCommitModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    if (!activeTab) return;
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      setTimeout(() => setConfirmDiscard(false), 4000);
      return;
    }
    updateTabContent(activeTab.id, activeTab.originalContent);
    setConfirmDiscard(false);
    notify('info', `Perubahan pada ${activeTab.name} telah dibatalkan`, 'Dibatalkan');
  };

  const formatJson = () => {
    if (!activeTab || activeTab.language !== 'json') return;
    try {
      const parsed = JSON.parse(activeTab.content);
      const formatted = JSON.stringify(parsed, null, 2);
      updateTabContent(activeTab.id, formatted);
      notify('success', 'Format JSON berhasil dirapikan.', 'Format Selesai');
    } catch {
      notify('error', 'Sintaks JSON tidak valid. Tidak dapat diformat.', 'Kesalahan Sintaks');
    }
  };

  if (editorTabs.length === 0 || !activeTab) {
    return (
      <div className="clay-card rounded-3xl p-16 text-center max-w-xl mx-auto shadow-xl">
        <FileCode className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Belum Ada File Terbuka di Editor</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
          Buka file dari <strong>Penjelajah File</strong> untuk mulai membaca kode, mengedit, dan melakukan commit langsung ke GitHub.
        </p>
      </div>
    );
  }

  const isMarkdown = activeTab.name.endsWith('.md') || activeTab.name.endsWith('.markdown');
  const isHtml = activeTab.name.endsWith('.html') || activeTab.name.endsWith('.htm');

  return (
    <div
      className={`flex flex-col clay-card rounded-3xl overflow-hidden shadow-2xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[calc(100vh-140px)]'
      }`}
    >
      {/* Editor Tabs Strip */}
      <div className="flex items-center justify-between bg-[#0F172A] border-b border-white/10 px-3 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 py-2 overflow-x-auto max-w-[80%]">
          {editorTabs.map((tab) => {
            const isActive = tab.id === activeTabId;

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-md'
                    : 'bg-[#172033] text-slate-300 hover:text-white hover:bg-slate-700/60 border border-white/5'
                }`}
              >
                <FileIcon filename={tab.name} className="w-3.5 h-3.5" />
                <span className="truncate max-w-[130px]" title={tab.path}>
                  {tab.name}
                </span>

                {/* Dirty Indicator / Close Button */}
                {tab.isDirty ? (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" title="Perubahan belum disimpan" />
                ) : null}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeEditorTab(tab.id);
                  }}
                  className="p-0.5 rounded-full hover:bg-black/20 transition-colors"
                  aria-label="Tutup tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Controls in Top Bar */}
        <div className="flex items-center gap-1.5 py-2">
          {activeTab.language === 'json' && (
            <button
              onClick={formatJson}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 text-xs flex items-center gap-1"
              title="Rapikan Format JSON"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {(isMarkdown || isHtml) && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                showPreview
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={showPreview ? 'Sembunyikan Pratinjau' : 'Tampilkan Pratinjau'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Pratinjau</span>
            </button>
          )}

          {activeTab.isDirty && (
            <button
              onClick={handleDiscardChanges}
              className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-colors ${
                confirmDiscard
                  ? 'bg-rose-500/20 text-rose-400 font-bold'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
              }`}
              title="Batalkan Perubahan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {confirmDiscard && <span className="text-[11px]">Konfirmasi?</span>}
            </button>
          )}

          <button
            onClick={handleSaveClick}
            disabled={!activeTab.isDirty}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-md clay-button-rgb ${
              activeTab.isDirty
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan ke GitHub</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 text-xs"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Main Canvas & Optional Preview Split */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className={`h-full ${showPreview ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>
          <Editor
            height="100%"
            language={activeTab.language}
            theme={settings.monacoTheme || 'vs-dark'}
            value={activeTab.content}
            onChange={handleEditorChange}
            options={{
              fontSize: settings.monacoFontSize || 14,
              minimap: { enabled: settings.minimap ?? true },
              wordWrap: settings.wordWrap || 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              readOnly: activeTab.readOnly || activeTab.isBinary,
            }}
          />
        </div>

        {/* Live Preview Pane */}
        {showPreview && (
          <div className="w-1/2 h-full bg-[#0F172A] overflow-y-auto p-4 text-xs text-slate-200">
            {isMarkdown ? (
              <div className="prose prose-invert max-w-none text-slate-200 space-y-3 leading-relaxed">
                <div className="p-2.5 bg-[#172033] rounded-xl border border-white/10 mb-4 text-[11px] text-cyan-300 font-mono">
                  Pratinjau Langsung Markdown
                </div>
                <div className="whitespace-pre-wrap font-sans">
                  {activeTab.content}
                </div>
              </div>
            ) : isHtml ? (
              <div className="h-full flex flex-col">
                <div className="text-[11px] text-slate-400 pb-2">Pratinjau HTML Terisolasi (Sandbox)</div>
                <iframe
                  title="HTML Preview"
                  sandbox="allow-scripts"
                  srcDoc={activeTab.content}
                  className="w-full flex-1 bg-white rounded-2xl border border-white/20"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-7 bg-[#0F172A] border-t border-white/10 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-bold">{activeTab.path}</span>
          <span>·</span>
          <span className="text-cyan-400">{activeTab.language}</span>
          {activeTab.isDirty && <span className="text-amber-400 font-bold">• Diedit</span>}
        </div>
        <div className="flex items-center gap-3">
          <span>Cabang: <strong className="text-indigo-400">{activeBranch}</strong></span>
          <span>SHA: {activeTab.sha.substring(0, 7)}</span>
        </div>
      </div>

      {/* Modal: Save & Commit Dialog */}
      {isCommitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="clay-card rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-white/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitCommitHorizontal className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Commit Perubahan ke GitHub
              </h2>
              <button onClick={() => setIsCommitModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCommitSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Cabang Target</label>
                <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 font-mono text-cyan-700 dark:text-cyan-300">
                  {activeBranch}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Pesan Commit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="misal: Perbarui komponen header, perbaiki bug"
                  className="w-full bg-white dark:bg-[#0F172A] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 text-xs"
                  required
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <span className="block text-cyan-700 dark:text-cyan-300 font-bold">Verifikasi Commit Aman:</span>
                <p className="leading-relaxed">
                  FAHGIT memeriksa SHA file terbaru sebelum melakukan commit. Jika file telah diubah dari tempat lain, sistem akan memberi peringatan konflik.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCommitModalOpen(false)}
                  className="px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !commitMessage.trim()}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:opacity-95 text-white font-bold disabled:opacity-50 transition-colors clay-button-rgb shadow-md"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan & Commit Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
