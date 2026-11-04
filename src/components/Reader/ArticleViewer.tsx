import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  EyeOff,
  ExternalLink,
  Type,
  AlignLeft,
  AlignRight,
  Share2,
  Copy,
  Globe,
  FileText,
  BookOpen,
  Loader2,
  Rss,
} from 'lucide-react';
import { FeedItem, FeedSource, SourceOpenTarget, SourceTextDirection } from '@/lib/reader/types';
import { openExternalLink } from '@/lib/openExternal';
import { fetchFullContent } from '@/lib/reader/api';
import { toast } from 'sonner';

interface ArticleViewerProps {
  item: FeedItem;
  source?: FeedSource;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleRead: (item: FeedItem) => void;
  onToggleStar: (item: FeedItem) => void;
  onToggleHide: (item: FeedItem) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
}

export default function ArticleViewer({
  item,
  source,
  onClose,
  onPrev,
  onNext,
  onToggleRead,
  onToggleStar,
  onToggleHide,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
}: ArticleViewerProps) {
  const [openTarget, setOpenTarget] = useState<SourceOpenTarget>(
    source?.openTarget || 'local'
  );
  const [textDir, setTextDir] = useState<SourceTextDirection>(
    source?.textDir || 'ltr'
  );
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [showTypographyPopover, setShowTypographyPopover] = useState(false);

  // If source default is full content, load it on mount
  useEffect(() => {
    if (openTarget === 'full' && !fullContent) {
      loadFullContent();
    }
  }, [item.id, openTarget]);

  const loadFullContent = async () => {
    setIsLoadingFull(true);
    try {
      const content = await fetchFullContent(item.link);
      setFullContent(content);
    } catch (e: any) {
      toast.error('Could not extract full content; falling back to RSS summary.');
    } finally {
      setIsLoadingFull(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.link);
    toast.success('Article link copied to clipboard');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c1017] text-slate-900 dark:text-white select-text">
      {/* Top Header Command Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#0c1017]/80 backdrop-blur-md select-none shrink-0 z-10">
        {/* Left: Source Icon, Navigation & Close */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            title="Close Article (Esc)"
            className="p-1.5 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <X size={16} />
          </button>

          <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

          {onPrev && (
            <button
              onClick={onPrev}
              title="Previous Article (k)"
              className="p-1.5 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {onNext && (
            <button
              onClick={onNext}
              title="Next Article (j)"
              className="p-1.5 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          )}

          <div className="flex items-center space-x-1.5 pl-2 text-xs text-black/60 dark:text-white/60 truncate max-w-[200px]">
            {source?.iconUrl ? (
              <img
                src={source.iconUrl}
                alt=""
                className="w-4 h-4 rounded object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Rss size={13} className="text-orange-500 shrink-0" />
            )}
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">
              {source?.name || 'Feed'}
            </span>
          </div>
        </div>

        {/* Center: Reading Mode Selector */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06] text-xs">
          <button
            onClick={() => setOpenTarget('local')}
            title="Local RSS Reader"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all ${
              openTarget === 'local'
                ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm font-semibold'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <FileText size={13} />
            <span>RSS</span>
          </button>
          <button
            onClick={() => {
              setOpenTarget('full');
              if (!fullContent) loadFullContent();
            }}
            title="Mercury Full Content Parser"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all ${
              openTarget === 'full'
                ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm font-semibold'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <BookOpen size={13} />
            <span>Full Content</span>
          </button>
          <button
            onClick={() => setOpenTarget('webpage')}
            title="Original Webpage"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg transition-all ${
              openTarget === 'webpage'
                ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm font-semibold'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <Globe size={13} />
            <span>Webpage</span>
          </button>
        </div>

        {/* Right: Actions, Direction, Typography */}
        <div className="flex items-center space-x-1">
          {/* Text Direction */}
          <button
            onClick={() => setTextDir(textDir === 'ltr' ? 'rtl' : 'ltr')}
            title={`Toggle Text Direction (${textDir.toUpperCase()})`}
            className="p-1.5 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs flex items-center space-x-1"
          >
            {textDir === 'rtl' ? <AlignRight size={15} /> : <AlignLeft size={15} />}
            <span className="uppercase font-semibold text-[10px]">{textDir}</span>
          </button>

          {/* Typography Settings Popover */}
          <div className="relative">
            <button
              onClick={() => setShowTypographyPopover(!showTypographyPopover)}
              title="Typography Options"
              className={`p-1.5 rounded-xl transition-all ${
                showTypographyPopover
                  ? 'bg-sky-500/10 text-sky-500'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Type size={15} />
            </button>

            {showTypographyPopover && (
              <div className="absolute right-0 mt-2 w-64 p-3.5 rounded-2xl bg-white dark:bg-[#121722] border border-black/10 dark:border-white/15 shadow-xl z-50 text-xs space-y-3">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Typography Settings
                </div>
                <div>
                  <label className="block text-[11px] text-black/50 dark:text-white/50 mb-1">
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => onFontFamilyChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value='"Segoe UI", sans-serif'>Segoe UI (System)</option>
                    <option value='Inter, sans-serif'>Inter</option>
                    <option value='Merriweather, serif'>Merriweather (Serif)</option>
                    <option value='Georgia, serif'>Georgia (Serif)</option>
                    <option value='monospace'>Monospace</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-black/50 dark:text-white/50 mb-1">
                    <span>Font Size</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="28"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

          {/* Read Status */}
          <button
            onClick={() => onToggleRead(item)}
            title={item.hasRead ? 'Mark as Unread (m)' : 'Mark as Read (m)'}
            className={`p-1.5 rounded-xl transition-all ${
              item.hasRead
                ? 'text-sky-500 hover:bg-sky-500/10'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Check size={16} className={item.hasRead ? 'stroke-[2.5]' : ''} />
          </button>

          {/* Star Status */}
          <button
            onClick={() => onToggleStar(item)}
            title={item.starred ? 'Starred (s)' : 'Star (s)'}
            className={`p-1.5 rounded-xl transition-all ${
              item.starred
                ? 'text-amber-500 fill-amber-500'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Star size={16} className={item.starred ? 'fill-amber-500' : ''} />
          </button>

          {/* Hide */}
          <button
            onClick={() => onToggleHide(item)}
            title="Hide (h)"
            className="p-1.5 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <EyeOff size={16} />
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            title="Copy Link"
            className="p-1.5 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <Copy size={16} />
          </button>

          {/* Open External Browser */}
          <button
            onClick={() => openExternalLink(item.link)}
            title="Open in Browser (v)"
            className="p-1.5 rounded-xl text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {openTarget === 'webpage' ? (
          <iframe
            src={`/api/proxy_article?url=${encodeURIComponent(item.link)}`}
            title={item.title}
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-popups"
          />
        ) : (
          <div
            className={`max-w-3xl mx-auto px-6 py-10 transition-all ${
              textDir === 'rtl' ? 'rtl text-right' : 'ltr text-left'
            }`}
            style={{ fontFamily }}
          >
            {/* Article Meta */}
            <div className="mb-8 border-b border-black/[0.08] dark:border-white/[0.08] pb-6">
              <h1
                className="font-bold leading-tight mb-4 text-slate-900 dark:text-white"
                style={{ fontSize: `${fontSize * 1.65}px` }}
              >
                {item.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-black/50 dark:text-white/50">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {source?.name || 'Feed'}
                </span>
                {item.author && (
                  <>
                    <span>•</span>
                    <span>By {item.author}</span>
                  </>
                )}
                <span>•</span>
                <span>
                  {new Date(item.pubDate).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>

            {/* Optional Cover image */}
            {item.thumbUrl && (
              <div className="mb-8 rounded-2xl overflow-hidden max-h-96 w-full bg-black/[0.03] dark:bg-white/[0.03]">
                <img
                  src={item.thumbUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Reading Body */}
            {isLoadingFull ? (
              <div className="flex flex-col items-center justify-center py-20 text-black/50 dark:text-white/50 space-y-3">
                <Loader2 size={28} className="animate-spin text-sky-500" />
                <p className="text-sm">Extracting full article content...</p>
              </div>
            ) : openTarget === 'full' && fullContent ? (
              <div
                className="prose dark:prose-invert max-w-none leading-relaxed text-slate-800 dark:text-slate-200"
                style={{ fontSize: `${fontSize}px`, lineHeight: '1.75' }}
                dangerouslySetInnerHTML={{ __html: fullContent }}
              />
            ) : item.content ? (
              <div
                className="prose dark:prose-invert max-w-none leading-relaxed text-slate-800 dark:text-slate-200"
                style={{ fontSize: `${fontSize}px`, lineHeight: '1.75' }}
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ) : (
              <div className="space-y-4">
                <p
                  className="leading-relaxed text-slate-800 dark:text-slate-200"
                  style={{ fontSize: `${fontSize}px`, lineHeight: '1.75' }}
                >
                  {item.snippet || 'No article content available in RSS feed.'}
                </p>
                <div className="pt-6">
                  <button
                    onClick={loadFullContent}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-all shadow-sm"
                  >
                    <BookOpen size={14} />
                    <span>Extract Full Content</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

