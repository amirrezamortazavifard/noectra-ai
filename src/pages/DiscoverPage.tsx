'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Globe2,
  BookOpen,
  Newspaper,
  Search,
  X,
  Key,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Radio,
  RotateCcw,
  ChevronDown,
  Activity,
  SlidersHorizontal,
  Bookmark,
  SidebarClose,
  SidebarOpen,
} from 'lucide-react';
import { GlassDropdown, DropdownItem } from '@/components/Discover/GlassDropdown';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DiscoverFeedItem,
  IntelligenceFeedMode,
  SourceStatusInfo,
  TrendingTopicStat,
  SavedDiscoverItem,
  QueueDiscoverItem,
  FollowedTopic,
  DiscoverCategory,
  DiscoverSource,
} from '@/lib/services/discover/types';
import {
  fetchDiscoverFeed,
  fetchDiscoverStatus,
  fetchDiscoverTrending,
  fetchSavedItems,
  saveDiscoverItem,
  deleteSavedItem,
  fetchReadingQueue,
  addToReadingQueue,
  updateQueueStatus,
  removeFromReadingQueue,
  fetchFollowedTopics,
  followTopic,
  unfollowTopic,
} from '@/lib/services/discover/intelligenceApi';
import { TopicStoriesStrip } from '@/components/Discover/TopicStoriesStrip';
import { DiscoverNavSubbar } from '@/components/Discover/DiscoverNavSubbar';
import { IntelligencePulseSidebar } from '@/components/Discover/IntelligencePulseSidebar';
import { FeaturedIntelligenceCard } from '@/components/Discover/Cards/FeaturedIntelligenceCard';
import { ScientificPaperCard } from '@/components/Discover/Cards/ScientificPaperCard';
import { BreakingNewsCard } from '@/components/Discover/Cards/BreakingNewsCard';
import { ModelReleaseCard } from '@/components/Discover/Cards/ModelReleaseCard';
import { AiExplainModal } from '@/components/Discover/Modals/AiExplainModal';
import { PaperComparisonModal } from '@/components/Discover/Modals/PaperComparisonModal';
import { DailyBriefingModal } from '@/components/Discover/Modals/DailyBriefingModal';
import { DiscoverCommandPalette } from '@/components/Discover/Modals/DiscoverCommandPalette';
import ArticleReaderModal from '@/components/Discover/ArticleReaderModal';
import DiscoverApiKeysModal from '@/components/Discover/DiscoverApiKeysModal';
import { useNavigate } from 'react-router-dom';

// Categories for Category Filter
const categoryOptions: DiscoverCategory[] = [
  { key: 'all', display: 'All Disciplines', icon: '🌐' },
  { key: 'medical_cv', display: 'Medical AI & CV', icon: '🩺' },
  { key: 'ai', display: 'Artificial Intelligence', icon: '🤖' },
  { key: 'cs', display: 'Computer Science', icon: '💻' },
  { key: 'science', display: 'Science & Physics', icon: '🚀' },
  { key: 'health', display: 'Healthcare & Clinical', icon: '🧬' },
  { key: 'tech', display: 'Industry Technology', icon: '⚡' },
];

