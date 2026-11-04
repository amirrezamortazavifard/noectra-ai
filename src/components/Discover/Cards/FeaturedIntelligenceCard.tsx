'use client';

import React from 'react';
import { DiscoverFeedItem } from '@/lib/services/discover/types';
import {
  Sparkles,
  Bookmark,
  BookOpen,
  MessageSquare,
  ExternalLink,
  Clock,
  Check,
  Share2,
  FileText,
  Layers,
  Headphones,
} from 'lucide-react';
import { toast } from 'sonner';
import { openExternalLink } from '@/lib/openExternal';
import { formatTimeDifference } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { AlphaXivModal, extractArxivId } from '@/components/Discover/Modals/AlphaXivModal';

interface FeaturedIntelligenceCardProps {
  item: DiscoverFeedItem;
  isSaved?: boolean;
  isInQueue?: boolean;
  onSave?: (item: DiscoverFeedItem) => void;
  onAddToQueue?: (item: DiscoverFeedItem) => void;
  onOpenArticle?: (item: DiscoverFeedItem) => void;
  onExplainAi?: (item: DiscoverFeedItem) => void;
  onDiscussAi?: (item: DiscoverFeedItem) => void;
  isComparing?: boolean;
  onToggleCompare?: (item: DiscoverFeedItem) => void;
}

export const FeaturedIntelligenceCard: React.FC<FeaturedIntelligenceCardProps> = ({
  item,
  isSaved,
  isInQueue,
  onSave,
  onAddToQueue,
  onOpenArticle,
  onExplainAi,
  onDiscussAi,
  isComparing,
  onToggleCompare,
}) => {
  const { playTrack } = useAudioPlayer();
  const [isAlphaXivOpen, setIsAlphaXivOpen] = React.useState<boolean>(false);
  const arxivId = extractArxivId(item.url) || (item.doi ? extractArxivId(item.doi) : null);

  const handleOpenSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    openExternalLink(item.url, e);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    toast.success('Source link copied to clipboard');
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-white/95 via-white/80 to-slate-50/90 dark:from-[#0d121f]/95 dark:via-[#0c101a]/90 dark:to-[#080b12]/95 border border-cyan-500/30 dark:border-cyan-500/25 shadow-[0_12px_40px_rgba(6,182,212,0.1)] hover:shadow-[0_16px_50px_rgba(6,182,212,0.18)] transition-all duration-300 group">
      {/* Ambient Cyber Light Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-between">
        {/* Left Column: Intelligence Metadata & Content */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {/* Top Badge Strip */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Sparkles size={13} className="text-cyan-500 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Featured Breakthrough</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white/80 border border-black/5 dark:border-white/10">
                {item.source}
              </span>

              {item.openAccess && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Open Access
                </span>
              )}

              {item.peerReviewed && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                  Peer-Reviewed
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono ml-auto">
                <Clock size={12} />
                <span>{formatTimeDifference(new Date(), item.publishedAt)}</span>
              </span>
            </div>

            {/* Headline Title */}
            <h2
              onClick={() => (onOpenArticle ? onOpenArticle(item) : undefined)}
              className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-white leading-snug tracking-tight mb-3 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              {item.title}
            </h2>

            {/* Authors */}
            {item.authors && item.authors.length > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 font-medium">
                <span className="text-slate-400 dark:text-slate-500 font-normal">Authors: </span>
                {item.authors.slice(0, 4).join(', ')}
                {item.authors.length > 4 ? ` et al.` : ''}
              </p>
            )}

            {/* Editorial Excerpt */}
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-3 sm:line-clamp-4 mb-4">
              {item.description}
            </p>

            {/* Relevance Signals (Explainable AI) */}
            {item.whyRelevant && item.whyRelevant.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                  Why you see this:
                </span>
                {item.whyRelevant.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border border-cyan-500/20"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/70 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              {/* Explain with AI */}
              <button
                type="button"
                onClick={() => onExplainAi?.(item)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm hover:shadow transition-all active:scale-95"
              >
                <Sparkles size={13} />
                <span>AI Synthesis</span>
              </button>

              {/* Discuss in Chat */}
              <button
                type="button"
                onClick={() => onDiscussAi?.(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-black/5 dark:border-white/10 transition-colors active:scale-95"
              >
                <MessageSquare size={13} className="text-violet-500" />
                <span>Discuss</span>
              </button>

              {/* Compare toggle */}
              {onToggleCompare && (
                <button
                  type="button"
                  onClick={() => onToggleCompare(item)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors active:scale-95',
                    isComparing
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-700 dark:text-violet-300'
                      : 'bg-transparent border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-violet-500/30'
                  )}
                >
                  <Layers size={13} />
                  <span>{isComparing ? 'Comparing' : 'Compare'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              {/* alphaXiv Shortcut */}
              {arxivId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAlphaXivOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30 text-blue-700 dark:text-cyan-300 border border-cyan-500/30 transition-all active:scale-95"
                  title="Open paper with alphaXiv community annotations"
                >
                  <span className="font-extrabold text-[11px]">αX</span>
                  <span>alphaXiv</span>
                </button>
              )}

              {/* Listen Audio */}
              <button
                type="button"
                title="Listen to Breakthrough Audio Overview"
                onClick={(e) => {
                  e.stopPropagation();
                  playTrack({
                    id: item.id,
                    title: item.title,
                    source: item.source,
                    audioUrl: (item as any).audioUrl || `https://api.streamaudio.fake/read?id=${item.id}`,
                    imageUrl: item.thumbnail,
                    articleUrl: item.url,
                  });
                  toast.success(`Playing audio overview for "${item.title.slice(0, 30)}..."`);
                }}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                <Headphones size={16} />
              </button>

              {/* Reading Queue Button */}
              <button
                type="button"
                title={isInQueue ? 'In Reading Queue' : 'Add to Reading Queue'}
                onClick={() => onAddToQueue?.(item)}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  isInQueue
                    ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                    : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <BookOpen size={16} />
              </button>

              {/* Bookmark Save Button */}
              <button
                type="button"
                title={isSaved ? 'Saved to Bookmarks' : 'Save Bookmark'}
                onClick={() => onSave?.(item)}
                className={cn(
                  'p-2 rounded-xl transition-colors',
                  isSaved
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                    : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
              </button>

              {/* Share / Copy */}
              <button
                type="button"
                title="Copy Link"
                onClick={handleCopyLink}
                className="p-2 rounded-xl hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Share2 size={16} />
              </button>

              {/* External Source */}
              <button
                type="button"
                title="Open Source"
                onClick={handleOpenSource}
                className="p-2 rounded-xl hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Thumbnail if available */}
        {item.thumbnail && (
          <div
            onClick={() => (onOpenArticle ? onOpenArticle(item) : undefined)}
            className="w-full lg:w-80 h-52 sm:h-64 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 relative flex-shrink-0 cursor-pointer shadow-md group-hover:shadow-lg transition-all"
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // Hide broken images gracefully
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4">
              <span className="text-[11px] font-mono text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20">
                {item.readingTimeMin} min read
              </span>
            </div>
          </div>
        )}
      </div>

      {/* alphaXiv Modal */}
      {arxivId && (
        <AlphaXivModal
          isOpen={isAlphaXivOpen}
          onClose={() => setIsAlphaXivOpen(false)}
          paper={{
            id: item.id,
            title: item.title,
            url: item.url,
            doi: item.doi,
            authors: item.authors,
            description: item.description,
          }}
        />
      )}
    </div>
  );
};

export default FeaturedIntelligenceCard;
