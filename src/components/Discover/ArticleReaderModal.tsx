'use client';

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  Calendar,
  BookOpen,
  Globe,
  Loader2,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { NewsItem } from '@/lib/services/discover/types';
import { openExternalLink } from '@/lib/openExternal';
import { formatTimeDifference } from '@/lib/utils';

interface ArticleReaderModalProps {
  item: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'reader' | 'webview'>('reader');
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch full scraped article text when reader opens
  useEffect(() => {
    if (isOpen && item && item.url) {
      setViewMode('reader');
      setFullContent(null);
      setImageError(false);
      setLoadingContent(true);

      fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.content && data.content.trim().length > 0) {
            setFullContent(data.content);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingContent(false));
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const chatPrompt = encodeURIComponent(
    `Please provide a comprehensive synthesis and deep analytical summary of this article:\nTitle: "${item.title}"\nSource: ${item.source}\nURL: ${item.url}\n\nContent:\n${fullContent || item.description}`
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    toast.success('Article link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSummarizeWithAi = () => {
    onClose();
    navigate(`/chat?q=${chatPrompt}`);
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    openExternalLink(item.url, e);
  };

  // Proxied live web URL to bypass X-Frame-Options: SAMEORIGIN
  const proxyWebUrl = `/api/proxy_article?url=${encodeURIComponent(item.url)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-black/80 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={onClose}
        />

        {/* Centered Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`relative z-10 w-full ${
            isMaximized ? 'max-w-7xl h-[96vh]' : 'max-w-4xl h-[88vh]'
          } bg-[#0c1017] text-white rounded-3xl border border-white/[0.09] shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden transition-all duration-300`}
        >
          {/* Top Bar / Navigation */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#0c0f16]/95 backdrop-blur-md shrink-0">
            {/* Source & View Switcher */}
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                {item.source}
              </span>

              {/* View Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setViewMode('reader')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'reader'
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <BookOpen size={13} />
                  <span>Reader View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('webview')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'webview'
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Globe size={13} />
                  <span>Live Web</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Summarize with AI */}
              <button
                type="button"
                onClick={handleSummarizeWithAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all active:scale-95"
              >
                <Sparkles size={13} />
                <span className="hidden sm:inline">Summarize with AI</span>
                <span className="sm:hidden">AI</span>
              </button>

              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                title="Copy link"
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>

              {/* Open in external browser */}
              <button
                type="button"
                onClick={handleOpenExternal}
                title="Open in external browser"
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.07] border border-white/[0.06] transition-colors"
              >
                <ExternalLink size={14} />
              </button>

              {/* Maximize / Restore Toggle */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? 'Restore window' : 'Maximize window'}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.07] border border-white/[0.06] transition-colors hidden sm:inline-flex"
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              {/* Close Dialog */}
              <button
                type="button"
                onClick={onClose}
                title="Close (Esc)"
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.1] border border-white/[0.06] transition-colors ml-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main Content View */}
          {viewMode === 'reader' ? (
            <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 space-y-6 select-text scrollbar-thin">
              {/* Meta & Published Time */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/40 font-mono">
                <span className="text-cyan-400 font-semibold">{item.source}</span>
                <span>•</span>
                {item.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {' '}({formatTimeDifference(new Date(), item.publishedAt)} ago)
                  </span>
                )}
                {item.category && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{item.category}</span>
                  </>
                )}
              </div>

              {/* Title */}
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-light text-white leading-tight"
                style={{ fontFamily: 'PP Editorial, Georgia, serif' }}
              >
                {item.title}
              </h1>

              {/* Hero Image if available */}
              {item.imageUrl && !imageError && (
                <div className="w-full max-h-96 rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40 relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}

              {/* Content Body */}
              <div className="space-y-4 pt-2">
                {/* Excerpt / Lead Paragraph */}
                {item.description && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border-l-2 border-cyan-500 text-sm sm:text-base text-white/80 leading-relaxed font-normal">
                    {item.description}
                  </div>
                )}

                {/* Scraped Full Content with paragraph formatting */}
                {loadingContent ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/40 text-xs">
                    <Loader2 size={24} className="animate-spin text-cyan-500" />
                    <span>Extracting clean article text from {item.source}...</span>
                  </div>
                ) : fullContent ? (
                  <div className="text-sm sm:text-base text-white/75 leading-relaxed space-y-4 font-normal pt-2">
                    {fullContent.split('\n\n').map((paragraph, idx) => {
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h3 key={idx} className="text-lg sm:text-xl font-medium text-white pt-2">
                            {paragraph.replace('### ', '')}
                          </h3>
                        );
                      }
                      return (
                        <p key={idx} className="leading-relaxed">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3 mt-6">
                    <p className="text-xs text-white/50">
                      The publisher requires direct reading or protects content behind paywalls.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setViewMode('webview')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 transition-colors"
                      >
                        Switch to Live Web View
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenExternal}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors flex items-center gap-1.5"
                      >
                        <span>Open on {item.source}</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Sticky-like Synthesis CTA */}
              <div className="pt-8 pb-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-white/50 text-center sm:text-left">
                  Have questions about this story? Ask the AI model to analyze claims, extract key takeaways, or compare sources.
                </div>
                <button
                  type="button"
                  onClick={handleSummarizeWithAi}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-white flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
                >
                  <Sparkles size={14} />
                  <span>Synthesize with AI</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Web View with Proxy to bypass X-Frame-Options */
            <div className="relative flex-1 w-full h-full bg-[#0a0d13] flex flex-col overflow-hidden">
              <div className="bg-[#121620] px-4 py-2 text-xs text-white/50 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 truncate max-w-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="truncate">{item.url}</span>
                </div>
                <button
                  onClick={handleOpenExternal}
                  className="text-cyan-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Open in external browser</span>
                  <ExternalLink size={12} />
                </button>
              </div>
              <iframe
                src={proxyWebUrl}
                title={item.title}
                className="w-full flex-1 border-none bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ArticleReaderModal;
