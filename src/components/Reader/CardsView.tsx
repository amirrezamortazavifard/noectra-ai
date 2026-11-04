import React from 'react';
import { Star, Check, EyeOff, ExternalLink, Rss } from 'lucide-react';
import { FeedItem, FeedSource, ViewConfigs } from '@/lib/reader/types';
import { openExternalLink } from '@/lib/openExternal';

interface CardsViewProps {
  items: FeedItem[];
  sourcesMap: Record<string, FeedSource>;
  viewConfigs: ViewConfigs;
  onSelectItem: (item: FeedItem) => void;
  onToggleRead: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleStar: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleHide: (item: FeedItem, e: React.MouseEvent) => void;
}

export default function CardsView({
  items,
  sourcesMap,
  viewConfigs,
  onSelectItem,
  onToggleRead,
  onToggleStar,
  onToggleHide,
}: CardsViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 py-20 select-none">
        <Rss size={42} className="mb-3 stroke-1 opacity-50" />
        <p className="text-sm font-medium">No articles found in this view</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-5">
      {items.map((item) => {
        const source = sourcesMap[item.sourceId];
        const isFaded = viewConfigs.fadeRead && item.hasRead;

        return (
          <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
              item.hasRead
                ? 'bg-white/40 dark:bg-[#10141d]/40 border-black/[0.04] dark:border-white/[0.04]'
                : 'bg-white dark:bg-[#121722] border-black/[0.08] dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-black/20 dark:hover:border-white/20'
            } ${isFaded ? 'opacity-50 hover:opacity-100' : ''}`}
          >
            {/* Optional Cover Thumbnail */}
            {viewConfigs.showCover && item.thumbUrl && (
              <div className="relative w-full h-36 bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                <img
                  src={item.thumbUrl}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).parentElement!.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Card Body */}
            <div className="p-4 flex-1 flex flex-col">
              {/* Source Info & PubDate */}
              <div className="flex items-center justify-between text-[11px] text-black/50 dark:text-white/50 mb-2">
                <div className="flex items-center space-x-1.5 truncate max-w-[70%]">
                  {source?.iconUrl ? (
                    <img
                      src={source.iconUrl}
                      alt=""
                      className="w-3.5 h-3.5 rounded object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Rss size={11} className="text-orange-500" />
                  )}
                  <span className="truncate font-medium">{source?.name || 'RSS'}</span>
                </div>
                <span>
                  {new Date(item.pubDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Title */}
              <h3
                className={`text-sm font-semibold leading-snug line-clamp-3 mb-2 transition-colors ${
                  item.hasRead
                    ? 'text-slate-600 dark:text-slate-400 font-normal'
                    : 'text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400'
                }`}
              >
                {item.title}
              </h3>

              {/* Snippet */}
              {viewConfigs.showSnippet && item.snippet && (
                <p className="text-xs text-black/60 dark:text-white/60 line-clamp-3 leading-relaxed mb-3">
                  {item.snippet}
                </p>
              )}
            </div>

            {/* Hover Action Bar */}
            <div className="px-3 py-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-black/40 dark:text-white/40 bg-black/[0.015] dark:bg-white/[0.01]">
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => onToggleRead(item, e)}
                  title={item.hasRead ? 'Mark as Unread (m)' : 'Mark as Read (m)'}
                  className={`p-1.5 rounded-lg transition-all ${
                    item.hasRead
                      ? 'text-sky-500 hover:bg-sky-500/10'
                      : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Check size={13} className={item.hasRead ? 'stroke-[2.5]' : ''} />
                </button>
                <button
                  onClick={(e) => onToggleStar(item, e)}
                  title={item.starred ? 'Starred (s)' : 'Star (s)'}
                  className={`p-1.5 rounded-lg transition-all ${
                    item.starred
                      ? 'text-amber-500 fill-amber-500'
                      : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <Star size={13} className={item.starred ? 'fill-amber-500' : ''} />
                </button>
                <button
                  onClick={(e) => onToggleHide(item, e)}
                  title="Hide Article (h)"
                  className="p-1.5 rounded-lg hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <EyeOff size={13} />
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openExternalLink(item.link);
                }}
                title="Open in Browser (v)"
                className="p-1.5 rounded-lg hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

