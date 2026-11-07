import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Layers,
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
  const [isCopied, setIsCopied] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchArticleList = async (query = '') => {
    setLoadingList(true);
    try {
      const list = await KnowledgeService.searchArticles(archiveId, query, 100);
      setArticles(list);
      if (list.length > 0 && !selectedArticleUrl) {
        loadArticle(list[0].url);
      }
    } catch (e: any) {
      toast.error(`Failed to load article index: ${e.message}`);
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

  const handleCopyText = () => {
    if (!articleContent) return;
    const textToCopy = viewMode === 'markdown' ? articleContent.text : articleContent.html;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast.success('Article copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md animate-fadeIn">
      {/* Custom Scoped Styles for Wikipedia / ZIM Rendered Content */}
      <style>{`
        .zim-html-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.25rem 0;
          font-size: 0.85rem;
        }
        .zim-html-content th,
        .zim-html-content td {
          border: 1px solid rgba(125, 125, 125, 0.2);
          padding: 0.5rem 0.75rem;
          text-align: left;
        }
        .zim-html-content th {
          background-color: rgba(125, 125, 125, 0.08);
          font-weight: 600;
        }
        .zim-html-content .infobox {
          float: right;
          max-width: 320px;
          margin-left: 1.5rem;
          margin-bottom: 1.5rem;
          background-color: rgba(125, 125, 125, 0.05);
          border-radius: 0.75rem;
          border: 1px solid rgba(125, 125, 125, 0.15);
        }
        .zim-html-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.75rem 0;
        }
        .zim-html-content a {
          color: #0284c7;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .dark .zim-html-content a {
          color: #38bdf8;
        }
      `}</style>

      <div className="w-full h-[94vh] max-w-7xl rounded-3xl bg-white dark:bg-[#0c1017] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="px-6 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#0c1017]/90 backdrop-blur-xl">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Offline ZIM Article Reader
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border border-black/[0.04] dark:border-white/[0.06] shrink-0">
                  {archiveId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                Direct cluster decompression via pure Rust zim engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06]">
              <button
                onClick={() => setViewMode('rendered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'rendered'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Rendered HTML</span>
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === 'markdown'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Raw Text / Markdown</span>
              </button>
            </div>

            {/* Copy Article Content */}
            {articleContent && (
              <button
                onClick={handleCopyText}
                title="Copy article text"
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Close reader (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Body: Two Split Panes */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Article Navigator */}
          <div className="w-72 sm:w-80 md:w-96 border-r border-black/[0.06] dark:border-white/[0.08] flex flex-col shrink-0 bg-slate-50/60 dark:bg-[#07090e]/60">
            {/* Inner Search Bar */}
            <div className="p-3 border-b border-black/[0.04] dark:border-white/[0.06]">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles in this archive..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      fetchArticleList('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </form>
              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-1">
                <span>Showing {articles.length} articles</span>
                <span>Press Enter to search</span>
              </div>
            </div>

            {/* Articles List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingList ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2 text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                  <span>Loading article index...</span>
                </div>
              ) : articles.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <FileText className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  <p>No articles found.</p>
                  <p className="text-[11px] text-slate-500">Try searching for a different keyword.</p>
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
                          ? 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold border border-sky-500/25 shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="truncate pr-2">{art.title}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                          isSelected
                            ? 'opacity-100 text-sky-500'
                            : 'opacity-0 group-hover:opacity-75 text-slate-400'
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
                <p className="text-xs text-slate-400 font-medium">
                  Decompressing article clusters from .zim archive...
                </p>
              </div>
            ) : !articleContent ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-slate-400 p-8 text-center">
                <Bookmark className="w-12 h-12 opacity-30" />
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No Article Selected
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select an article from the left pane to extract its HTML and explore its offline content.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Article Header */}
                <div className="px-8 py-4 border-b border-black/[0.04] dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] shrink-0">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {articleContent.title}
                  </h1>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-slate-400">
                    <span className="font-mono">URL: {articleContent.url}</span>
                    <span>•</span>
                    <span>{articleContent.mime_type}</span>
                  </div>
                </div>

                {/* Article Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {viewMode === 'rendered' ? (
                    <div
                      className="zim-html-content prose dark:prose-invert max-w-none prose-slate text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: articleContent.html }}
                    />
                  ) : (
                    <pre className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
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
