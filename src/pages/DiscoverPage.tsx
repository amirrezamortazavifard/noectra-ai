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
} from 'lucide-react';
import { GlassDropdown, DropdownItem } from '@/components/Discover/GlassDropdown';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NewsItem, ResearchPaper, DiscoverMode, DiscoverCategory, DiscoverSource } from '@/lib/services/discover/types';
import {
  fetchOpenAlexPapers,
  fetchSemanticScholarPapers,
  fetchPubMedPapers,
  fetchCrossrefPapers,
} from '@/lib/services/discover/academicApi';
import {
  fetchNewsFromBackend,
  fetchGNews,
  fetchNewsData,
  fetchCurrents,
  fetchNewsApiOrg,
  getStoredApiKeys,
} from '@/lib/services/discover/newsApi';
import SmallNewsCard from '@/components/Discover/SmallNewsCard';
import MajorNewsCard from '@/components/Discover/MajorNewsCard';
import ResearchPaperCard from '@/components/Discover/ResearchPaperCard';
import DiscoverApiKeysModal from '@/components/Discover/DiscoverApiKeysModal';
import ArticleReaderModal from '@/components/Discover/ArticleReaderModal';

// Categories for News Mode
const newsCategories: DiscoverCategory[] = [
  { key: 'all', display: 'All News', icon: '🌐', keyword: 'latest' },
  { key: 'tech', display: 'Tech & AI', icon: '💻', keyword: 'technology' },
  { key: 'business', display: 'Business & Finance', icon: '📈', keyword: 'business' },
  { key: 'science', display: 'Science & Space', icon: '🚀', keyword: 'science' },
  { key: 'health', display: 'Health & Medicine', icon: '🧬', keyword: 'health' },
  { key: 'sports', display: 'Sports', icon: '⚽', keyword: 'sports' },
  { key: 'entertainment', display: 'Entertainment', icon: '🎬', keyword: 'entertainment' },
  { key: 'world', display: 'World & Politics', icon: '🌍', keyword: 'world' },
];

// Sources for News Mode
const newsSources: DiscoverSource[] = [
  { key: 'all', display: 'All Sources', type: 'rss' },
  { key: 'techcrunch', display: 'TechCrunch', type: 'rss' },
  { key: 'verge', display: 'The Verge', type: 'rss' },
  { key: 'wired', display: 'Wired', type: 'rss' },
  { key: 'arstechnica', display: 'Ars Technica', type: 'rss' },
  { key: 'nature', display: 'Nature News', type: 'rss' },
  { key: 'yahoo_finance', display: 'Yahoo Finance', type: 'rss' },
  { key: 'espn', display: 'ESPN', type: 'rss' },
  { key: 'gnews', display: 'GNews API', type: 'api', requiresKey: true },
  { key: 'newsdata', display: 'NewsData.io', type: 'api', requiresKey: true },
  { key: 'currents', display: 'Currents API', type: 'api', requiresKey: true },
  { key: 'newsapi', display: 'NewsAPI.org', type: 'api', requiresKey: true },
];

