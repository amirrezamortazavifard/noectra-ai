import React, { useState, useEffect } from 'react';
import {
  KnowledgeService,
  DownloadTask,
  ZimLibraryItem,
} from '@/lib/services/knowledge';
import { CatalogBrowser } from '@/components/Knowledge/CatalogBrowser';
import { InstalledLibraryView } from '@/components/Knowledge/InstalledLibraryView';
import { DownloadsManagerDrawer } from '@/components/Knowledge/DownloadsManagerDrawer';
import { ZimArticleReaderModal } from '@/components/Knowledge/ZimArticleReaderModal';
import {
  Archive,
  DownloadCloud,
  HardDrive,
  Globe2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export default function KnowledgeStorePage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'library'>('catalog');
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  const [installedArchives, setInstalledArchives] = useState<ZimLibraryItem[]>([]);
  const [activeReaderArchiveId, setActiveReaderArchiveId] = useState<string | null>(null);

  const fetchDownloads = async () => {
    try {
      const list = await KnowledgeService.fetchDownloads();
      setDownloads(list);
    } catch (e) {
      console.warn('Failed to fetch downloads:', e);
    }
  };

  const fetchInstalled = async () => {
    try {
      const list = await KnowledgeService.fetchLibrary();
      setInstalledArchives(list);
    } catch (e) {
      console.warn('Failed to fetch installed library:', e);
    }
  };

  useEffect(() => {
    fetchDownloads();
    fetchInstalled();
  }, []);

  // Periodic polling for downloads when active downloads exist
  useEffect(() => {
    const hasActiveDownloads = downloads.some(
      (d) => d.status === 'downloading' || d.status === 'queued'
    );
    if (!hasActiveDownloads) return;

    const interval = setInterval(() => {
      fetchDownloads();
      fetchInstalled();
    }, 1000);

    return () => clearInterval(interval);
  }, [downloads]);

  const activeDownloadCount = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued'
  ).length;

  return (
    <div className="relative min-h-screen w-full bg-slate-50/50 dark:bg-[#07090e] transition-colors duration-300">
      {/* Decorative background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/3 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-20 dark:opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
              <Archive className="w-4 h-4" />
              <span>Offline Knowledge Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Knowledge Store & ZIM Archives
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Discover, download, and browse offline Kiwix ZIM encyclopedias, medical guides, and reference libraries directly inside Noectra AI without needing a browser.
            </p>
          </div>

          {/* Tab Pill Buttons */}
          <div className="flex items-center p-1 rounded-2xl bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm shrink-0">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'catalog'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe2 className="w-4 h-4" />
              <span>Discover Catalog</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('library');
                fetchInstalled();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all relative ${
                activeTab === 'library'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>My Library</span>
              {installedArchives.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === 'library'
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {installedArchives.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Downloads Drawer (if any downloads exist) */}
        <DownloadsManagerDrawer
          tasks={downloads}
          onTasksChanged={() => {
            fetchDownloads();
            fetchInstalled();
          }}
          onOpenInstalled={() => {
            setActiveTab('library');
            fetchInstalled();
          }}
        />

        {/* Tab Content */}
        {activeTab === 'catalog' ? (
          <CatalogBrowser
            activeDownloads={downloads}
            onDownloadStarted={() => {
              fetchDownloads();
            }}
            onOpenArchiveReader={(archiveId) => {
              setActiveReaderArchiveId(archiveId);
            }}
          />
        ) : (
          <InstalledLibraryView
            archives={installedArchives}
            onRefresh={fetchInstalled}
            onOpenReader={(archiveId) => {
              setActiveReaderArchiveId(archiveId);
            }}
          />
        )}
      </div>

      {/* Built-in Reader Modal */}
      {activeReaderArchiveId && (
        <ZimArticleReaderModal
          archiveId={activeReaderArchiveId}
          onClose={() => setActiveReaderArchiveId(null)}
        />
      )}
    </div>
  );
}
