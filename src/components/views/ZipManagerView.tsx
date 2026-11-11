/**
 * FAHGIT ZIP Extractor & Deployer
 * Extracts ZIP archives safely using JSZip, inspects nested tree,
 * checks integrity, prevents path traversal attacks & zip bombs,
 * and deploys all extracted files atomically to GitHub.
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { analyzeZipArchive, ZipAnalysis } from '../../services/zip';
import { createGitBlob, createBatchCommit } from '../../services/github';
import { uint8ArrayToBase64, formatFileSize } from '../../utils/fileUtils';
import { FileIcon } from '../common/FileIcon';
import {
  FileArchive,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  RefreshCw,
  GitCommitHorizontal,
  X,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react';

export const ZipManagerView: React.FC = () => {
  const {
    token,
    activeRepo,
    activeBranch,
    currentPath,
    refreshTree,
    notify,
  } = useApp();

  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ZipAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [targetFolder, setTargetFolder] = useState(currentPath || '');
  const [commitMessage, setCommitMessage] = useState('Extract and deploy ZIP archive');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);

  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleZipFileChange = async (file: File) => {
    setSelectedZipFile(file);
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const result = await analyzeZipArchive(file);
      setAnalysis(result);
      if (!result.isValid) {
        notify('error', result.error || 'Invalid ZIP archive.', 'Analysis Failed');
      } else {
        notify('success', `ZIP extracted: ${result.totalFiles} files found.`, 'Archive Ready');
        setCommitMessage(`Extract and deploy ${file.name}`);
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Error extracting ZIP', 'Error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleItemSelection = (path: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      items: analysis.items.map((item) =>
        item.path === path ? { ...item, selected: !item.selected } : item
      ),
    });
  };

  const toggleSelectAll = (select: boolean) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      items: analysis.items.map((item) => ({ ...item, selected: select })),
    });
  };

  // Deploy to GitHub
  const handleDeployToGitHub = async () => {
    if (!token || !activeRepo || !analysis || !analysis.isValid) return;

    const filesToDeploy = analysis.items.filter((i) => !i.isDirectory && i.selected && i.data);
    if (filesToDeploy.length === 0) {
      notify('warning', 'No files selected for deployment.', 'Selection Empty');
      return;
    }

    setIsDeploying(true);
    setDeployProgress(0);

    const prefix = targetFolder.trim().replace(/^\/|\/$/g, '');
    const treeEntries: Array<{
      path: string;
      mode: '100644';
      type: 'blob';
      sha: string;
    }> = [];

    let completedBlobs = 0;

    try {
      notify('info', `Deploying ${filesToDeploy.length} extracted files...`, 'Starting Upload');

      for (const item of filesToDeploy) {
        const base64 = uint8ArrayToBase64(item.data!);
        const blob = await createGitBlob(
          token,
          activeRepo.owner.login,
          activeRepo.name,
          base64,
          'base64'
        );

        const fullPath = prefix ? `${prefix}/${item.path}` : item.path;
        treeEntries.push({
          path: fullPath,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        });

        completedBlobs++;
        setDeployProgress(Math.round((completedBlobs / filesToDeploy.length) * 80));
      }

      setDeployProgress(90);
      notify('info', 'Creating Git Tree & finalizing commit...', 'Finalizing');

      await createBatchCommit(
        token,
        activeRepo.owner.login,
        activeRepo.name,
        activeBranch,
        treeEntries,
        commitMessage.trim() || `Extract ${selectedZipFile?.name || 'ZIP archive'}`
      );

      setDeployProgress(100);
      notify(
        'success',
        `Deployed ${treeEntries.length} files successfully to ${activeBranch}!`,
        'Deployment Complete'
      );

      await refreshTree();
      // Reset
      setSelectedZipFile(null);
      setAnalysis(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Deployment failed', 'Error');
    } finally {
      setIsDeploying(false);
    }
  };

  if (!activeRepo) {
    return (
      <div className="bg-[#0F1420] border border-slate-800 rounded-xl p-12 text-center max-w-lg mx-auto">
        <FileArchive className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white">No Active Repository Selected</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
          Please select a repository to extract and deploy ZIP archives.
        </p>
      </div>
    );
  }

  const selectedCount = analysis?.items.filter((i) => !i.isDirectory && i.selected).length || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileArchive className="w-5 h-5 text-purple-400" />
            ZIP Extractor & Deployer
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Client-side ZIP extraction with path traversal defense, integrity analysis, and atomic Git tree commit.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Target:</span>
          <span className="text-blue-400 font-semibold">{activeRepo.name}</span>
          <span>({activeBranch})</span>
        </div>
      </div>

      {/* Upload ZIP Card */}
      {!analysis && (
        <div
          onClick={() => zipInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700/80 hover:border-purple-500 rounded-xl p-10 bg-[#0F1420] text-center transition-colors group cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-3 group-hover:scale-105 transition-transform">
            <FileArchive className="w-7 h-7" />
          </div>
          <h2 className="text-sm font-semibold text-white">
            Select a ZIP Archive to Extract
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            All subfolders and nested files will be read in-browser. You can inspect the structure and choose which files to upload.
          </p>

          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleZipFileChange(e.target.files[0]);
              }
            }}
          />

          <div className="mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Browse ZIP File
            </button>
          </div>
        </div>
      )}

      {/* Analysis Loading */}
      {isAnalyzing && (
        <div className="bg-[#0F1420] border border-slate-800 rounded-xl p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">Analyzing Archive Integrity & Structure...</h3>
          <p className="text-xs text-slate-400 mt-1">
            Validating paths and checking for directory traversal threats.
          </p>
        </div>
      )}

      {/* Error state */}
      {analysis && !analysis.isValid && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-6 text-red-200 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-red-100">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Archive Security or Format Error
          </div>
          <p className="text-xs leading-relaxed text-red-300">
            {analysis.error || 'The uploaded file is not a valid ZIP archive or failed security checks.'}
          </p>
          <button
            onClick={() => {
              setSelectedZipFile(null);
              setAnalysis(null);
            }}
            className="px-3.5 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
          >
            Try Another ZIP
          </button>
        </div>
      )}

      {/* Extracted Structure & Deployment Controls */}
      {analysis && analysis.isValid && (
        <div className="space-y-4">
          {/* Summary Strip */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <FileArchive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-sm">
                  {selectedZipFile?.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{analysis.totalFiles} files</span>
                  <span>·</span>
                  <span>{analysis.totalFolders} folders</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{formatFileSize(analysis.totalSize)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedZipFile(null);
                  setAnalysis(null);
                }}
                disabled={isDeploying}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleDeployToGitHub}
                disabled={isDeploying || selectedCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deploying to GitHub...</span>
                  </>
                ) : (
                  <>
                    <GitCommitHorizontal className="w-3.5 h-3.5" />
                    <span>Deploy {selectedCount} Files</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Deployment Settings */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Destination Directory in Repository
              </label>
              <input
                type="text"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                placeholder="Leave blank for root, or e.g. packages/my-app"
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-md px-3 py-1.5 text-white font-mono placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Commit Message</label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-md px-3 py-1.5 text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          {/* Progress Indicator */}
          {isDeploying && (
            <div className="bg-[#0F1420] border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Deploying blobs & building tree...</span>
                <span className="font-mono tabular-nums font-semibold text-purple-400">
                  {deployProgress}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-200"
                  style={{ width: `${deployProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Extracted Files Table */}
          <div className="bg-[#0F1420] border border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-[#0B0F17]/70 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSelectAll(selectedCount !== analysis.items.filter((i) => !i.isDirectory).length)}
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white"
                >
                  {selectedCount === analysis.items.filter((i) => !i.isDirectory).length ? (
                    <CheckSquare className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  <span>Select All Files</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Path Traversal Defenses Passed</span>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60 text-xs">
              {analysis.items.map((item) => (
                <div
                  key={item.path}
                  className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-900/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {!item.isDirectory && (
                      <button
                        onClick={() => toggleItemSelection(item.path)}
                        className="text-slate-500 hover:text-white"
                      >
                        {item.selected ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <FileIcon filename={item.path} isDirectory={item.isDirectory} />
                    <span
                      className={`font-mono truncate ${
                        item.isDirectory ? 'text-blue-300 font-semibold' : 'text-slate-200'
                      }`}
                      title={item.path}
                    >
                      {targetFolder ? `${targetFolder.replace(/^\/|\/$/g, '')}/${item.path}` : item.path}
                    </span>
                  </div>

                  <span className="text-slate-400 font-mono tabular-nums text-[11px] shrink-0">
                    {item.isDirectory ? 'DIR' : formatFileSize(item.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
