/**
 * FAHGIT Sidebar Navigation Component
 * Features all 15 navigation views, active repository selector, lock toggle, and Faiz_Fahmi_ID branding.
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { AppView } from '../../types';
import {
  LayoutDashboard,
  FolderGit2,
  Files,
  Code2,
  UploadCloud,
  FileArchive,
  GitBranch,
  GitCommitHorizontal,
  Star,
  Clock,
  ScrollText,
  Database,
  KeyRound,
  Settings,
  HelpCircle,
  Lock,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  requireRepo?: boolean;
}

export const Sidebar: React.FC<{ isOpenMobile: boolean; onCloseMobile: () => void }> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const {
    view,
    setView,
    user,
    isConnected,
    isLocked,
    lockApplication,
    repos,
    activeRepo,
    selectRepo,
    editorTabs,
    favorites,
  } = useApp();

  const dirtyTabsCount = editorTabs.filter((t) => t.isDirty).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'repositories', label: 'Repositories', icon: FolderGit2, badge: repos.length || undefined },
    { id: 'file-manager', label: 'File Manager', icon: Files, requireRepo: true },
    {
      id: 'code-editor',
      label: 'Code Editor',
      icon: Code2,
      badge: editorTabs.length > 0 ? `${editorTabs.length}${dirtyTabsCount ? '*' : ''}` : undefined,
    },
    { id: 'upload-center', label: 'Upload Center', icon: UploadCloud, requireRepo: true },
    { id: 'zip-manager', label: 'ZIP Manager', icon: FileArchive, requireRepo: true },
    { id: 'branches', label: 'Branch Manager', icon: GitBranch, requireRepo: true },
    { id: 'commits', label: 'Commit History', icon: GitCommitHorizontal, requireRepo: true },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Star,
      badge: (favorites.repos.length + favorites.files.length) || undefined,
    },
    { id: 'recent-files', label: 'Recent Files', icon: Clock },
    { id: 'activity-logs', label: 'Activity Logs', icon: ScrollText },
    { id: 'backup-restore', label: 'Backup & Restore', icon: Database },
    { id: 'connection', label: 'GitHub Connection', icon: KeyRound },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'about', label: 'About FAHGIT', icon: HelpCircle },
  ];

  const handleNavClick = (targetView: AppView) => {
    setView(targetView);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-[#0D121D] border-r border-slate-800/80 transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm ring-1 ring-white/10 group-hover:scale-105 transition-transform">
              F
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-tight text-base font-mono">FAHGIT</span>
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">by: Faiz_Fahmi_ID</p>
            </div>
          </button>

          {isConnected && (
            <button
              onClick={lockApplication}
              title="Lock Application Vault"
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 rounded-md transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Active Repository Switcher */}
        {isConnected && (
          <div className="p-3 border-b border-slate-800/60 bg-[#0B0F17]/50 shrink-0">
            <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1.5 block">
              Active Repository
            </label>
            <div className="relative">
              <select
                value={activeRepo ? activeRepo.full_name : ''}
                onChange={(e) => {
                  const selected = repos.find((r) => r.full_name === e.target.value);
                  if (selected) selectRepo(selected);
                }}
                className="w-full bg-[#131926] border border-slate-700/80 text-xs text-slate-200 rounded-md px-2.5 py-1.5 pr-8 truncate focus:outline-hidden focus:border-blue-500 appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  {repos.length === 0 ? 'No repositories found' : 'Select a repository...'}
                </option>
                {repos.map((r) => (
                  <option key={r.id} value={r.full_name}>
                    {r.name} {r.private ? '(private)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {activeRepo && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[170px]" title={activeRepo.full_name}>
                  {activeRepo.owner.login}/{activeRepo.name}
                </span>
                <a
                  href={activeRepo.html_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-blue-400 transition-colors p-0.5"
                  title="Open on GitHub"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = view === item.id;
            const Icon = item.icon;
            const isRepoDisabled = item.requireRepo && !activeRepo;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                disabled={isRepoDisabled}
                title={isRepoDisabled ? 'Select a repository first' : item.label}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : isRepoDisabled
                    ? 'text-slate-600 cursor-not-allowed opacity-60'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium shrink-0 ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account / Connection Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0A0E17] shrink-0">
          {isConnected && user ? (
            <div className="flex items-center gap-2.5">
              <img
                src={user.avatar_url}
                alt={user.login}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-slate-700/80 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {user.name || user.login}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  @{user.login}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{isLocked ? 'Vault Locked' : 'Not Connected'}</span>
              </div>
              <button
                onClick={() => handleNavClick('connection')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                {isLocked ? 'Unlock' : 'Connect'}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
