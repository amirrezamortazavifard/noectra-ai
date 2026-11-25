import React, { useState, useEffect, useRef } from 'react';
import {
  KnowledgeService,
  GlobalSearchResult,
  IndexingStatus,
  ZimLibraryItem,
  ZimLibrarySearchHit,
} from '@/lib/services/knowledge';
import {
  splitTitleForHighlight,
  getMatchBadgeLabel,
} from '@/lib/services/zimSearchHighlight';
import {
  Search,
  Database,
  RefreshCw,
  Trash2,
  BookOpen,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onOpenArticle: (archiveId: string, articlePath: string) => void;
}

export const GlobalSearchAndIndexingView: React.FC<Props> = ({ onOpenArticle }) => {
  const [query, setQuery] = useState('');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>('all');
  const [archives, setArchives] = useState<ZimLibraryItem[]>([]);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Indexing status
  const [indexStatus, setIndexStatus] = useState<IndexingStatus>({
    total_indexed_articles: 0,
    total_words_indexed: 0,
    unique_archives_indexed: 0,
  });
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingArchiveId, setIndexingArchiveId] = useState<string | null>(null);

  // Instant title typeahead suggestions across installed ZIMs
  const [liveSuggestions, setLiveSuggestions] = useState<ZimLibrarySearchHit[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestAbortRef = useRef<AbortController | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLibraryAndStatus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      suggestAbortRef.current?.abort();
      setLiveSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      suggestAbortRef.current?.abort();
      const controller = new AbortController();
      suggestAbortRef.current = controller;
      setLoadingSuggestions(true);
      try {
        const hits = await KnowledgeService.suggestLibraryArticles(
          trimmed,
          selectedArchiveId,
          18,
          controller.signal
        );
        if (!controller.signal.aborted) {
          setLiveSuggestions(hits);
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setLiveSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    }, 65);

    return () => clearTimeout(timer);
  }, [query, selectedArchiveId]);

  const loadLibraryAndStatus = async () => {
    try {
      const [lib, stats] = await Promise.all([
        KnowledgeService.fetchLibrary(),
        KnowledgeService.fetchIndexingStatus(),
      ]);
      setArchives(lib);
      setIndexStatus(stats);
    } catch (e: any) {
      toast.error(`Failed to load knowledge assets: ${e.message}`);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      toast.warning('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const archiveFilter = selectedArchiveId === 'all' ? undefined : selectedArchiveId;
      const resp = await KnowledgeService.searchGlobalFts(query.trim(), archiveFilter, 50);
      setResults(resp.results);
    } catch (e: any) {
      toast.error(`Search failed: ${e.message}`);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleIndexArchive = async (archiveId: string) => {
    setIsIndexing(true);
    setIndexingArchiveId(archiveId);
    try {
      toast.info('Indexing article contents for FTS5 full-text search...');
      const res = await KnowledgeService.triggerIndexArchive(archiveId, 300);
      toast.success(`Indexed ${res.indexed_count} articles into SQLite FTS5 engine!`);
      const updatedStats = await KnowledgeService.fetchIndexingStatus();
      setIndexStatus(updatedStats);
    } catch (e: any) {
      toast.error(`Indexing failed: ${e.message}`);
    } finally {
      setIsIndexing(false);
      setIndexingArchiveId(null);
    }
  };

  const handleClearIndex = async (archiveId?: string) => {
    if (!confirm('Are you sure you want to clear the search index cache?')) return;
    try {
      await KnowledgeService.clearSearchIndex(archiveId);
      toast.info('Search index cache cleared.');
      const updatedStats = await KnowledgeService.fetchIndexingStatus();
      setIndexStatus(updatedStats);
      setResults([]);
    } catch (e: any) {
      toast.error(`Failed to clear index: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
      
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-500">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Indexed Articles</p>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {(indexStatus?.total_indexed_articles ?? 0).toLocaleString()}
            </h4>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-500">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Words Indexed</p>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {(indexStatus?.total_words_indexed ?? 0).toLocaleString()}
            </h4>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Archives Indexed</p>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              {indexStatus?.unique_archives_indexed ?? 0} of {archives.length}
            </h4>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">FTS5 Engine</p>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                BM25 + unicode61
              </h4>
            </div>
          </div>
          <button
            onClick={() => handleClearIndex()}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            title="Purge Full Index Cache"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global Search Bar (SEARCH-004 & SEARCH-006) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Universal Knowledge Search (SQLite FTS5)
          </h3>
          <p className="text-xs text-slate-500">
            Full-text search indexed content across your offline medical and reference libraries with BM25 ranking.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div ref={searchBoxRef} className="relative flex-1 w-full">
            {loadingSuggestions ? (
              <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500 animate-spin" />
            ) : (
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
            <input
              type="text"
              dir="auto"
              value={query}
              onFocus={() => {
                if (query.trim()) setShowSuggestions(true);
              }}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                setShowSuggestions(Boolean(v.trim()));
              }}
              placeholder="Type to see instant ZIM title suggestions or search full text..."
              className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setLiveSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showSuggestions && query.trim() && (liveSuggestions.length > 0 || loadingSuggestions) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden">
                <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>
                    {loadingSuggestions
                      ? 'Matching installed ZIM titles...'
                      : `${liveSuggestions.length} instant ZIM article suggestion${liveSuggestions.length === 1 ? '' : 's'}`}
                  </span>
                  <span>Click to open directly</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                  {liveSuggestions.map((hit, idx) => {
                    const { before, match, after } = splitTitleForHighlight(hit.title, query);
                    const badge = getMatchBadgeLabel(hit.match_type);
                    return (
                      <button
                        key={`${hit.archive_id}-${hit.url}-${idx}`}
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          onOpenArticle(hit.archive_id, hit.url);
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-sky-50 dark:hover:bg-sky-500/10 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-900 dark:text-white truncate" dir="auto">
                            {match ? (
                              <>
                                {before}
                                <mark className="bg-sky-500/20 text-sky-700 dark:bg-sky-400/25 dark:text-sky-300 font-bold rounded-xs px-0.5">
                                  {match}
                                </mark>
                                {after}
                              </>
                            ) : (
                              hit.title
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {hit.archive_title} • <span className="font-mono">{hit.url}</span>
                          </div>
                        </div>
                        {badge && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Scope Selector */}
          <div className="w-full sm:w-64">
            <select
              value={selectedArchiveId}
              onChange={(e) => setSelectedArchiveId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="all" className="bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white">All Installed Archives</option>
              {archives.map((a) => (
                <option key={a.id} value={a.id} className="bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white">
                  {a.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-md shadow-sky-500/20"
          >
            {isSearching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Search Results List */}
      {hasSearched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Found <strong className="text-slate-900 dark:text-white">{results.length}</strong> matches for &ldquo;{query}&rdquo;
            </span>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No indexed results found
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Make sure you have indexed your archives below so their articles can be searched via full-text search.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {results.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => onOpenArticle(res.archiveId, res.articlePath)}
                  className="p-4 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 hover:border-sky-500/40 hover:shadow-md transition cursor-pointer group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                        {res.archiveTitle}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition truncate" dir="auto">
                        {res.title}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 text-[11px] text-slate-400">
                      <span>Score: {res.score.toFixed(2)}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>

                  <p
                    className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: res.snippet }}
                  />

                  <div className="text-[10px] text-slate-400 font-mono">
                    Path: {res.articlePath} • {res.wordCount} words
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEARCH-008: Indexing Manager & Archive Inventory */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Search Indexing Manager
          </h3>
          <p className="text-xs text-slate-500">
            Extract clean text from ZIM archives and build the local SQLite FTS5 inverted search index.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {archives.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No ZIM archives installed in library. Import or download archives first.
            </div>
          ) : (
            archives.map((item) => {
              const isCurrentlyIndexing = isIndexing && indexingArchiveId === item.id;
              return (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="truncate space-y-0.5">
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.file_name} • {(item.file_size / (1024 * 1024)).toFixed(1)} MB • {item.article_count} articles
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleIndexArchive(item.id)}
                      disabled={isIndexing}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-600 dark:bg-white/5 dark:hover:bg-sky-500/10 dark:text-slate-300 dark:hover:text-sky-400 disabled:opacity-40 transition flex items-center space-x-1.5"
                    >
                      {isCurrentlyIndexing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span>{isCurrentlyIndexing ? 'Indexing...' : 'Index Archive'}</span>
                    </button>

                    <button
                      onClick={() => handleClearIndex(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition"
                      title="Clear Index for this Archive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

