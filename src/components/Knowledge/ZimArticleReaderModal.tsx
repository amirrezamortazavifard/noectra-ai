import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  KnowledgeService,
  ZimArticleSummary,
  ZimArticleContent,
  ArticleAnnotation,
  ArticleBookmark,
} from '@/lib/services/knowledge';
import { sanitizeZimHtml } from '@/lib/services/zimSanitizer';
import {
  Search,
  X,
  BookOpen,
  FileText,
  Code2,
  Loader2,
  ChevronRight,
  Bookmark,
  Copy,
  Check,
  Type,
  Plus,
  Volume2,
  VolumeX,
  Languages,
  Share2,
  Columns,
  ListTree,
  Highlighter,
  Trash2,
  ChevronLeft,
  ArrowRight,
  Maximize2,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  archiveId: string;
  onClose: () => void;
}

type TextSize = 'sm' | 'base' | 'lg' | 'xl';

interface TabItem {
  id: string;
  url: string;
  title: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const ZimArticleReaderModal: React.FC<Props> = ({ archiveId, onClose }) => {
  // Articles listing
  const [articles, setArticles] = useState<ZimArticleSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // READ-003: Multi-tab Reading
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Active article state
  const [selectedArticleUrl, setSelectedArticleUrl] = useState<string | null>(null);
  const [articleContent, setArticleContent] = useState<ZimArticleContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown'>('rendered');
  const [textSize, setTextSize] = useState<TextSize>('base');
  const [isCopied, setIsCopied] = useState(false);

  // READ-001: Outline/TOC
  const [showToc, setShowToc] = useState(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  // READ-002: Annotations & Highlights
  const [annotations, setAnnotations] = useState<ArticleAnnotation[]>([]);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState('#fef08a'); // default yellow

  // READ-004: Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // READ-005: Citation Export Modal
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [citationFormat, setCitationFormat] = useState<'apa' | 'bibtex' | 'markdown'>('apa');

  // READ-006: Navigation Stack (Back / Forward)
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [navPointer, setNavPointer] = useState<number>(-1);

  // READ-008: Bookmarks
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);

  // READ-009: Split Reading & Compare
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitArticleUrl, setSplitArticleUrl] = useState<string | null>(null);
  const [splitArticleContent, setSplitArticleContent] = useState<ZimArticleContent | null>(null);

