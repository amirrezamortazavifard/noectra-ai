import React, { useState, useRef, useCallback } from 'react';
import { Rss, Star, Check, EyeOff } from 'lucide-react';
import { FeedItem, FeedSource, ViewConfigs } from '@/lib/reader/types';
import ArticleViewer from './ArticleViewer';

interface SplitListViewProps {
  items: FeedItem[];
  sourcesMap: Record<string, FeedSource>;
  viewConfigs: ViewConfigs;
  selectedItem: FeedItem | null;
  onSelectItem: (item: FeedItem) => void;
  onToggleRead: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleStar: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleHide: (item: FeedItem, e: React.MouseEvent) => void;
  onPrev?: () => void;
  onNext?: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
}

export default function SplitListView({
  items,
  sourcesMap,
  viewConfigs,
  selectedItem,
  onSelectItem,
  onToggleRead,
  onToggleStar,
  onToggleHide,
  onPrev,
  onNext,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
}: SplitListViewProps) {
  const [listWidth, setListWidth] = useState(380);
  const isDragging = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = listWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.max(280, Math.min(650, startWidth + (moveEvent.clientX - startX)));
      setListWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [listWidth]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Column: Article List */}
      <div
        style={{ width: `${listWidth}px` }}
        className="h-full flex flex-col border-r border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.01] overflow-y-auto select-none divide-y divide-black/[0.04] dark:divide-white/[0.04] shrink-0"
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 p-6">
            <Rss size={36} className="mb-2 stroke-1 opacity-50" />
            <p className="text-xs font-medium">No articles in this feed</p>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            const source = sourcesMap[item.sourceId];
            const isFaded = viewConfigs.fadeRead && item.hasRead;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group relative p-3.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/10 dark:bg-sky-500/15 border-l-4 border-l-sky-500'
                    : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                } ${isFaded ? 'opacity-50 hover:opacity-100' : ''}`}
              >
                {/* Meta Row: Favicon + Source Name + Date */}
                <div className="flex items-center justify-between text-[11px] text-black/50 dark:text-white/50 mb-1.5">
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
                <h4
                  className={`text-xs font-semibold leading-snug line-clamp-2 mb-1 transition-colors ${
                    item.hasRead
                      ? 'text-slate-600 dark:text-slate-400 font-normal'
                      : 'text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400'
                  }`}
                >
                  {item.title}
                </h4>

                {/* Optional Snippet */}
                {viewConfigs.showSnippet && item.snippet && (
                  <p className="text-[11px] text-black/55 dark:text-white/55 line-clamp-2 leading-relaxed mb-2">
                    {item.snippet}
                  </p>
                )}

                {/* Quick actions on hover */}
                <div className="flex items-center justify-between pt-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.hasRead ? 'bg-transparent' : 'bg-sky-500'
                    }`}
                  />
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                    <button
                      onClick={(e) => onToggleRead(item, e)}
                      title={item.hasRead ? 'Mark as Unread' : 'Mark as Read'}
                      className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                        item.hasRead ? 'text-sky-500' : 'text-black/40 dark:text-white/40'
                      }`}
                    >
                      <Check size={12} className={item.hasRead ? 'stroke-[2.5]' : ''} />
                    </button>
                    <button
                      onClick={(e) => onToggleStar(item, e)}
                      title={item.starred ? 'Starred' : 'Star'}
                      className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                        item.starred ? 'text-amber-500 fill-amber-500' : 'text-black/40 dark:text-white/40'
                      }`}
                    >
                      <Star size={12} className={item.starred ? 'fill-amber-500' : ''} />
                    </button>
                    <button
                      onClick={(e) => onToggleHide(item, e)}
                      title="Hide"
                      className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-black/40 dark:text-white/40"
                    >
                      <EyeOff size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resizable Divider Handle */}
      <div
        onMouseDown={startResize}
        className="w-1.5 h-full cursor-col-resize hover:bg-sky-500/40 active:bg-sky-500 transition-colors select-none shrink-0"
      />

      {/* Right Column: Article Viewer */}
      <div className="flex-1 h-full overflow-hidden bg-white dark:bg-[#0c1017]">
        {selectedItem ? (
          <ArticleViewer
            item={selectedItem}
            source={sourcesMap[selectedItem.sourceId]}
            onClose={() => onSelectItem(null!)}
            onPrev={onPrev}
            onNext={onNext}
            onToggleRead={(it) => onToggleRead(it, null as any)}
            onToggleStar={(it) => onToggleStar(it, null as any)}
            onToggleHide={(it) => onToggleHide(it, null as any)}
            fontSize={fontSize}
            onFontSizeChange={onFontSizeChange}
            fontFamily={fontFamily}
            onFontFamilyChange={onFontFamilyChange}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 p-10 select-none">
            <Rss size={48} className="mb-3 stroke-1 opacity-40" />
            <p className="text-sm font-medium">Select an article from the list to read</p>
          </div>
        )}
      </div>
    </div>
  );
}

