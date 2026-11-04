'use client';

import React, { useState } from 'react';
import { DiscoverFeedItem } from '@/lib/services/discover/types';
import {
  ExternalLink,
  BookOpen,
  Bookmark,
  MessageSquare,
  Sparkles,
  Clock,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { openExternalLink } from '@/lib/openExternal';
import { formatTimeDifference } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BreakingNewsCardProps {
  item: DiscoverFeedItem;
  isSaved?: boolean;
  isInQueue?: boolean;
  onSave?: (item: DiscoverFeedItem) => void;
  onAddToQueue?: (item: DiscoverFeedItem) => void;
  onOpenArticle?: (item: DiscoverFeedItem) => void;
  onExplainAi?: (item: DiscoverFeedItem) => void;
  onDiscussAi?: (item: DiscoverFeedItem) => void;
}

export const BreakingNewsCard: React.FC<BreakingNewsCardProps> = ({
  item,
  isSaved,
  isInQueue,
  onSave,
  onAddToQueue,
  onOpenArticle,
  onExplainAi,
  onDiscussAi,
}) => {
  const [imageError, setImageError] = useState<boolean>(false);

  const handleOpenSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    openExternalLink(item.url, e);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    toast.success('News link copied');
  };

  return (
    <div
      onClick={() => onOpenArticle?.(item)}
      className="flex flex-col rounded-2xl bg-white/80 dark:bg-[#0f1420]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer group"
    >
      {/* Thumbnail Header */}
      {item.thumbnail && !imageError && (
        <div className="relative w-full h-44 overflow-hidden bg-slate-100 dark:bg-black/30">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
            <span className="text-[10px] font-semibold text-white/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20">
              {item.readingTimeMin} min read
            </span>
          </div>
        </div>
      )}

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2 mb-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-semibold text-[11px]">
                {item.source}
              </span>
              <span className="text-slate-400 dark:text-white/30">•</span>
              <span className="text-slate-500 dark:text-slate-400 capitalize text-[11px]">
                {item.category}
              </span>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-white/40">
              <Clock size={11} />
              <span>{formatTimeDifference(new Date(), item.publishedAt)}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
            {item.title}
          </h3>

          {/* Excerpt */}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-4">
            {item.description}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-4">
              {item.tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Row */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-white/10 text-xs"
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onExplainAi?.(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 transition-colors active:scale-95"
            >
              <Sparkles size={11} />
              <span>Synthesize</span>
            </button>

            <button
              type="button"
              onClick={() => onDiscussAi?.(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white transition-colors active:scale-95"
            >
              <MessageSquare size={11} />
              <span>Discuss</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            {/* Reading Queue */}
            <button
              type="button"
              title={isInQueue ? 'In Reading Queue' : 'Add to Reading Queue'}
              onClick={() => onAddToQueue?.(item)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isInQueue
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                  : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              <BookOpen size={15} />
            </button>

            {/* Bookmark */}
            <button
              type="button"
              title={isSaved ? 'Saved to Bookmarks' : 'Save Bookmark'}
              onClick={() => onSave?.(item)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isSaved
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
            </button>

            {/* Copy Link */}
            <button
              type="button"
              title="Copy Link"
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Share2 size={14} />
            </button>

            {/* External */}
            <button
              type="button"
              title="Open Source Link"
              onClick={handleOpenSource}
              className="p-1.5 rounded-lg hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <ExternalLink size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakingNewsCard;