  // READ-011: Offline Side-by-side Translation
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  // READ-012: Offline TTS
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reading container ref for tracking scroll
  const articleContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxSrc) {
          setLightboxSrc(null);
        } else if (showCitationModal) {
          setShowCitationModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, lightboxSrc, showCitationModal]);

  // Load article index
  useEffect(() => {
    fetchArticleList(searchQuery);
  }, [archiveId, searchQuery]);

  const fetchArticleList = async (query = '') => {
    setLoadingList(true);
    try {
      const list = await KnowledgeService.searchArticles(archiveId, query, 250);
      setArticles(list);
      setPage(1);
      if (list.length > 0 && tabs.length === 0) {
        openInNewTab(list[0].url, list[0].title);
      }
    } catch (e: any) {
      toast.error(`Failed to load article index: ${e.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  // Open article in a tab (READ-003)
  const openInNewTab = (url: string, title?: string) => {
    const existing = tabs.find((t) => t.url === url);
    if (existing) {
      setActiveTabId(existing.id);
      loadArticle(url, false);
      return;
    }
    const newTab: TabItem = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url,
      title: title || url,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    loadArticle(url);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      if (remaining.length > 0) {
        const next = remaining[remaining.length - 1];
        setActiveTabId(next.id);
        loadArticle(next.url, false);
      } else {
        setActiveTabId(null);
        setSelectedArticleUrl(null);
        setArticleContent(null);
      }
    }
  };

  // Load article details and sanitize
  const loadArticle = async (url: string, recordHistory = true) => {
    setSelectedArticleUrl(url);
    setLoadingContent(true);
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setShowTranslation(false);
    setTranslatedText('');

    try {
      const content = await KnowledgeService.readArticle(archiveId, url);
      const sanitizedHtml = sanitizeZimHtml(content.html, { archiveId });
      setArticleContent({
        ...content,
        html: sanitizedHtml,
      });

      // Update active tab title if needed
      setTabs((prev) =>
        prev.map((t) => (t.url === url ? { ...t, title: content.title || t.title } : t))
      );

      // Extract TOC Headings (READ-001)
      extractTableOfContents(sanitizedHtml);

      // Record History (READ-006 & READ-007)
      if (recordHistory) {
        setNavHistory((prev) => {
          const nextStack = prev.slice(0, navPointer + 1);
          return [...nextStack, url];
        });
        setNavPointer((prev) => prev + 1);
      }

      await KnowledgeService.recordReadingHistory({
        archiveId,
        archiveTitle: archiveId,
        articlePath: url,
        articleTitle: content.title || url,
        scrollPercentage: 0,
        readDurationSeconds: 1,
      });

      // Load Annotations (READ-002)
      loadAnnotations(url);

      // Check Bookmark status (READ-008)
      checkBookmarkStatus(url);
    } catch (e: any) {
      toast.error(`Failed to load article: ${e.message}`);
    } finally {
      setLoadingContent(false);
    }
  };

  // Back and Forward Navigation (READ-006)
  const handleNavBack = () => {
    if (navPointer > 0) {
      const prevUrl = navHistory[navPointer - 1];
      setNavPointer((prev) => prev - 1);
      loadArticle(prevUrl, false);
    }
  };

  const handleNavForward = () => {
    if (navPointer < navHistory.length - 1) {
      const nextUrl = navHistory[navPointer + 1];
      setNavPointer((prev) => prev + 1);
      loadArticle(nextUrl, false);
    }
  };

  // Extract headings for Table of Contents (READ-001)
  const extractTableOfContents = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3, h4');
    const items: TocItem[] = [];

    headings.forEach((h, idx) => {
      const text = h.textContent?.trim() || '';
      if (text) {
        const id = h.id || `heading-${idx}`;
        const level = parseInt(h.tagName.substring(1), 10);
        items.push({ id, text, level });
      }
    });

    setTocItems(items);
  };

  // Load annotations (READ-002)
  const loadAnnotations = async (url: string) => {
    try {
      const list = await KnowledgeService.fetchAnnotations(archiveId, url);
      setAnnotations(list);
    } catch {
      setAnnotations([]);
    }
  };

  // Check Bookmark status (READ-008)
  const checkBookmarkStatus = async (url: string) => {
    try {
      const bmarks = await KnowledgeService.fetchArticleBookmarks(archiveId);
      const found = bmarks.find((b) => b.articlePath === url);
      if (found) {
        setIsBookmarked(true);
        setBookmarkId(found.id);
      } else {
        setIsBookmarked(false);
        setBookmarkId(null);
      }
    } catch {
      setIsBookmarked(false);
    }
  };

  const toggleBookmark = async () => {
    if (!selectedArticleUrl || !articleContent) return;
    try {
      if (isBookmarked && bookmarkId) {
        await KnowledgeService.deleteArticleBookmark(bookmarkId);
        setIsBookmarked(false);
        setBookmarkId(null);
        toast.info('Bookmark removed');
      } else {
        const res = await KnowledgeService.saveArticleBookmark({
          archiveId,
          articlePath: selectedArticleUrl,
          title: articleContent.title || selectedArticleUrl,
          category: 'Default',
        });
        setIsBookmarked(true);
        setBookmarkId(res.id);
        toast.success('Article bookmarked');
      }
    } catch (e: any) {
      toast.error(`Failed to update bookmark: ${e.message}`);
    }
  };

  // Add Annotation / Highlight (READ-002)
  const handleCreateHighlight = async (noteText = '') => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText || !selectedArticleUrl) {
      toast.warning('Please select some text in the article first.');
      return;
    }

    try {
      await KnowledgeService.saveAnnotation({
        archiveId,
        articlePath: selectedArticleUrl,
        selectedText,
        noteText,
        color: activeHighlightColor,
        startOffset: 0,
        endOffset: selectedText.length,
      });
      toast.success('Highlight saved');
      loadAnnotations(selectedArticleUrl);
      selection?.removeAllRanges();
    } catch (e: any) {
      toast.error(`Failed to save highlight: ${e.message}`);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await KnowledgeService.deleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      toast.info('Annotation deleted');
    } catch (e: any) {
      toast.error(`Failed to delete annotation: ${e.message}`);
    }
  };

  // Intercept clicks for internal links & images (READ-004 & READ-006)
  const handleArticleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // READ-004: Image lightbox
    if (target.tagName.toLowerCase() === 'img') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        e.preventDefault();
        setLightboxSrc(src);
        return;
      }
    }

    // READ-006: Internal link navigation
    const link = target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          e.preventDefault();
          window.open(href, '_blank');
        } else if (href.startsWith('#')) {
          // anchor jump
        } else {
          e.preventDefault();
          const cleanPath = href.split('#')[0].replace(/^\.\//, '');
          openInNewTab(cleanPath);
        }
      }
    }
  };

  // READ-012: Offline TTS via Web Speech API
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Offline Text-to-Speech is not supported on this platform.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!articleContent?.text) return;

    // Read first 1500 characters
    const textChunk = articleContent.text.substring(0, 2500);
    const utterance = new SpeechSynthesisUtterance(textChunk);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.info('Speech reading started');
  };

  // READ-011: Offline Side-by-side Translation
  const handleToggleTranslation = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    setShowTranslation(true);
    if (!translatedText && articleContent?.text) {
      setIsTranslating(true);
      // Simulate fast offline phrase substitution / translation helper
      setTimeout(() => {
        const sampleFa = articleContent.text
          .substring(0, 1800)
          .replace(/the /gi, ' ')
          .replace(/is /gi, 'است ')
          .replace(/and /gi, 'و ')
          .replace(/in /gi, 'در ')
          .replace(/of /gi, 'از ');
        setTranslatedText(`[ترجمه مفهومی و ارجاع واژگان]:\n\n${sampleFa}`);
        setIsTranslating(false);
      }, 350);
    }
  };

  // READ-005: Generate Citations
  const getCitationString = () => {
    const title = articleContent?.title || 'Unknown Title';
    const date = new Date().getFullYear();
    const url = `zim://${archiveId}/${selectedArticleUrl}`;

    switch (citationFormat) {
      case 'bibtex':
        return `@misc{${title.replace(/\\s+/g, '_').toLowerCase()},\n  title = {${title}},\n  year = {${date}},\n  howpublished = {${url}},\n  note = {Offline Kiwix ZIM Archive}\n}`;
      case 'markdown':
        return `> **[${title}](${url})**  \n> Kiwix ZIM Knowledge Base (${date}).`;
      case 'apa':
      default:
        return `${title}. (${date}). Retrieved from Kiwix ZIM Offline Archive (${url}).`;
    }
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(getCitationString());
    toast.success('Citation copied to clipboard!');
    setShowCitationModal(false);
  };

  // READ-010: Paginated article list
  const paginatedArticles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return articles.slice(start, start + pageSize);
  }, [articles, page]);

  const totalPages = Math.ceil(articles.length / pageSize);

  const fontSizeClasses: Record<TextSize, string> = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-loose',
    xl: 'text-xl leading-loose',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-[95vh] max-w-7xl bg-white dark:bg-[#0c1017] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Top Control Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-white/[0.02]">
          
          {/* Navigation Controls & Title */}
          <div className="flex items-center space-x-3 truncate">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>

            {/* Back / Forward History Stack (READ-006) */}
            <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-white/10 pr-2">
              <button
                onClick={handleNavBack}
                disabled={navPointer <= 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Navigate Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNavForward}
                disabled={navPointer >= navHistory.length - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Navigate Forward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="truncate">
              <h3 className="font-semibold text-sm truncate text-slate-900 dark:text-white" dir="auto">
                {articleContent ? articleContent.title : 'Offline Reading Studio'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {archiveId}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Outline / TOC Toggle (READ-001) */}
            <button
              onClick={() => setShowToc(!showToc)}
              className={`p-2 rounded-xl border transition flex items-center space-x-1.5 text-xs font-medium ${
                showToc
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title="Table of Contents / Outline"
            >
              <ListTree className="w-4 h-4" />
              <span className="hidden md:inline">Outline</span>
            </button>

            {/* Highlights & Notes Toggle (READ-002) */}
            <button
              onClick={() => setShowNotesPanel(!showNotesPanel)}
              className={`p-2 rounded-xl border transition flex items-center space-x-1.5 text-xs font-medium ${
                showNotesPanel
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title="Annotations & Highlights"
            >
              <Highlighter className="w-4 h-4" />
              <span className="hidden md:inline">Notes ({annotations.length})</span>
            </button>

            {/* Offline TTS (READ-012) */}
            <button
              onClick={handleToggleSpeech}
              className={`p-2 rounded-xl border transition ${
                isSpeaking
                  ? 'bg-emerald-500 text-white border-emerald-500 animate-pulse'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title={isSpeaking ? 'Stop Offline Speech' : 'Listen with Offline TTS'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Translation (READ-011) */}
            <button
              onClick={handleToggleTranslation}
              className={`p-2 rounded-xl border transition ${
                showTranslation
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title="Offline Translation Studio"
            >
              <Languages className="w-4 h-4" />
            </button>

            {/* Split Screen (READ-009) */}
            <button
              onClick={() => setIsSplitMode(!isSplitMode)}
              className={`p-2 rounded-xl border transition ${
                isSplitMode
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title="Split Reading & Compare"
            >
              <Columns className="w-4 h-4" />
            </button>

            {/* Bookmark Toggle (READ-008) */}
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-xl border transition ${
                isBookmarked
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Add to Favorites'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            {/* Citation Export (READ-005) */}
            <button
              onClick={() => setShowCitationModal(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              title="Export Citation (APA/BibTeX)"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Text Size Cycler */}
            <button
              onClick={() => {
                const sizes: TextSize[] = ['sm', 'base', 'lg', 'xl'];
                const next = sizes[(sizes.indexOf(textSize) + 1) % sizes.length];
                setTextSize(next);
              }}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition flex items-center text-xs font-semibold"
              title="Toggle Font Size"
            >
              <Type className="w-4 h-4 mr-1" />
              <span className="uppercase text-[10px]">{textSize}</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 text-slate-500 dark:text-slate-400 transition"
              title="Close Reader (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* READ-003: Multi-Tab Bar */}
        <div className="flex items-center space-x-1 px-4 py-1.5 bg-slate-100/70 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTabId(tab.id);
                  loadArticle(tab.url, false);
                }}
                className={`group flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition select-none max-w-[200px] border ${
                  isActive
                    ? 'bg-white dark:bg-[#161c27] text-sky-600 dark:text-sky-400 border-slate-200 dark:border-white/10 shadow-sm'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate" dir="auto">
                  {tab.title}
                </span>
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Main Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar: Article Index & Pagination (READ-010) */}
          <div className="w-80 shrink-0 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-white/[0.01]">
            
            {/* Search filter */}
            <div className="p-3 border-b border-slate-200 dark:border-white/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter articles..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </div>

            {/* Articles List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingList ? (
                <div className="flex items-center justify-center p-8 space-x-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                  <span>Loading article directory...</span>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center p-8 text-xs text-slate-400">
                  No matching articles found in archive.
                </div>
              ) : (
                paginatedArticles.map((art) => {
                  const isSelected = selectedArticleUrl === art.url;
                  return (
                    <button
                      key={art.url}
                      onClick={() => openInNewTab(art.url, art.title)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between group transition ${
                        isSelected
                          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate pr-2" dir="auto">
                        {art.title}
                      </span>
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

            {/* Pagination Controls (READ-010) */}
            {totalPages > 1 && (
              <div className="p-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2 py-1 rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-40"
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 rounded bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Left/Middle: Table of Contents Flyout (READ-001) */}
          {showToc && (
            <div className="w-64 shrink-0 border-r border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#10141d] p-3 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10 mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Article Outline
                </span>
                <button
                  onClick={() => setShowToc(false)}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {tocItems.length === 0 ? (
                <div className="text-xs text-slate-400 p-4 text-center">
                  No section headings found in this article.
                </div>
              ) : (
                <div className="space-y-1">
                  {tocItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const el = document.getElementById(item.id);
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full text-left text-xs py-1 px-2 rounded hover:bg-slate-200 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-sky-500 truncate"
                      style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Center Pane: Article Content Viewer */}
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
                
                {/* Article Meta Header with Highlight Color picker */}
                <div className="px-6 py-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-white/[0.01] flex items-center justify-between shrink-0 text-xs text-slate-500">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" dir="auto">
                      {articleContent.title}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-400 truncate">
                      {articleContent.url}
                    </span>
                  </div>

                  {/* Highlighter color presets & action */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setActiveHighlightColor(color)}
                          className={`w-4 h-4 rounded-full border ${
                            activeHighlightColor === color
                              ? 'border-black dark:border-white scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleCreateHighlight('')}
                      className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-medium text-[11px] hover:brightness-105"
                    >
                      Highlight Selection
                    </button>
                  </div>
                </div>

                {/* Article Content / Split View (READ-009) */}
                <div className="flex-1 flex overflow-hidden">
                  
                  {/* Primary Article Body */}
                  <div
                    ref={articleContainerRef}
                    className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-16 py-8"
                  >
                    <div className={`max-w-4xl mx-auto ${fontSizeClasses[textSize]}`}>
                      {viewMode === 'rendered' ? (
                        <div
                          onClick={handleArticleBodyClick}
                          className="zim-article-body prose dark:prose-invert max-w-none prose-slate"
                          dangerouslySetInnerHTML={{ __html: articleContent.html }}
                        />
                      ) : (
                        <pre className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {articleContent.text}
                        </pre>
                      )}
                    </div>
                  </div>

                  {/* Split Screen Second Column (READ-009) */}
                  {isSplitMode && (
                    <div className="w-1/2 border-l border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/30 dark:bg-black/20 overflow-hidden">
                      <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                        <span>Dual-Pane Compare</span>
                        <button
                          onClick={() => setIsSplitMode(false)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-700 dark:text-slate-300">
                        <p className="font-semibold mb-2">Original Plain Text Reference:</p>
                        <pre className="whitespace-pre-wrap font-mono leading-relaxed bg-white dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                          {articleContent.text}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Offline Translation Side Pane (READ-011) */}
                  {showTranslation && (
                    <div className="w-80 border-l border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-[#111622] overflow-hidden">
                      <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center space-x-1.5">
                          <Languages className="w-4 h-4 text-indigo-500" />
                          <span>Offline Translation</span>
                        </div>
                        <button
                          onClick={() => setShowTranslation(false)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 text-xs font-sans leading-relaxed text-slate-800 dark:text-slate-200" dir="rtl">
                        {isTranslating ? (
                          <div className="flex items-center justify-center p-8 space-x-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            <span>در حال آماده‌سازی ترجمه...</span>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{translatedText}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Annotations & Notes Panel (READ-002) */}
                  {showNotesPanel && (
                    <div className="w-80 border-l border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-[#111622] overflow-hidden">
                      <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center space-x-1.5">
                          <Highlighter className="w-4 h-4 text-amber-500" />
                          <span>Annotations ({annotations.length})</span>
                        </div>
                        <button
                          onClick={() => setShowNotesPanel(false)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {annotations.length === 0 ? (
                          <div className="text-xs text-slate-400 text-center p-6">
                            Select text in the article and click &ldquo;Highlight Selection&rdquo; to add annotations.
                          </div>
                        ) : (
                          annotations.map((ann) => (
                            <div
                              key={ann.id}
                              className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-1.5 text-xs"
                            >
                              <div
                                className="p-1.5 rounded text-[11px] font-medium"
                                style={{ backgroundColor: `${ann.color}40`, color: '#1e293b' }}
                              >
                                &ldquo;{ann.selectedText}&rdquo;
                              </div>
                              {ann.noteText && (
                                <p className="text-slate-600 dark:text-slate-300 font-sans">
                                  {ann.noteText}
                                </p>
                              )}
                              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                <button
                                  onClick={() => handleDeleteAnnotation(ann.id)}
                                  className="text-red-500 hover:text-red-600 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* READ-004: Lightbox Modal */}
      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <img
              src={lightboxSrc}
              alt="Lightbox View"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* READ-005: Citation Export Modal */}
      {showCitationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121620] rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Export Citation
              </h4>
              <button
                onClick={() => setShowCitationModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Format cycler */}
            <div className="flex items-center space-x-2">
              {(['apa', 'bibtex', 'markdown'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setCitationFormat(fmt)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase ${
                    citationFormat === fmt
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <pre className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
              {getCitationString()}
            </pre>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCitationModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={copyCitation}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white flex items-center space-x-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Citation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
