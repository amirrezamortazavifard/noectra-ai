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
import { UniversalKnowledgeNavigator } from '@/components/Discover/UniversalKnowledgeNavigator';
import { DiscoverNavSubbar } from '@/components/Discover/DiscoverNavSubbar';
import { IntelligencePulseSidebar } from '@/components/Discover/IntelligencePulseSidebar';
import { FeaturedIntelligenceCard } from '@/components/Discover/Cards/FeaturedIntelligenceCard';
import { ScientificPaperCard } from '@/components/Discover/Cards/ScientificPaperCard';
import { BreakingNewsCard } from '@/components/Discover/Cards/BreakingNewsCard';
import { ModelReleaseCard } from '@/components/Discover/Cards/ModelReleaseCard';
import { SocialPostCard } from '@/components/Discover/Cards/SocialPostCard';
import { AiExplainModal } from '@/components/Discover/Modals/AiExplainModal';
import { PaperComparisonModal } from '@/components/Discover/Modals/PaperComparisonModal';
import { DailyBriefingModal } from '@/components/Discover/Modals/DailyBriefingModal';
import { DiscoverCommandPalette } from '@/components/Discover/Modals/DiscoverCommandPalette';
import ArticleReaderModal from '@/components/Discover/ArticleReaderModal';
import DiscoverApiKeysModal from '@/components/Discover/DiscoverApiKeysModal';
import { LiveBuzzDashboard } from '@/components/Discover/LiveBuzz/LiveBuzzDashboard';
import { useNavigate } from 'react-router-dom';

// Universal Knowledge Domains & Disciplines
const categoryOptions: DiscoverCategory[] = [
  { key: 'all', display: 'All Knowledge Disciplines', icon: '🌐' },
  { key: 'social', display: 'Social Intelligence & Reddit', icon: '💬' },
  { key: 'medicine', display: 'Medicine & Healthcare', icon: '🩺' },
  { key: 'dentistry', display: 'Dentistry & Oral Health', icon: '🦷' },
  { key: 'computer_science', display: 'Computer Science & AI', icon: '💻' },
  { key: 'physics_astronomy', display: 'Physics & Astronomy', icon: '🔭' },
  { key: 'chemistry_materials', display: 'Chemistry & Materials', icon: '🧪' },
  { key: 'biology_genetics', display: 'Biological Sciences & Genetics', icon: '🧬' },
  { key: 'engineering', display: 'Engineering & Applied Tech', icon: '⚙️' },
  { key: 'neuroscience', display: 'Neuroscience & Brain', icon: '🧠' },
];

