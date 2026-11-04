import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  clearLogs,
  getItems,
  getLogs,
  getSources,
  getGroups,
  markAllRead,
  refreshAllSources,
  updateItemStatus,
} from '@/lib/reader/api';
import {
  FeedGroup,
  FeedItem,
  FeedLog,
  FeedSource,
  FilterType,
  ReaderSettings,
  ViewConfigs,
  ViewType,
} from '@/lib/reader/types';
import ReaderNavbar from '@/components/Reader/ReaderNavbar';
import ReaderSidebar from '@/components/Reader/ReaderSidebar';
import CardsView from '@/components/Reader/CardsView';
import SplitListView from '@/components/Reader/SplitListView';
import MagazineView from '@/components/Reader/MagazineView';
import CompactView from '@/components/Reader/CompactView';
import ArticleViewer from '@/components/Reader/ArticleViewer';
import ReaderSettingsModal from '@/components/Reader/ReaderSettingsModal';
import ReaderLogsDrawer from '@/components/Reader/ReaderLogsDrawer';
import { toast } from 'sonner';

export default function ReaderPage() {
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [groups, setGroups] = useState<FeedGroup[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    return (localStorage.getItem('noectra_reader_view') as ViewType) || 'cards';
  });
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [unreadOnlyInMenu, setUnreadOnlyInMenu] = useState(false);

  // Settings
  const [fontSize, setFontSize] = useState<number>(() => {
    return Number(localStorage.getItem('noectra_reader_fontsize')) || 16;
  });
  const [fontFamily, setFontFamily] = useState<string>(() => {
    return localStorage.getItem('noectra_reader_fontfamily') || '"Segoe UI", sans-serif';
  });
  const [viewConfigs, setViewConfigs] = useState<ViewConfigs>(() => {
    const saved = localStorage.getItem('noectra_reader_viewconfigs');
    return saved
      ? JSON.parse(saved)
      : { showCover: true, showSnippet: true, fadeRead: true };
  });

  const handleViewChange = (v: ViewType) => {
    setCurrentView(v);
    localStorage.setItem('noectra_reader_view', v);
  };

  const handleViewConfigsChange = (cfg: ViewConfigs) => {
    setViewConfigs(cfg);
    localStorage.setItem('noectra_reader_viewconfigs', JSON.stringify(cfg));
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('noectra_reader_fontsize', size.toString());
  };

  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    localStorage.setItem('noectra_reader_fontfamily', font);
  };

  // Load subscriptions & groups
  const loadSourcesAndGroups = useCallback(async () => {
    try {
      const [srcs, grps] = await Promise.all([getSources(), getGroups()]);
      setSources(srcs);
      setGroups(grps);
    } catch {}
  }, []);

  // Load articles
  const loadArticles = useCallback(async () => {
    try {
      const itms = await getItems({
        filter: currentFilter,
        sourceId: selectedSourceId || undefined,
        groupId: selectedGroupId || undefined,
        query: searchQuery.trim() || undefined,
        limit: 120,
      });
      setItems(itms);
    } catch {}
  }, [currentFilter, selectedSourceId, selectedGroupId, searchQuery]);

  // Load logs
  const loadLogs = useCallback(async () => {
    try {
      const l = await getLogs();
      setLogs(l);
    } catch {}
  }, []);

  useEffect(() => {
    loadSourcesAndGroups();
    loadLogs();
  }, [loadSourcesAndGroups, loadLogs]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Refresh feeds
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const newCount = await refreshAllSources();
      toast.success(
        newCount > 0 ? `Fetched ${newCount} new articles` : 'All feeds are up to date'
      );
      await Promise.all([loadSourcesAndGroups(), loadArticles(), loadLogs()]);
    } catch {
      toast.error('Failed to refresh feeds');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAllRead({
        sourceId: selectedSourceId || undefined,
        groupId: selectedGroupId || undefined,
      });
      toast.success('Marked all as read');
      setItems((prev) => prev.map((item) => ({ ...item, hasRead: true })));
      loadSourcesAndGroups();
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  // Toggle read
  const handleToggleRead = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !item.hasRead;
    try {
      await updateItemStatus(item.id, { hasRead: newStatus });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, hasRead: newStatus } : i))
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => (prev ? { ...prev, hasRead: newStatus } : null));
      }
      loadSourcesAndGroups();
    } catch {}
  };

  // Toggle star
  const handleToggleStar = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !item.starred;
    try {
      await updateItemStatus(item.id, { starred: newStatus });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, starred: newStatus } : i))
      );
      if (selectedItem?.id === item.id) {
        setSelectedItem((prev) => (prev ? { ...prev, starred: newStatus } : null));
      }
    } catch {}
  };

  // Toggle hide
  const handleToggleHide = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateItemStatus(item.id, { hidden: true });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      toast.info('Article hidden');
      loadSourcesAndGroups();
    } catch {}
  };

  // Next / Previous navigation
  const currentIndex = useMemo(() => {
    if (!selectedItem) return -1;
    return items.findIndex((i) => i.id === selectedItem.id);
  }, [items, selectedItem]);

  const handlePrevItem = useCallback(() => {
    if (currentIndex > 0) {
      const prev = items[currentIndex - 1];
      setSelectedItem(prev);
      if (!prev.hasRead) handleToggleRead(prev);
    }
  }, [currentIndex, items]);

  const handleNextItem = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < items.length - 1) {
      const next = items[currentIndex + 1];
      setSelectedItem(next);
      if (!next.hasRead) handleToggleRead(next);
    }
  }, [currentIndex, items]);

  // Single-Key Keyboard Shortcuts (j, k, m, s, h, v, r, a, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (selectedItem) setSelectedItem(null);
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isLogsOpen) setIsLogsOpen(false);
        return;
      }

      if (e.key === 'j') {
        e.preventDefault();
        handleNextItem();
      } else if (e.key === 'k') {
        e.preventDefault();
        handlePrevItem();
      } else if (e.key === 'm') {
        if (selectedItem) {
          e.preventDefault();
          handleToggleRead(selectedItem);
        }
      } else if (e.key === 's') {
        if (selectedItem) {
          e.preventDefault();
          handleToggleStar(selectedItem);
        }
      } else if (e.key === 'h') {
        if (selectedItem) {
          e.preventDefault();
          handleToggleHide(selectedItem);
        }
      } else if (e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      } else if (e.key === 'a') {
        e.preventDefault();
        handleMarkAllRead();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, isSettingsOpen, isLogsOpen, handleNextItem, handlePrevItem]);

  // Sources map for instant lookup
  const sourcesMap = useMemo(() => {
    const map: Record<string, FeedSource> = {};
    sources.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [sources]);

  const totalUnreadCount = useMemo(() => {
    return sources.reduce((acc, curr) => acc + curr.unreadCount, 0);
  }, [sources]);

  const handleSelectItem = (item: FeedItem) => {
    setSelectedItem(item);
    if (!item.hasRead) {
      handleToggleRead(item);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-light-primary dark:bg-[#080b11] text-slate-900 dark:text-white">
      {/* Sidebar Subscriptions Tree */}
      <ReaderSidebar
        sources={sources}
        groups={groups}
        selectedSourceId={selectedSourceId}
        selectedGroupId={selectedGroupId}
        onSelectSource={(id) => {
          setSelectedSourceId(id);
          setSelectedGroupId(null);
        }}
        onSelectGroup={(id) => {
          setSelectedGroupId(id);
          setSelectedSourceId(null);
        }}
        onOpenAddModal={() => setIsSettingsOpen(true)}
        onOpenOpmlImport={() => setIsSettingsOpen(true)}
        onExportOpml={() => setIsSettingsOpen(true)}
        unreadOnlyInMenu={unreadOnlyInMenu}
        onToggleUnreadOnlyInMenu={() => setUnreadOnlyInMenu(!unreadOnlyInMenu)}
        totalUnreadCount={totalUnreadCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Command Bar */}
        <ReaderNavbar
          currentView={currentView}
          onViewChange={handleViewChange}
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onMarkAllRead={handleMarkAllRead}
          viewConfigs={viewConfigs}
          onViewConfigsChange={handleViewConfigsChange}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLogs={() => setIsLogsOpen(true)}
          unreadLogsCount={logs.length}
          totalUnreadCount={totalUnreadCount}
        />

        {/* Feed View Layouts */}
        <div className="relative flex-1 overflow-y-auto">
          {currentView === 'cards' && (
            <CardsView
              items={items}
              sourcesMap={sourcesMap}
              viewConfigs={viewConfigs}
              onSelectItem={handleSelectItem}
              onToggleRead={handleToggleRead}
              onToggleStar={handleToggleStar}
              onToggleHide={handleToggleHide}
            />
          )}

          {currentView === 'magazine' && (
            <MagazineView
              items={items}
              sourcesMap={sourcesMap}
              viewConfigs={viewConfigs}
              onSelectItem={handleSelectItem}
              onToggleRead={handleToggleRead}
              onToggleStar={handleToggleStar}
              onToggleHide={handleToggleHide}
            />
          )}

          {currentView === 'compact' && (
            <CompactView
              items={items}
              sourcesMap={sourcesMap}
              viewConfigs={viewConfigs}
              onSelectItem={handleSelectItem}
              onToggleRead={handleToggleRead}
              onToggleStar={handleToggleStar}
              onToggleHide={handleToggleHide}
            />
          )}

          {currentView === 'list' && (
            <SplitListView
              items={items}
              sourcesMap={sourcesMap}
              viewConfigs={viewConfigs}
              selectedItem={selectedItem}
              onSelectItem={handleSelectItem}
              onToggleRead={handleToggleRead}
              onToggleStar={handleToggleStar}
              onToggleHide={handleToggleHide}
              onPrev={currentIndex > 0 ? handlePrevItem : undefined}
              onNext={currentIndex < items.length - 1 ? handleNextItem : undefined}
              fontSize={fontSize}
              onFontSizeChange={handleFontSizeChange}
              fontFamily={fontFamily}
              onFontFamilyChange={handleFontFamilyChange}
            />
          )}

          {/* Full-Screen Reading Overlay for Cards, Magazine, and Compact views */}
          {currentView !== 'list' && selectedItem && (
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="relative w-[960px] max-w-[96vw] h-[90vh] rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl bg-white dark:bg-[#0c1017]">
                <ArticleViewer
                  item={selectedItem}
                  source={sourcesMap[selectedItem.sourceId]}
                  onClose={() => setSelectedItem(null)}
                  onPrev={currentIndex > 0 ? handlePrevItem : undefined}
                  onNext={currentIndex < items.length - 1 ? handleNextItem : undefined}
                  onToggleRead={handleToggleRead}
                  onToggleStar={handleToggleStar}
                  onToggleHide={handleToggleHide}
                  fontSize={fontSize}
                  onFontSizeChange={handleFontSizeChange}
                  fontFamily={fontFamily}
                  onFontFamilyChange={handleFontFamilyChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <ReaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sources={sources}
        groups={groups}
        onRefreshData={() => {
          loadSourcesAndGroups();
          loadArticles();
        }}
        settings={{
          defaultView: currentView,
          defaultOpenTarget: 'local',
          fontSize,
          fontFamily,
          viewConfigs,
        }}
        onUpdateSettings={(s) => {
          handleViewChange(s.defaultView);
          handleViewConfigsChange(s.viewConfigs);
          handleFontSizeChange(s.fontSize);
          handleFontFamilyChange(s.fontFamily);
        }}
      />

      {/* Activity Logs Drawer */}
      <ReaderLogsDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onClearLogs={async () => {
          await clearLogs();
          setLogs([]);
          toast.success('Logs cleared');
        }}
      />
    </div>
  );
}

