import React, { useState, useEffect } from 'react';
import {
  KnowledgeService,
  ZimArticleSummary,
  ZimArticleContent,
} from '@/lib/services/knowledge';
import {
  Search,
  X,
  BookOpen,
  FileText,
  Code2,
  Eye,
  Loader2,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  archiveId: string;
  onClose: () => void;
}

export const ZimArticleReaderModal: React.FC<Props> = ({ archiveId, onClose }) => {
  const [articles, setArticles] = useState<ZimArticleSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);

  const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);
  const [articleContent, setArticleContent] = useState<ZimArticleContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown'>('rendered');

  const fetchArticleList = async (query = '') => {
    setLoadingList(true);
    try {
      const list = await KnowledgeService.searchArticles(archiveId, query, 80);
      setArticles(list);
      if (list.length > 0 && !selectedArticleUrl) {
        loadArticle(list[0].url);
      }
    } catch (e: any) {
      toast.error(`Failed to load article list: ${e.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  const loadArticle = async (url: string) => {
    setSelectedArticleUrl(url);
    setLoadingContent(true);
    try {
      const content = await KnowledgeService.readArticle(archiveId, url);
      setArticleContent(content);
    } catch (e: any) {
      toast.error(`Failed to read article: ${e.message}`);
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    fetchArticleList();
  }, [archiveId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticleList(searchQuery);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full h-[92vh] max-w-7xl rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="px-6 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between shrink-0 bg-white/70 dark:bg-[#0c1017]/80 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ZIM Reader</span>
                <span className="text-[11px] font-mono font-normal text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">
                  {archiveId}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-black/[0.04] dark:border-white/[0.06]">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'rendered'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Rendered
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'markdown'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Markdown
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Close reader"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Body: Two Panes */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Article Navigator */}
          <div className="w-80 md:w-96 border-r border-black/[0.06] dark:border-white/[0.06] flex flex-col shrink-0 bg-slate-50/50 dark:bg-[#0c1017]/40">
            {/* Inner Search */}
            <div className="p-3 border-b border-black/[0.04] dark:border-white/[0.06]">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles in this ZIM..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </form>
            </div>

            {/* Articles List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingList ? (
                <div className="flex items-center justify-center py-10 space-x-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>Loading article index...</span>
                </div>
              ) : articles.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No articles matched your search query.
                </div>
              ) : (
                articles.map((art) => {
                  const isSelected = selectedArticleUrl === art.url;
                  return (
                    <button
                      key={art.url}
                      onClick={() => loadArticle(art.url)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate pr-2">{art.title}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isSelected ? 'opacity-100 text-sky-500' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Article Content Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0c1017]">
            {loadingContent ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                <p className="text-xs text-slate-400">Extracting and decompressing article bytes...</p>
              </div>
            ) : !articleContent ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <Bookmark className="w-10 h-10 opacity-40" />
                <p className="text-sm">Select an article from the left pane to begin reading.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Article Header */}
                <div className="px-8 py-4 border-b border-black/[0.04] dark:border-white/[0.06] shrink-0">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {articleContent.title}
                  </h1>
                  <span className="text-xs font-mono text-slate-400">
                    URL: {articleContent.url}
                  </span>
                </div>

                {/* Article Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {viewMode === 'rendered' ? (
                    <div
                      className="prose dark:prose-invert max-w-none prose-slate text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: articleContent.html }}
                    />
                  ) : (
                    <pre className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {articleContent.text}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