// Sources for Source Filter
const sourceOptions: DiscoverSource[] = [
  { key: 'all', display: 'All Verified Feeds', type: 'rss' },
  { key: 'arxiv_cv', display: 'arXiv Computer Vision (cs.CV)', type: 'academic' },
  { key: 'arxiv_ai', display: 'arXiv Artificial Intelligence', type: 'academic' },
  { key: 'nature', display: 'Nature Journal', type: 'academic' },
  { key: 'science_mag', display: 'Science Magazine', type: 'academic' },
  { key: 'medpage', display: 'MedPage Today', type: 'rss' },
  { key: 'sciencedaily_ai', display: 'ScienceDaily AI', type: 'rss' },
  { key: 'mit_tech', display: 'MIT Tech Review', type: 'rss' },
  { key: 'techcrunch', display: 'TechCrunch AI', type: 'rss' },
  { key: 'wired', display: 'Wired AI & Science', type: 'rss' },
  { key: 'arstechnica', display: 'Ars Technica', type: 'rss' },
];

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();

  // Core Feed State
  const [feedMode, setFeedMode] = useState<IntelligenceFeedMode>('for_you');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTopic, setActiveTopic] = useState<string>('all');
  const [activeSource, setActiveSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');

  // Feed Items & Pagination
  const [items, setItems] = useState<DiscoverFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(16);

  // Persistence State
  const [savedItems, setSavedItems] = useState<SavedDiscoverItem[]>([]);
  const [readingQueue, setReadingQueue] = useState<QueueDiscoverItem[]>([]);
  const [followedTopics, setFollowedTopics] = useState<FollowedTopic[]>([]);

  // Telemetry & Trends
  const [sourcesStatus, setSourcesStatus] = useState<SourceStatusInfo[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [totalSources, setTotalSources] = useState<number>(0);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopicStat[]>([]);

  // Modals & Panels
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<DiscoverFeedItem | null>(null);
  const [selectedExplainItem, setSelectedExplainItem] = useState<DiscoverFeedItem | null>(null);
  const [comparingPapers, setComparingPapers] = useState<DiscoverFeedItem[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState<boolean>(false);

  const fetchIdRef = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Keyboard Shortcuts (Ctrl+K, R, Esc)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        loadFeed();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // ---------------------------------------------------------------------------
  // Load Saved Items, Reading Queue, Followed Topics & Telemetry
  // ---------------------------------------------------------------------------
  const refreshUserData = useCallback(async () => {
    try {
      const [saved, queue, topics, statusRes, trendRes] = await Promise.all([
        fetchSavedItems().catch(() => []),
        fetchReadingQueue().catch(() => []),
        fetchFollowedTopics().catch(() => []),
        fetchDiscoverStatus().catch(() => null),
        fetchDiscoverTrending().catch(() => null),
      ]);

      setSavedItems(saved);
      setReadingQueue(queue);
      setFollowedTopics(topics);

      if (statusRes) {
        setSourcesStatus(statusRes.sources || []);
        setOnlineCount(statusRes.onlineCount || 0);
        setTotalSources(statusRes.totalCount || 0);
      }

      if (trendRes && trendRes.trends) {
        setTrendingTopics(trendRes.trends);
      }
    } catch (err) {
      console.warn('Telemetry fetch error:', err);
    }
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // ---------------------------------------------------------------------------
  // Main Feed Content Loader
  // ---------------------------------------------------------------------------
  const loadFeed = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);

    try {
      if (feedMode === 'saved') {
        const saved = await fetchSavedItems();
        if (currentFetchId === fetchIdRef.current) {
          const feedItems: DiscoverFeedItem[] = saved.map((s) => s.dataJson || {
            id: s.id,
            itemType: s.itemType as any,
            title: s.title,
            description: '',
            url: s.url,
            source: s.source,
            sourceId: 'saved',
            publishedAt: s.savedAt,
            category: 'saved',
            authors: [],
            openAccess: false,
            peerReviewed: false,
            readingTimeMin: 3,
            tags: ['Saved'],
            whyRelevant: ['Saved by you'],
            relevanceScore: 100,
          });
          setItems(feedItems);
          setLoading(false);
        }
        return;
      }

      if (feedMode === 'queue') {
        const queue = await fetchReadingQueue();
        if (currentFetchId === fetchIdRef.current) {
          const feedItems: DiscoverFeedItem[] = queue.map((q) => q.dataJson || {
            id: q.id,
            itemType: q.itemType as any,
            title: q.title,
            description: '',
            url: q.url,
            source: q.source,
            sourceId: 'queue',
            publishedAt: q.addedAt,
            category: 'queue',
            authors: [],
            openAccess: false,
            peerReviewed: false,
            readingTimeMin: 3,
            tags: [q.isRead ? 'Completed' : 'Queued'],
            whyRelevant: ['In your reading queue'],
            relevanceScore: 100,
          });
          setItems(feedItems);
          setLoading(false);
        }
        return;
      }

      const res = await fetchDiscoverFeed({
        mode: feedMode,
        category: activeCategory !== 'all' ? activeCategory : undefined,
        topic: activeTopic !== 'all' ? activeTopic : undefined,
        source: activeSource !== 'all' ? activeSource : undefined,
        query: submittedQuery.trim() || undefined,
        limit: 40,
        offset: 0,
      });

      if (currentFetchId === fetchIdRef.current) {
        setItems(res.items);
      }
    } catch (err: any) {
      if (currentFetchId === fetchIdRef.current) {
        console.error('Discover fetch error:', err);
        toast.error(err.message || 'Failed to load intelligence feed');
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [feedMode, activeCategory, activeTopic, activeSource, submittedQuery]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Reset pagination on filter changes
  useEffect(() => {
    setVisibleCount(16);
  }, [feedMode, activeCategory, activeTopic, activeSource, submittedQuery]);

  // ---------------------------------------------------------------------------
  // User Actions (Save, Queue, Compare, Chat)
  // ---------------------------------------------------------------------------
  const handleToggleSave = async (item: DiscoverFeedItem) => {
    const isSaved = savedItems.some((s) => s.id === item.id);
    if (isSaved) {
      await deleteSavedItem(item.id);
      setSavedItems((prev) => prev.filter((s) => s.id !== item.id));
      toast.success('Removed from saved bookmarks');
    } else {
      await saveDiscoverItem(item);
      setSavedItems((prev) => [
        {
          id: item.id,
          itemType: item.itemType,
          title: item.title,
          source: item.source,
          url: item.url,
          dataJson: item,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success('Saved to your intelligence bookmarks');
    }
  };

  const handleToggleQueue = async (item: DiscoverFeedItem) => {
    const inQueue = readingQueue.some((q) => q.id === item.id);
    if (inQueue) {
      await removeFromReadingQueue(item.id);
      setReadingQueue((prev) => prev.filter((q) => q.id !== item.id));
      toast.info('Removed from reading queue');
    } else {
      await addToReadingQueue(item);
      setReadingQueue((prev) => [
        {
          id: item.id,
          itemType: item.itemType,
          title: item.title,
          source: item.source,
          url: item.url,
          dataJson: item,
          addedAt: new Date().toISOString(),
          isRead: false,
        },
        ...prev,
      ]);
      toast.success('Added to reading queue');
    }
  };

  const handleToggleQueueReadStatus = async (id: string, isRead: boolean) => {
    await updateQueueStatus(id, isRead);
    setReadingQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isRead } : q))
    );
  };

  const handleRemoveFromQueue = async (id: string) => {
    await removeFromReadingQueue(id);
    setReadingQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleUnfollowTopic = async (topicId: string) => {
    await unfollowTopic(topicId);
    setFollowedTopics((prev) => prev.filter((t) => t.topicId !== topicId));
    toast.info('Unfollowed topic');
  };

  const handleToggleComparePaper = (item: DiscoverFeedItem) => {
    setComparingPapers((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      if (exists) {
        return prev.filter((p) => p.id !== item.id);
      }
      if (prev.length >= 4) {
        toast.warning('You can compare up to 4 papers simultaneously.');
        return prev;
      }
      toast.info(`Added "${item.title.slice(0, 30)}..." to comparison.`);
      return [...prev, item];
    });
  };

  const handleDiscussInChat = (item: DiscoverFeedItem) => {
    const chatPrompt = encodeURIComponent(
      `Let's analyze this research item from Noectra Intelligence:\n\nTitle: "${item.title}"\nSource: ${item.source}\nDOI/URL: ${item.doi ? `https://doi.org/${item.doi}` : item.url}\n\nAbstract/Summary:\n${item.description}\n\nPlease explain the methodology, evaluate reported findings, and explore clinical or practical implications.`
    );
    navigate(`/chat?q=${chatPrompt}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSubmittedQuery('');
  };

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveTopic('all');
    setActiveSource('all');
    setSearchQuery('');
    setSubmittedQuery('');
    setFeedMode('for_you');
  };

  const activeFilterCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (activeTopic !== 'all' ? 1 : 0) +
    (activeSource !== 'all' ? 1 : 0) +
    (submittedQuery ? 1 : 0) +
    (feedMode !== 'for_you' ? 1 : 0);

  const categoryDropdownItems: DropdownItem[] = categoryOptions.map((cat) => ({
    key: cat.key,
    label: cat.display,
    icon: cat.icon,
  }));

  const sourceDropdownItems: DropdownItem[] = sourceOptions.map((src) => ({
    key: src.key,
    label: src.display,
    icon: src.type === 'academic' ? '🎓' : '📰',
  }));

  return (
    <div className="w-full min-h-screen px-4 lg:px-8 pt-6 pb-24 max-w-[1680px] mx-auto select-text">
      {/* ----------------------------------------------------------------- */}
      {/* Header Bar: NOECTRA INTELLIGENCE Brand & Live Telemetry Badge     */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-6 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <Globe2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1
                  className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight"
                  style={{ fontFamily: 'PP Editorial, Georgia, serif' }}
                >
                  NOECTRA INTELLIGENCE
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  <Activity size={10} className="animate-pulse text-cyan-500" />
                  <span>Command Center</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Your Personal Global Research & Intelligence Network • Medical AI, Computer Vision & Scientific Preprints
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Compare Floating Button if Papers Selected */}
            {comparingPapers.length >= 2 && (
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all animate-bounce"
              >
                <Layers size={14} />
                <span>Compare Matrix ({comparingPapers.length})</span>
              </button>
            )}

            {/* AI Daily Briefing Button */}
            <button
              type="button"
              onClick={() => setIsBriefingModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm hover:shadow transition-all active:scale-95"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">Daily Briefing</span>
            </button>

            {/* News API Keys Settings Trigger */}
            <button
              type="button"
              onClick={() => setIsKeysModalOpen(true)}
              title="Configure API Keys"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white transition-colors"
            >
              <Key size={16} />
            </button>

            {/* Toggle Sidebar Collapse */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? 'Expand Intelligence Panel' : 'Collapse Intelligence Panel'}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white transition-colors hidden xl:flex"
            >
              {isSidebarCollapsed ? <SidebarOpen size={16} /> : <SidebarClose size={16} />}
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Instagram-Style Topic Discovery Strip (Zone B Top)              */}
        {/* --------------------------------------------------------------- */}
        <TopicStoriesStrip
          activeTopic={activeTopic}
          onSelectTopic={(topicId, category) => {
            setActiveTopic(topicId);
            if (category !== 'all') {
              setActiveCategory(category);
            }
          }}
        />

        {/* --------------------------------------------------------------- */}
        {/* Mode Selector & Search Controls Subbar                          */}
        {/* --------------------------------------------------------------- */}
        <DiscoverNavSubbar
          currentMode={feedMode}
          onSelectMode={(mode) => setFeedMode(mode)}
          savedCount={savedItems.length}
          queueCount={readingQueue.length}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          onSearchSubmit={handleSearchSubmit}
          onClearSearch={handleClearSearch}
          onRefresh={loadFeed}
          isLoading={loading}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
        />

        {/* Dropdown Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <GlassDropdown
              label="Select Discipline"
              prefix="Category"
              icon={<Layers size={14} className="text-cyan-500" />}
              items={categoryDropdownItems}
              selectedKey={activeCategory}
              onSelect={(key) => setActiveCategory(key)}
              widthClass="min-w-[210px]"
            />

            <GlassDropdown
              label="Select Verified Source"
              prefix="Source"
              icon={<Radio size={14} className="text-violet-500" />}
              items={sourceDropdownItems}
              selectedKey={activeSource}
              onSelect={(key) => setActiveSource(key)}
              widthClass="min-w-[240px]"
            />
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {items.length} discoveries found
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Main 3-Zone Architecture Layout Grid                              */}
      {/* ----------------------------------------------------------------- */}
      <div
        className={cn(
          'grid grid-cols-1 gap-8 pt-6 transition-all duration-300',
          isSidebarCollapsed ? 'grid-cols-1' : 'xl:grid-cols-12'
        )}
      >
        {/* Zone B: Central Intelligence Feed (Columns 1-8 or 12) */}
        <main className={cn('flex flex-col gap-6', isSidebarCollapsed ? 'col-span-1' : 'xl:col-span-8 2xl:col-span-9')}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Monitoring global research feeds and verifying publications...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl bg-white/40 dark:bg-white/[0.01] border border-black/5 dark:border-white/5 p-8">
              <Globe2 size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                No discoveries match your current filter
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5">
                Try selecting &apos;All Disciplines&apos;, clearing search keywords, or switching to the &apos;For You&apos; feed.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Hero Top Featured Card (Only on discovery feeds) */}
              {feedMode !== 'saved' && feedMode !== 'queue' && items.length > 0 && (
                <FeaturedIntelligenceCard
                  item={items[0]}
                  isSaved={savedItems.some((s) => s.id === items[0].id)}
                  isInQueue={readingQueue.some((q) => q.id === items[0].id)}
                  onSave={handleToggleSave}
                  onAddToQueue={handleToggleQueue}
                  onOpenArticle={(it) => setSelectedArticle(it)}
                  onExplainAi={(it) => setSelectedExplainItem(it)}
                  onDiscussAi={handleDiscussInChat}
                  isComparing={comparingPapers.some((p) => p.id === items[0].id)}
                  onToggleCompare={handleToggleComparePaper}
                />
              )}

              {/* Feed Grid of Remaining Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(feedMode === 'saved' || feedMode === 'queue' ? items : items.slice(1))
                  .slice(0, visibleCount)
                  .map((item) => {
                    const isSaved = savedItems.some((s) => s.id === item.id);
                    const isInQueue = readingQueue.some((q) => q.id === item.id);
                    const isComparing = comparingPapers.some((p) => p.id === item.id);

                    if (item.itemType === 'paper' || item.itemType === 'breakthrough') {
                      return (
                        <ScientificPaperCard
                          key={item.id}
                          paper={item}
                          isSaved={isSaved}
                          isInQueue={isInQueue}
                          onSave={handleToggleSave}
                          onAddToQueue={handleToggleQueue}
                          onExplainAi={(it) => setSelectedExplainItem(it)}
                          onDiscussAi={handleDiscussInChat}
                          isComparing={isComparing}
                          onToggleCompare={handleToggleComparePaper}
                        />
                      );
                    }

                    if (item.itemType === 'model' || item.itemType === 'dataset') {
                      return (
                        <ModelReleaseCard
                          key={item.id}
                          item={{
                            id: item.title,
                            modelId: item.title,
                            description: item.description,
                            pipeline_tag: item.tags[0],
                            tags: item.tags,
                            isDataset: item.itemType === 'dataset',
                          }}
                          isSaved={isSaved}
                          onSave={() => handleToggleSave(item)}
                          onDiscuss={(name) => {
                            navigate(`/chat?q=${encodeURIComponent(`Let's discuss the architecture and training recipe of model "${name}".`)}`);
                          }}
                        />
                      );
                    }

                    return (
                      <BreakingNewsCard
                        key={item.id}
                        item={item}
                        isSaved={isSaved}
                        isInQueue={isInQueue}
                        onSave={handleToggleSave}
                        onAddToQueue={handleToggleQueue}
                        onOpenArticle={(it) => setSelectedArticle(it)}
                        onExplainAi={(it) => setSelectedExplainItem(it)}
                        onDiscussAi={handleDiscussInChat}
                      />
                    );
                  })}
              </div>

              {/* Show More Pagination Button */}
              {visibleCount < items.length && (
                <div className="flex justify-center pt-6">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 12)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white/80 dark:bg-[#111520]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 text-xs font-semibold text-slate-800 dark:text-white shadow-sm hover:shadow-md transition-all active:scale-95 group"
                  >
                    <span>Show More Discoveries</span>
                    <ChevronDown size={14} className="text-cyan-500 group-hover:translate-y-0.5 transition-transform" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-mono font-bold">
                      +{items.length - visibleCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Zone C: Right Intelligence Panel (Columns 9-12) */}
        {!isSidebarCollapsed && (
          <div className="xl:col-span-4 2xl:col-span-3">
            <IntelligencePulseSidebar
              sourcesStatus={sourcesStatus}
              onlineCount={onlineCount}
              totalSources={totalSources}
              trendingTopics={trendingTopics}
              readingQueue={readingQueue}
              followedTopics={followedTopics}
              onSelectTopic={(topic) => {
                setSearchQuery(topic);
                setSubmittedQuery(topic);
              }}
              onOpenBriefingModal={() => setIsBriefingModalOpen(true)}
              onToggleQueueRead={handleToggleQueueReadStatus}
              onRemoveFromQueue={handleRemoveFromQueue}
              onUnfollowTopic={handleUnfollowTopic}
              onOpenItem={(it) => setSelectedArticle(it)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(true)}
            />
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Modal Dialogs                                                     */}
      {/* ----------------------------------------------------------------- */}
      {/* In-App Full Article Reader */}
      <ArticleReaderModal
        item={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />

      {/* AI Structured Explain Modal */}
      <AiExplainModal
        item={selectedExplainItem}
        isOpen={!!selectedExplainItem}
        onClose={() => setSelectedExplainItem(null)}
      />

      {/* Literature Comparison Matrix Modal */}
      <PaperComparisonModal
        papers={comparingPapers}
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onRemovePaper={(id) => setComparingPapers((prev) => prev.filter((p) => p.id !== id))}
        onClearAll={() => setComparingPapers([])}
      />

      {/* Daily Briefing Modal */}
      <DailyBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        focusTopics={followedTopics.map((t) => t.displayName)}
      />

      {/* Command Palette (Ctrl+K) */}
      <DiscoverCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={(type, value) => {
          if (type === 'mode') {
            setFeedMode(value as any);
          } else if (type === 'topic') {
            setActiveTopic(value);
          } else if (type === 'query') {
            setSearchQuery(value);
            setSubmittedQuery(value);
          }
        }}
      />

      {/* API Keys Configuration Modal */}
      <DiscoverApiKeysModal
        isOpen={isKeysModalOpen}
        onClose={() => setIsKeysModalOpen(false)}
        onSaved={loadFeed}
      />
    </div>
  );
};

export default DiscoverPage;
