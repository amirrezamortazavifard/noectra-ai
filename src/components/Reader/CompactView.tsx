import React from 'react';
import { Star, Check, EyeOff, ExternalLink, Rss } from 'lucide-react';
import { FeedItem, FeedSource, ViewConfigs } from '@/lib/reader/types';
import { openExternalLink } from '@/lib/openExternal';

interface CompactViewProps {
  items: FeedItem[];
  sourcesMap: Record<string, FeedSource>;
  viewConfigs: ViewConfigs;
  onSelectItem: (item: FeedItem) => void;
  onToggleRead: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleStar: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleHide: (item: FeedItem, e: React.MouseEvent) => void;
}

export default function CompactView({
  items,
  sourcesMap,
  viewConfigs,
  onSelectItem,
  onToggleRead,
  onToggleStar,
  onToggleHide,
}: CompactViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 py-20 select-none">
        <Rss size={42} className="mb-3 stroke-1 opacity-50" />
        <p className="text-sm font-medium">No articles found in compact view</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 select-none">
      <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#121722] overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {items.map((item) => {
          const source = sourcesMap[item.sourceId];
          const isFaded = viewConfigs.fadeRead && item.hasRead;

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={`group flex items-center justify-between px-4 py-2 text-xs transition-colors cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] ${
                item.hasRead ? 'text-black/60 dark:text-white/60 font-normal' : 'text-slate-900 dark:text-white font-medium'
              } ${isFaded ? 'opacity-50 hover:opacity-100' : ''}`}
            >
              {/* Left: Read dot + Favicon + Source name + Title */}
              <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                {/* Read status dot */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    item.hasRead
                      ? 'bg-transparent border border-black/20 dark:border-white/20'
                      : 'bg-sky-500'
                  }`}
                />

                {/* Source Icon & Name */}
                <div className="flex items-center space-x-1.5 w-32 shrink-0 truncate text-black/50 dark:text-white/50 text-[11px]">
                  {source?.iconUrl ? (
                    <img
                      src={source.iconUrl}
                      alt=""
                      className="w-3.5 h-3.5 rounded object-contain shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Rss size={11} className="text-orange-500 shrink-0" />
                  )}
                  <span className="truncate">{source?.name || 'RSS'}</span>
                </div>

                {/* Article Title */}
                <span className="truncate flex-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {item.title}
                </span>
              </div>

              {/* Right: Date & Quick Actions on hover */}
              <div className="flex items-center space-x-3 shrink-0">
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                  <button
                    onClick={(e) => onToggleRead(item, e)}
                    title={item.hasRead ? 'Mark as Unread (m)' : 'Mark as Read (m)'}
                    className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                      item.hasRead ? 'text-sky-500' : 'text-black/50 dark:text-white/50'
                    }`}
                  >
                    <Check size={12} className={item.hasRead ? 'stroke-[2.5]' : ''} />
                  </button>
                  <button
                    onClick={(e) => onToggleStar(item, e)}
                    title={item.starred ? 'Starred (s)' : 'Star (s)'}
                    className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                      item.starred ? 'text-amber-500 fill-amber-500' : 'text-black/50 dark:text-white/50'
                    }`}
                  >
                    <Star size={12} className={item.starred ? 'fill-amber-500' : ''} />
                  </button>
                  <button
                    onClick={(e) => onToggleHide(item, e)}
                    title="Hide (h)"
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50"
                  >
                    <EyeOff size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openExternalLink(item.link);
                    }}
                    title="Open in Browser (v)"
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50"
                  >
                    <ExternalLink size={12} />
                  </button>
                </div>

                <span className="text-[11px] text-black/40 dark:text-white/40 w-16 text-right">
                  {new Date(item.pubDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