// Universal Verified Feeds Catalog
const sourceOptions: DiscoverSource[] = [
  { key: 'all', display: 'All Verified Feeds (25+ Sources)', type: 'rss' },
  { key: 'reddit_machinelearning', display: 'Reddit r/MachineLearning', type: 'rss' },
  { key: 'reddit_localllama', display: 'Reddit r/LocalLLaMA', type: 'rss' },
  { key: 'reddit_artificial', display: 'Reddit r/artificial', type: 'rss' },
  { key: 'reddit_tech', display: 'Reddit r/technology', type: 'rss' },
  { key: 'reddit_science', display: 'Reddit r/science', type: 'rss' },
  { key: 'hackernews', display: 'Hacker News (Y Combinator)', type: 'rss' },
  { key: 'nature', display: 'Nature International Journal', type: 'academic' },
  { key: 'science_mag', display: 'Science Magazine', type: 'academic' },
  { key: 'nature_bdj', display: 'British Dental Journal (Nature BDJ)', type: 'academic' },
  { key: 'sciencedaily_dentistry', display: 'ScienceDaily Dental Research', type: 'rss' },
  { key: 'medpage', display: 'MedPage Today Clinical', type: 'rss' },
  { key: 'sciencedaily_health', display: 'ScienceDaily Health & Medicine', type: 'rss' },
  { key: 'arxiv_cv', display: 'arXiv Computer Vision (cs.CV)', type: 'academic' },
  { key: 'arxiv_ai', display: 'arXiv Artificial Intelligence (cs.AI)', type: 'academic' },
  { key: 'arxiv_cs', display: 'arXiv Computer Science', type: 'academic' },
  { key: 'arxiv_astro', display: 'arXiv Astrophysics (astro-ph)', type: 'academic' },
  { key: 'arxiv_quant', display: 'arXiv Quantum Physics (quant-ph)', type: 'academic' },
  { key: 'sciencedaily_chemistry', display: 'ScienceDaily Chemistry', type: 'rss' },
  { key: 'sciencedaily_materials', display: 'ScienceDaily Materials Science', type: 'rss' },
  { key: 'arxiv_qbio', display: 'arXiv Quantitative Biology (q-bio)', type: 'academic' },
  { key: 'sciencedaily_biology', display: 'ScienceDaily Biology & Genetics', type: 'rss' },
  { key: 'sciencedaily_engineering', display: 'ScienceDaily Engineering', type: 'rss' },
  { key: 'sciencedaily_neuro', display: 'ScienceDaily Neuroscience', type: 'rss' },
  { key: 'mit_tech', display: 'MIT Technology Review', type: 'rss' },
  { key: 'techcrunch', display: 'TechCrunch Deep Tech & AI', type: 'rss' },
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
      if (feedMode === 'live_buzz') {
        setLoading(false);
        return;
      }

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

  const handleSaveLiveBuzzItem = async (liveItem: any, sourceName: string) => {
    const item: DiscoverFeedItem = {
      id: `live_${liveItem.id || liveItem.url}`,
      itemType: 'news',
      title: liveItem.title,
      description: liveItem.snippet || '',
      url: liveItem.url,
      source: sourceName,
      sourceId: 'live_buzz',
      publishedAt: liveItem.publishedAt || new Date().toISOString(),
      category: 'tech',
      authors: liveItem.author ? [liveItem.author] : [],
      openAccess: true,
      peerReviewed: false,
      readingTimeMin: 2,
      tags: [sourceName, 'Live Buzz'],
      whyRelevant: ['Saved from Live Buzz trending radar'],
      relevanceScore: 95,
      alternateSources: [],
    };
    await handleToggleQueue(item);
  };

  const handleOpenLiveBuzzArticle = (title: string, url: string, snippet?: string) => {
    const item: DiscoverFeedItem = {
      id: `live_${url}`,
      itemType: 'news',
      title: title,
      description: snippet || '',
      url: url,
      source: 'Live Buzz',
      sourceId: 'live_buzz',
      publishedAt: new Date().toISOString(),
      category: 'tech',
      authors: [],
      openAccess: true,
      peerReviewed: false,
      readingTimeMin: 3,
      tags: ['Live Buzz'],
      whyRelevant: ['Trending radar story'],
      relevanceScore: 90,
      alternateSources: [],
    };
    setSelectedArticle(item);
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
    <div className="w-full min-h-screen px-4 lg:px-8 pt-4 pb-24 max-w-[1680px] mx-auto select-text">
      {/* ----------------------------------------------------------------- */}
      {/* Header Bar: Sleek Command Center & Action Toolbar                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Brand & Live Status */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-[0_0_16px_rgba(6,182,212,0.2)]">
              <Globe2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
                  style={{ fontFamily: 'PP Editorial, Georgia, serif' }}
                >
                  NOECTRA INTELLIGENCE
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  <Activity size={10} className="animate-pulse text-cyan-500" />
                  <span>12 Active Streams</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Global Research Radar • Medical AI, Computer Vision & Scientific Preprints
              </p>
            </div>
          </div>

          {/* Unified Action Controls */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Compare Matrix Button (appears if 2+ papers selected) */}
            {comparingPapers.length >= 2 && (
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all animate-bounce"
              >
                <Layers size={13} />
                <span>Compare Matrix ({comparingPapers.length})</span>
              </button>
            )}

            {/* AI Daily Briefing Button */}
            <button
              type="button"
              onClick={() => setIsBriefingModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm hover:shadow transition-all active:scale-95"
            >
              <Sparkles size={13} />
              <span>Daily Briefing</span>
            </button>

            {/* API Keys Configuration */}
            <button
              type="button"
              onClick={() => setIsKeysModalOpen(true)}
              title="Configure News & Model API Keys"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white transition-colors"
            >
              <Key size={15} />
            </button>

            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              title="Open Command Palette (Ctrl+K)"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white transition-colors hidden sm:flex"
            >
              <SlidersHorizontal size={15} />
            </button>

            {/* Toggle Sidebar Collapse */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? 'Expand Intelligence Panel' : 'Collapse Intelligence Panel'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-white transition-colors hidden xl:flex"
            >
              {isSidebarCollapsed ? <SidebarOpen size={15} /> : <SidebarClose size={15} />}
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* Universal Multi-Disciplinary Knowledge Drawer ("حالت کشویی")     */}
        {/* --------------------------------------------------------------- */}
        <UniversalKnowledgeNavigator
          activeCategory={activeCategory}
          onSelectCategory={(categoryId) => setActiveCategory(categoryId)}
          activeTopic={activeTopic}
          onSelectTopic={(topicId) => setActiveTopic(topicId)}
          onResetAll={handleResetFilters}
        />

        {/* --------------------------------------------------------------- */}
        {/* Unified Feed Scope, Universal Search & Verified Sources Subbar  */}
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
          activeSource={activeSource}
          onSelectSource={(src) => setActiveSource(src)}
          sourceItems={sourceDropdownItems}
          activeTopic={activeTopic}
          onResetTopic={() => setActiveTopic('all')}
          itemCount={items.length}
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Main Layout: Live Buzz Dashboard OR 3-Zone Intelligence Feed      */}
      {/* ----------------------------------------------------------------- */}
      {feedMode === 'live_buzz' ? (
        <div className="w-full pt-4">
          <LiveBuzzDashboard
            onOpenArticleReader={handleOpenLiveBuzzArticle}
            onSaveItem={handleSaveLiveBuzzItem}
          />
        </div>
      ) : (
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

                    if (
                      item.itemType === 'social' ||
                      item.source.toLowerCase().includes('reddit') ||
                      item.source.toLowerCase().includes('hacker news') ||
                      item.source.toLowerCase().includes('twitter') ||
                      item.source.toLowerCase().includes('bluesky')
                    ) {
                      return (
                        <SocialPostCard
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
      )}

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
