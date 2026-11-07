import React, { useState, useEffect } from 'react';
import {
  KnowledgeService,
  GlobalSearchResult,
  IndexingStatus,
  ZimLibraryItem,
} from '@/lib/services/knowledge';
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

  useEffect(() => {
    loadLibraryAndStatus();
  }, []);

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
              {indexStatus.total_indexed_articles.toLocaleString()}
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
              {indexStatus.total_words_indexed.toLocaleString()}
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
              {indexStatus.unique_archives_indexed} of {archives.length}
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
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all articles, terms, drugs, or procedures..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          {/* Scope Selector */}
          <div className="w-full sm:w-64">
            <select
              value={selectedArchiveId}
              onChange={(e) => setSelectedArchiveId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="all">All Installed Archives</option>
              {archives.map((a) => (
                <option key={a.id} value={a.id}>
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