// Categories for Academic Papers Mode
const paperCategories: DiscoverCategory[] = [
  { key: 'all', display: 'All Disciplines', icon: '📚', keyword: 'research' },
  {
    key: 'cs',
    display: 'Computer Science',
    icon: '💻',
    keyword: 'computer science',
    openAlexConceptId: 'C41008148',
    semanticScholarField: 'Computer Science',
  },
  {
    key: 'ai',
    display: 'Artificial Intelligence',
    icon: '🤖',
    keyword: 'artificial intelligence machine learning',
    openAlexConceptId: 'C154945302',
    semanticScholarField: 'Computer Science',
  },
  {
    key: 'medicine',
    display: 'Medicine & Health',
    icon: '🩺',
    keyword: 'medicine clinical healthcare',
    openAlexConceptId: 'C71924100',
    semanticScholarField: 'Medicine',
  },
  {
    key: 'biology',
    display: 'Biology & Genetics',
    icon: '🧬',
    keyword: 'biology genetics molecular',
    openAlexConceptId: 'C86803240',
    semanticScholarField: 'Biology',
  },
  {
    key: 'physics',
    display: 'Physics & Quantum',
    icon: '⚛️',
    keyword: 'quantum physics cosmology',
    openAlexConceptId: 'C121332964',
    semanticScholarField: 'Physics',
  },
  {
    key: 'engineering',
    display: 'Engineering & Robotics',
    icon: '⚙️',
    keyword: 'engineering robotics automation',
    openAlexConceptId: 'C127413603',
    semanticScholarField: 'Engineering',
  },
  {
    key: 'economics',
    display: 'Economics & Markets',
    icon: '📊',
    keyword: 'economics finance econometrics',
    openAlexConceptId: 'C162324750',
    semanticScholarField: 'Economics',
  },
  {
    key: 'psychology',
    display: 'Psychology & Neuroscience',
    icon: '🧠',
    keyword: 'psychology neuroscience cognition',
    openAlexConceptId: 'C15744967',
    semanticScholarField: 'Psychology',
  },
];

// Sources for Academic Papers Mode
const paperSources: DiscoverSource[] = [
  { key: 'openalex', display: 'OpenAlex (250M+ Papers)', type: 'academic', description: 'Open scholarly catalog' },
  { key: 'semantic_scholar', display: 'Semantic Scholar', type: 'academic', description: 'AI literature graph' },
  { key: 'pubmed', display: 'NCBI PubMed', type: 'academic', description: 'Biomedical & health sciences' },
  { key: 'crossref', display: 'Crossref Registry', type: 'academic', description: 'Official DOI metadata' },
  { key: 'arxiv', display: 'arXiv Preprints', type: 'rss', description: 'CS, AI, and Physics preprints' },
];

const trendingTopics = [
  'Artificial Intelligence',
  'Quantum Computing',
  'CRISPR Gene Editing',
  'Large Language Models',
  'Renewable Fusion Energy',
  'Neuroscience',
];

const DiscoverPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DiscoverMode>('news');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSource, setActiveSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(10);

  useEffect(() => {
    setVisibleCount(10);
  }, [activeCategory, activeSource, submittedQuery, activeTab]);

  const fetchIdRef = useRef<number>(0);

  const currentCategories = activeTab === 'news' ? newsCategories : paperCategories;
  const currentSources = activeTab === 'news' ? newsSources : paperSources;

  // Primary Fetch Function
  const loadDiscoverContent = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);

    try {
      if (activeTab === 'papers') {
        // Find category metadata
        const selectedCat = paperCategories.find((c) => c.key === activeCategory);
        const queryTerm = submittedQuery.trim() || selectedCat?.keyword || 'research';

        let results: ResearchPaper[] = [];

        if (activeSource === 'openalex') {
          results = await fetchOpenAlexPapers({
            query: submittedQuery.trim() || undefined,
            conceptId: selectedCat?.openAlexConceptId,
            limit: 15,
          });
        } else if (activeSource === 'semantic_scholar') {
          results = await fetchSemanticScholarPapers({
            query: queryTerm,
            fieldOfStudy: selectedCat?.semanticScholarField,
            limit: 15,
          });
        } else if (activeSource === 'pubmed') {
          results = await fetchPubMedPapers({
            query: queryTerm,
            limit: 15,
          });
        } else if (activeSource === 'crossref') {
          results = await fetchCrossrefPapers({
            query: queryTerm,
            limit: 15,
          });
        } else if (activeSource === 'arxiv') {
          const feedCategory = activeCategory === 'cs' ? 'arxiv_cs' : 'arxiv_ai';
          const backendItems = await fetchNewsFromBackend({
            category: 'ai',
            source: feedCategory,
            query: submittedQuery,
          });
          results = backendItems.map((b) => ({
            id: b.url,
            title: b.title,
            abstract: b.description,
            authors: ['arXiv Researchers'],
            year: new Date(b.publishedAt).getFullYear() || 'Recent',
            venue: 'arXiv Preprints',
            fieldsOfStudy: ['Computer Science', 'AI'],
            url: b.url,
            source: 'arXiv',
          }));
        } else {
          // Default: OpenAlex
          results = await fetchOpenAlexPapers({
            query: submittedQuery.trim() || undefined,
            conceptId: selectedCat?.openAlexConceptId,
            limit: 15,
          });
        }

        if (currentFetchId === fetchIdRef.current) {
          setPapers(results);
        }
      } else {
        // News Mode
        const storedKeys = getStoredApiKeys();
        const selectedCat = newsCategories.find((c) => c.key === activeCategory);
        const categoryKey = selectedCat?.key === 'all' ? 'tech' : selectedCat?.key || 'tech';

        let items: NewsItem[] = [];

        // Check if user selected a custom API source
        if (activeSource === 'gnews' && storedKeys.gnews) {
          items = await fetchGNews(storedKeys.gnews, {
            category: categoryKey === 'tech' ? 'technology' : categoryKey,
            query: submittedQuery || undefined,
            limit: 15,
          });
        } else if (activeSource === 'newsdata' && storedKeys.newsdata) {
          items = await fetchNewsData(storedKeys.newsdata, {
            category: categoryKey === 'tech' ? 'technology' : categoryKey,
            query: submittedQuery || undefined,
          });
        } else if (activeSource === 'currents' && storedKeys.currents) {
          items = await fetchCurrents(storedKeys.currents, {
            category: categoryKey === 'tech' ? 'technology' : categoryKey,
            query: submittedQuery || undefined,
          });
        } else if (activeSource === 'newsapi' && storedKeys.newsapi) {
          items = await fetchNewsApiOrg(storedKeys.newsapi, {
            category: categoryKey === 'tech' ? 'technology' : categoryKey,
            query: submittedQuery || undefined,
          });
        } else {
          // If API key was selected but not present, show toast and fallback to RSS
          if (['gnews', 'newsdata', 'currents', 'newsapi'].includes(activeSource)) {
            toast.info(`No API key saved for ${activeSource.toUpperCase()}. Using curated feeds.`);
          }

          items = await fetchNewsFromBackend({
            category: categoryKey,
            source: activeSource === 'all' ? undefined : activeSource,
            query: submittedQuery || undefined,
          });
        }

        if (currentFetchId === fetchIdRef.current) {
          setNewsItems(items);
        }
      }
    } catch (err: any) {
      if (currentFetchId === fetchIdRef.current) {
        console.error('Discover fetch error:', err);
        toast.error(err.message || 'Failed to fetch content');
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab, activeCategory, activeSource, submittedQuery]);

  useEffect(() => {
    loadDiscoverContent();
  }, [loadDiscoverContent]);

  const handleTabChange = (tab: DiscoverMode) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setActiveCategory('all');
    setActiveSource(tab === 'news' ? 'all' : 'openalex');
    setSubmittedQuery('');
    setSearchQuery('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery.trim());
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSubmittedQuery('');
  };

  const handleTrendingClick = (topic: string) => {
    setSearchQuery(topic);
    setSubmittedQuery(topic);
  };

  const categoryDropdownItems: DropdownItem[] = currentCategories.map((cat) => ({
    key: cat.key,
    label: cat.display,
    icon: cat.icon,
  }));

  const sourceDropdownItems: DropdownItem[] = currentSources.map((src) => ({
    key: src.key,
    label: src.display,
    description: src.description,
    icon: src.type === 'academic' ? '🎓' : src.type === 'api' ? '⚡' : '📰',
  }));

  const trendingDropdownItems: DropdownItem[] = [
    { key: '', label: 'All Topics (Clear Query)', icon: '✨' },
    ...trendingTopics.map((topic) => ({
      key: topic,
      label: topic,
      icon: '🔥',
    })),
  ];

  return (
    <div className="w-full min-h-screen px-4 lg:px-8 pt-8 pb-20 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col gap-5 pb-6 border-b border-light-200/40 dark:border-white/[0.08]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Globe2 size={32} />
            </div>
            <div>
              <h1
                className="text-3xl sm:text-4xl font-light text-black dark:text-white tracking-tight"
                style={{ fontFamily: 'PP Editorial, Georgia, serif' }}
              >
                Discover
              </h1>
              <p className="text-xs sm:text-sm text-black/50 dark:text-white/50">
                Live global news, scholarly publications, and deep research papers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {/* Mode Switcher */}
            <div className="flex p-1 bg-light-secondary dark:bg-[#15161a] rounded-xl border border-light-200 dark:border-white/10 shadow-sm flex-1 sm:flex-initial">
              <button
                onClick={() => handleTabChange('news')}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200',
                  activeTab === 'news'
                    ? 'bg-white dark:bg-[#202227] text-black dark:text-white shadow-sm font-semibold'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                <Newspaper size={15} />
                <span>News & Events</span>
              </button>

              <button
                onClick={() => handleTabChange('papers')}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200',
                  activeTab === 'papers'
                    ? 'bg-white dark:bg-[#202227] text-black dark:text-white shadow-sm font-semibold'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                )}
              >
                <BookOpen size={15} />
                <span>Academic Papers</span>
              </button>
            </div>

            {/* API Settings Modal Trigger */}
            <button
              onClick={() => setIsKeysModalOpen(true)}
              title="Configure News API Keys"
              className="p-2.5 rounded-xl bg-light-secondary dark:bg-[#15161a] border border-light-200 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:border-cyan-500/40 transition-colors shadow-sm"
            >
              <Key size={17} />
            </button>
          </div>
        </div>

        {/* Universal Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="relative flex items-center">
            <Search
              size={18}
              className="absolute left-4 text-black/40 dark:text-white/40 pointer-events-none"
            />
            <input
              type="text"
              placeholder={
                activeTab === 'news'
                  ? 'Search global headlines, keywords, or topics (e.g. artificial intelligence, markets)...'
                  : 'Search papers, topics, authors, or DOIs (e.g. quantum entanglement, transformers)...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-24 py-3 rounded-2xl bg-light-secondary/80 dark:bg-[#131417] border border-light-200/80 dark:border-white/[0.08] text-sm text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-16 p-1 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        {/* Glassmorphic Combobox Toolbar: Category, Source & Trending */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Combobox */}
            <GlassDropdown
              label="Select Category"
              prefix="Category"
              icon={<Layers size={14} className="text-cyan-500" />}
              items={categoryDropdownItems}
              selectedKey={activeCategory}
              onSelect={(key) => setActiveCategory(key)}
              widthClass="min-w-[220px]"
            />

            {/* Source Combobox */}
            <GlassDropdown
              label="Select Source"
              prefix="Source"
              icon={<Radio size={14} className="text-fuchsia-500" />}
              items={sourceDropdownItems}
              selectedKey={activeSource}
              onSelect={(key) => setActiveSource(key)}
              widthClass="min-w-[240px]"
            />

            {/* Trending Topics Combobox */}
            <GlassDropdown
              label="Trending Topics"
              prefix="Trending"
              icon={<Sparkles size={14} className="text-amber-500" />}
              items={trendingDropdownItems}
              selectedKey={submittedQuery}
              onSelect={(topic) => {
                setSearchQuery(topic);
                setSubmittedQuery(topic);
              }}
              widthClass="min-w-[230px]"
            />
          </div>

          {/* Active Filter Indicators & Reset Button */}
          {(activeCategory !== 'all' ||
            activeSource !== (activeTab === 'news' ? 'all' : 'openalex') ||
            submittedQuery) && (
            <button
              onClick={() => {
                setActiveCategory('all');
                setActiveSource(activeTab === 'news' ? 'all' : 'openalex');
                setSearchQuery('');
                setSubmittedQuery('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-light-200 dark:hover:border-white/10 transition-all shadow-sm"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 select-none scrollbar-none">
          {currentCategories.slice(0, 8).map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border',
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                    : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                )}
              >
                <span className="text-xs">{cat.icon}</span>
                <span>{cat.display}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-4">
          <div className="w-9 h-9 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-black/50 dark:text-white/50 font-mono">
            Fetching verified {activeTab === 'news' ? 'news' : 'academic papers'} from {activeSource}...
          </p>
        </div>
      ) : activeTab === 'papers' ? (
        /* Academic Papers Grid */
        <div className="pt-6">
          {papers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <BookOpen size={48} className="text-black/20 dark:text-white/20 mb-3" />
              <h3 className="text-base font-semibold text-black/70 dark:text-white/70 mb-1">
                No academic papers found
              </h3>
              <p className="text-xs text-black/50 dark:text-white/50 max-w-sm mb-4">
                Try refining your keyword query or switching the database provider to OpenAlex or Semantic Scholar.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSubmittedQuery('');
                  setActiveCategory('all');
                  setActiveSource('openalex');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {papers.slice(0, visibleCount).map((paper) => (
                  <ResearchPaperCard key={paper.id} paper={paper} />
                ))}
              </div>

              {visibleCount < papers.length && (
                <div className="flex justify-center pt-8">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 8)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white/70 dark:bg-[#131620]/80 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.09] hover:border-cyan-500/40 text-xs font-semibold text-black dark:text-white shadow-sm hover:shadow-md transition-all active:scale-95 group"
                  >
                    <span>Show More Papers</span>
                    <ChevronDown size={14} className="text-cyan-500 group-hover:translate-y-0.5 transition-transform" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                      +{papers.length - visibleCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* News Mode Rendering */
        <div className="pt-6">
          {newsItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Newspaper size={48} className="text-black/20 dark:text-white/20 mb-3" />
              <h3 className="text-base font-semibold text-black/70 dark:text-white/70 mb-1">
                No news articles found
              </h3>
              <p className="text-xs text-black/50 dark:text-white/50 max-w-sm mb-4">
                Try selecting &apos;All Sources&apos; or changing your search keyword.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSubmittedQuery('');
                  setActiveCategory('all');
                  setActiveSource('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Featured Top Card */}
              {newsItems.length > 0 && (
                <MajorNewsCard
                  item={newsItems[0]}
                  isLeft={true}
                  onSelectArticle={(item) => setSelectedArticle(item)}
                />
              )}

              {/* Grid of Remaining Cards */}
              {newsItems.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {newsItems.slice(1, visibleCount).map((item, idx) => (
                    <SmallNewsCard
                      key={item.id || idx}
                      item={item}
                      onSelectArticle={(it) => setSelectedArticle(it)}
                    />
                  ))}
                </div>
              )}

              {/* Show More Stories Button */}
              {visibleCount < newsItems.length && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 9)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white/70 dark:bg-[#131620]/80 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.09] hover:border-cyan-500/40 text-xs font-semibold text-black dark:text-white shadow-sm hover:shadow-md transition-all active:scale-95 group"
                  >
                    <span>Show More Stories</span>
                    <ChevronDown size={14} className="text-cyan-500 group-hover:translate-y-0.5 transition-transform" />
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                      +{newsItems.length - visibleCount}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* In-App News Reader & Browser Modal */}
      <ArticleReaderModal
        item={selectedArticle}
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />

      {/* API Keys Modal */}
      <DiscoverApiKeysModal
        isOpen={isKeysModalOpen}
        onClose={() => setIsKeysModalOpen(false)}
        onSaved={loadDiscoverContent}
      />
    </div>
  );
};

export default DiscoverPage;
