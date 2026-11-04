'use client';

import React from 'react';
import { DiscoverFeedItem } from '@/lib/services/discover/types';
import {
  MessageSquare,
  Sparkles,
  Bookmark,
  BookOpen,
  Share2,
  ExternalLink,
  Headphones,
  Check,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { openExternalLink } from '@/lib/openExternal';
import { formatTimeDifference } from '@/lib/utils';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { cn } from '@/lib/utils';

interface SocialPostCardProps {
  item: DiscoverFeedItem;
  isSaved?: boolean;
  isInQueue?: boolean;
  onSave?: (item: DiscoverFeedItem) => void;
  onAddToQueue?: (item: DiscoverFeedItem) => void;
  onOpenArticle?: (item: DiscoverFeedItem) => void;
  onExplainAi?: (item: DiscoverFeedItem) => void;
  onDiscussAi?: (item: DiscoverFeedItem) => void;
}

export const SocialPostCard: React.FC<SocialPostCardProps> = ({
  item,
  isSaved,
  isInQueue,
  onSave,
  onAddToQueue,
  onOpenArticle,
  onExplainAi,
  onDiscussAi,
}) => {
  const { playTrack } = useAudioPlayer();

  const handleOpenSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    openExternalLink(item.url, e);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.url);
    toast.success('Post link copied to clipboard');
  };

  // Detect platform
  const isReddit = item.source.toLowerCase().includes('reddit') || item.url.includes('reddit.com');
  const isHackerNews = item.source.toLowerCase().includes('hacker news') || item.url.includes('ycombinator.com');
  const isX = item.source.toLowerCase().includes('x /') || item.source.toLowerCase().includes('twitter') || item.url.includes('x.com') || item.url.includes('twitter.com');
  const isBluesky = item.source.toLowerCase().includes('bluesky') || item.url.includes('bsky.app');

  const platformBadge = isReddit ? (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 flex items-center gap-1">
      <span>Reddit</span>
    </span>
  ) : isHackerNews ? (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1">
      <span>Hacker News</span>
    </span>
  ) : isX ? (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900/10 dark:bg-white/10 text-slate-900 dark:text-white border border-black/10 dark:border-white/15 flex items-center gap-1">
      <span>X / Twitter</span>
    </span>
  ) : isBluesky ? (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 flex items-center gap-1">
      <span>Bluesky</span>
    </span>
  ) : (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
      {item.source}
    </span>
  );

  return (
    <div
      onClick={() => onOpenArticle?.(item)}
      className="group relative flex flex-col justify-between p-5 rounded-3xl bg-white/80 dark:bg-[#0e1320]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-orange-500/40 dark:hover:border-orange-500/35 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {platformBadge}
            <span className="text-slate-400 dark:text-white/30 text-xs">•</span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-white/50 truncate max-w-[150px]">
              {item.source}
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-400 dark:text-white/40">
            {formatTimeDifference(item.publishedAt, new Date())}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm sm:text-base leading-snug mb-2 text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {item.title}
        </h3>

        {/* Snippet */}
        {item.description && (
          <p className="text-xs text-slate-600 dark:text-slate-300/85 line-clamp-3 leading-relaxed mb-4">
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-white/10 text-xs mt-2"
      >
        <div className="flex items-center gap-1.5">
          {/* AI Sentiment / Synthesize */}
          <button
            type="button"
            onClick={() => onDiscussAi?.(item)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/25 transition-all active:scale-95 shadow-sm"
            title="Synthesize community discussions and consensus with AI"
          >
            <Sparkles size={12} className="text-orange-500" />
            <span>AI Synthesize</span>
          </button>

          {/* AI Explain */}
          {onExplainAi && (
            <button
              type="button"
              onClick={() => onExplainAi(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white transition-all active:scale-95"
            >
              <MessageSquare size={12} />
              <span className="hidden sm:inline">Explain</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          {/* Listen Audio */}
          <button
            type="button"
            title="Listen with In-App Player"
            onClick={() => {
              playTrack({
                id: item.id,
                title: item.title,
                source: item.source,
                audioUrl: `https://api.streamaudio.fake/read?id=${item.id}`,
                articleUrl: item.url,
              });
              toast.success(`Playing audio for "${item.title.slice(0, 25)}..."`);
            }}
            className="p-1.5 rounded-lg hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            <Headphones size={15} />
          </button>

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

          {/* Open Original Source */}
          <button
            type="button"
            title="Open Original Discussion"
            onClick={handleOpenSource}
            className="p-1.5 rounded-lg hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
          >
            <ExternalLink size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialPostCard;
