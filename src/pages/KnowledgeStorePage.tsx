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
import { GlobalSearchAndIndexingView } from '@/components/Knowledge/GlobalSearchAndIndexingView';
import { MedicalKnowledgeHubView } from '@/components/Knowledge/MedicalKnowledgeHubView';
import { ArchiveUpdateManagerModal } from '@/components/Knowledge/ArchiveUpdateManagerModal';
import { KnowledgeWorkspaceAndExtensionsView } from '@/components/Knowledge/KnowledgeWorkspaceAndExtensionsView';
import {
  Archive,
  DownloadCloud,
  HardDrive,
  Globe2,
  Sparkles,
  BookOpen,
  Search,
  HeartPulse,
  RefreshCw,
  Briefcase,
} from 'lucide-react';

export default function KnowledgeStorePage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'library' | 'search' | 'medical' | 'workspace'>('catalog');
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  const [installedArchives, setInstalledArchives] = useState<ZimLibraryItem[]>([]);
  const [activeReaderArchiveId, setActiveReaderArchiveId] = useState<string | null>(null);
  const [isCatalogOnline, setIsCatalogOnline] = useState<boolean | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

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

  const checkCatalogHealth = async () => {
    try {
      const cats = await KnowledgeService.fetchCategories();
      setIsCatalogOnline(cats.length > 0);
    } catch {
      setIsCatalogOnline(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
    fetchInstalled();
    checkCatalogHealth();
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
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-[#07090e] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Decorative background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/3 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-20 dark:opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, transparent 70%)',
        }}
      />

      {/* Main content container with expansive max width for wide desktop monitors */}
      <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-medium tracking-wide text-slate-500 dark:text-zinc-500 mb-1">
              <Archive className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-600 dark:text-zinc-400">Knowledge Store</span>
              <span className="text-slate-300 dark:text-zinc-600">•</span>
              {/* Streamlined muted status indicator */}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/5 text-slate-700 dark:text-zinc-400 border border-black/10 dark:border-white/10">
                <span className={`w-1.5 h-1.5 rounded-full ${isCatalogOnline === false ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {isCatalogOnline === false ? 'Catalog Offline' : 'Catalog Online'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Knowledge Store & ZIM Archives
            </h1>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Discover, download, search with SQLite FTS5, and study offline Kiwix ZIM encyclopedias, medical guidelines, and reference libraries directly inside Noectra AI.
            </p>
          </div>

          {/* Tab Bar with integrated Updates action */}
          <div className="flex items-center p-1 rounded-2xl bg-white/90 dark:bg-[#0a0a0c]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-sm shrink-0 gap-1">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'catalog'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <Globe2 className="w-4 h-4" />
              <span>Catalog</span>
              {activeDownloadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 animate-pulse">
                  {activeDownloadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('library');
                fetchInstalled();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all relative ${activeTab === 'library'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>My Library</span>
              {installedArchives.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${activeTab === 'library'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-zinc-400'
                    }`}
                >
                  {installedArchives.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'search'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <Search className="w-4 h-4" />
              <span>Global FTS</span>
            </button>

            <button
              onClick={() => setActiveTab('medical')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'medical'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Medical Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'workspace'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Workspace & AI</span>
            </button>

            {/* Subtle Divider */}
            <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />

            {/* Inline Updates Button */}
            <button
              onClick={() => setShowUpdateModal(true)}
              className="p-1.5 rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-1 text-xs"
              title="Archive Updates (UPD-001 to UPD-003)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline pr-1 text-[11px] font-medium">Updates</span>
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
        {activeTab === 'catalog' && (
          <CatalogBrowser
            activeDownloads={downloads}
            onDownloadStarted={() => {
              fetchDownloads();
            }}
            onOpenArchiveReader={(archiveId) => {
              setActiveReaderArchiveId(archiveId);
            }}
          />
        )}

        {activeTab === 'library' && (
          <InstalledLibraryView
            archives={installedArchives}
            onRefresh={fetchInstalled}
            onOpenReader={(archiveId) => {
              setActiveReaderArchiveId(archiveId);
            }}
            onSwitchToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'search' && (
          <GlobalSearchAndIndexingView
            onOpenArticle={(archiveId) => {
              setActiveReaderArchiveId(archiveId);
            }}
          />
        )}

        {activeTab === 'medical' && <MedicalKnowledgeHubView />}

        {activeTab === 'workspace' && <KnowledgeWorkspaceAndExtensionsView />}
      </div>

      {/* Built-in Reader Modal */}
      {activeReaderArchiveId && (
        <ZimArticleReaderModal
          archiveId={activeReaderArchiveId}
          onClose={() => setActiveReaderArchiveId(null)}
        />
      )}

      {/* Archive Update Manager Modal (UPD-001 to UPD-003) */}
      {showUpdateModal && (
        <ArchiveUpdateManagerModal onClose={() => setShowUpdateModal(false)} />
      )}
    </div>
  );
}
