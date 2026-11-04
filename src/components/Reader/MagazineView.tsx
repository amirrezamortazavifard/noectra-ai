import React from 'react';
import { Star, Check, EyeOff, ExternalLink, Rss } from 'lucide-react';
import { FeedItem, FeedSource, ViewConfigs } from '@/lib/reader/types';
import { openExternalLink } from '@/lib/openExternal';

interface MagazineViewProps {
  items: FeedItem[];
  sourcesMap: Record<string, FeedSource>;
  viewConfigs: ViewConfigs;
  onSelectItem: (item: FeedItem) => void;
  onToggleRead: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleStar: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleHide: (item: FeedItem, e: React.MouseEvent) => void;
}

export default function MagazineView({
  items,
  sourcesMap,
  viewConfigs,
  onSelectItem,
  onToggleRead,
  onToggleStar,
  onToggleHide,
}: MagazineViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 py-20 select-none">
        <Rss size={42} className="mb-3 stroke-1 opacity-50" />
        <p className="text-sm font-medium">No articles found in magazine view</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      {items.map((item) => {
        const source = sourcesMap[item.sourceId];
        const isFaded = viewConfigs.fadeRead && item.hasRead;

        return (
          <div
            key={item.id}
            onClick={() => onSelectItem(item)}
            className={`group relative flex flex-col md:flex-row items-stretch rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
              item.hasRead
                ? 'bg-white/40 dark:bg-[#10141d]/40 border-black/[0.04] dark:border-white/[0.04]'
                : 'bg-white dark:bg-[#121722] border-black/[0.08] dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-black/20 dark:hover:border-white/20'
            } ${isFaded ? 'opacity-50 hover:opacity-100' : ''}`}
          >
            {/* Optional Cover Thumbnail */}
            {viewConfigs.showCover && item.thumbUrl && (
              <div className="relative md:w-64 h-48 md:h-auto shrink-0 bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
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

            {/* Article Info */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                {/* Source & Date */}
                <div className="flex items-center space-x-2 text-xs text-black/50 dark:text-white/50 mb-2">
                  <div className="flex items-center space-x-1.5 font-medium">
                    {source?.iconUrl ? (
                      <img
                        src={source.iconUrl}
                        alt=""
                        className="w-4 h-4 rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Rss size={13} className="text-orange-500" />
                    )}
                    <span>{source?.name || 'RSS'}</span>
                  </div>
                  <span>•</span>
                  {item.author && (
                    <>
                      <span className="truncate max-w-[150px]">{item.author}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>
                    {new Date(item.pubDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className={`text-base font-semibold leading-snug line-clamp-2 mb-2 transition-colors ${
                    item.hasRead
                      ? 'text-slate-600 dark:text-slate-400 font-normal'
                      : 'text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400'
                  }`}
                >
                  {item.title}
                </h3>

                {/* Snippet */}
                {viewConfigs.showSnippet && item.snippet && (
                  <p className="text-xs text-black/65 dark:text-white/65 line-clamp-3 leading-relaxed">
                    {item.snippet}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 mt-3 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-black/40 dark:text-white/40">
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
                    <Check size={14} className={item.hasRead ? 'stroke-[2.5]' : ''} />
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
                    <Star size={14} className={item.starred ? 'fill-amber-500' : ''} />
                  </button>
                  <button
                    onClick={(e) => onToggleHide(item, e)}
                    title="Hide Article (h)"
                    className="p-1.5 rounded-lg hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <EyeOff size={14} />
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
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

