/**
 * FAHGIT by Faiz_Fahmi_ID
 * Master Application Shell & Capsule Layout
 * Features:
 * - Floating vertical capsule dock on left (Desktop)
 * - Floating horizontal capsule dock at bottom (Mobile/Android)
 * - Luxury pill navigation header & smooth rounded cards
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { CapsuleNav } from './components/layout/CapsuleNav';
import { TopHeader } from './components/layout/TopHeader';
import { Footer } from './components/layout/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { OfflineBanner } from './components/common/OfflineBanner';
import { UpdateModal } from './components/common/UpdateModal';

// Views
import { ConnectionView } from './components/views/ConnectionView';
import { DashboardView } from './components/views/DashboardView';
import { RepositoriesView } from './components/views/RepositoriesView';
import { RepoClonerView } from './components/views/RepoClonerView';
import { FileManagerView } from './components/views/FileManagerView';
import { CodeEditorView } from './components/views/CodeEditorView';
import { UploadCenterView } from './components/views/UploadCenterView';
import { ZipManagerView } from './components/views/ZipManagerView';
import { BranchManagerView } from './components/views/BranchManagerView';
import { CommitHistoryView } from './components/views/CommitHistoryView';
import { FavoritesView } from './components/views/FavoritesView';
import { RecentFilesView } from './components/views/RecentFilesView';
import { ActivityLogsView } from './components/views/ActivityLogsView';
import { BackupRestoreView } from './components/views/BackupRestoreView';
import { SettingsView } from './components/views/SettingsView';
import { AboutView } from './components/views/AboutView';

const MainLayout: React.FC = () => {
  const { view } = useApp();

  const renderCurrentView = () => {
    switch (view) {
      case 'dashboard':
        return <DashboardView />;
      case 'repositories':
        return <RepositoriesView />;
      case 'repo-cloner':
        return <RepoClonerView />;
      case 'file-manager':
      case 'code-editor':
        return <FileManagerView />;
      case 'upload-center':
      case 'zip-manager':
        return <UploadCenterView />;
      case 'branches':
        return <SettingsView initialTab="branches" />;
      case 'commits':
        return <CommitHistoryView />;
      case 'favorites':
        return <FavoritesView />;
      case 'recent-files':
        return <RecentFilesView />;
      case 'activity-logs':
        return <ActivityLogsView />;
      case 'backup-restore':
        return <BackupRestoreView />;
      case 'connection':
        return <SettingsView initialTab="connection" />;
      case 'settings':
        return <SettingsView initialTab="theme" />;
      case 'about':
        return <AboutView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] dark:bg-[#0A0F1D] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white relative overflow-x-hidden transition-colors duration-300">
      {/* Eye-catching RGB Clay Ambient Auras */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/15 dark:bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-1/4 w-[420px] h-[420px] bg-purple-500/15 dark:bg-purple-600/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 right-10 w-80 h-80 bg-pink-500/15 dark:bg-pink-500/8 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Pop-up Update Permanen (Wajib Bagian F) */}
      <UpdateModal />

      {/* Banner Adaptif Offline/Online (Wajib Bagian B) */}
      <OfflineBanner />

      {/* Floating Clay Capsule Navigation (Left on PC/Tablet landscape, Bottom on Android/Mobile) */}
      <CapsuleNav />

      {/* Main Content Viewport: Rata Sempurna Kanan, Kiri, Atas, Bawah Pas di Tengah */}
      <div className="flex-1 flex flex-col pb-24 md:pb-8 min-w-0 transition-all w-full">
        {/* Top Minimal Header dengan Logo F Capsule */}
        <TopHeader />

        {/* View Port Terpusat Pas di Tengah */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-4 max-w-6xl w-full mx-auto">
          {renderCurrentView()}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
