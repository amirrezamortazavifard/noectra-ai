import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  X,
  GripVertical,
  ExternalLink,
  Bookmark,
  Share2,
  BookOpen,
  Github,
  Flame,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react';
import { LiveBuzzItem, LiveBuzzSourceMeta, fetchLiveBuzzStream } from '@/lib/services/discover/liveBuzzApi';
import { openExternalLink } from '@/lib/openExternal';
import { toast } from 'sonner';

interface LiveBuzzColumnCardProps {
  source: LiveBuzzSourceMeta;
  onRemoveColumn: (id: string) => void;
  onOpenArticleReader?: (title: string, url: string, snippet?: string) => void;
  onSaveItem?: (item: LiveBuzzItem, sourceName: string) => void;
  // Drag and Drop props
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const LiveBuzzColumnCard: React.FC<LiveBuzzColumnCardProps> = ({
  source,
  onRemoveColumn,
  onOpenArticleReader,
  onSaveItem,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [items, setItems] = useState<LiveBuzzItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (force = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchLiveBuzzStream(source.id, force);
      setItems(data);
    } catch {
      toast.error(`Could not refresh ${source.name}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [source.id]);

  const renderSourceIcon = () => {
    switch (source.id) {
      case 'github':
        return <Github size={16} className="text-white bg-black dark:bg-white/20 p-0.5 rounded-md" />;
      case 'hackernews':
        return <span className="w-4 h-4 rounded bg-[#ff6600] text-white font-bold flex items-center justify-center text-[10px]">Y</span>;
      case 'producthunt':
        return <span className="w-4 h-4 rounded-full bg-[#da552f] text-white font-bold flex items-center justify-center text-[10px]">P</span>;
      case 'huggingface':
        return <span className="text-base leading-none">🤗</span>;
      case 'arxiv':
        return <span className="text-[10px] font-serif font-black text-rose-500">χ</span>;
      case 'techcrunch':
        return <span className="w-4 h-4 rounded bg-[#00a562] text-white font-bold flex items-center justify-center text-[9px]">TC</span>;
      default:
        return <Radio size={15} className="text-sky-500" />;
    }
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30';
    if (rank === 2) return 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold';
    if (rank === 3) return 'bg-amber-800/20 text-amber-700 dark:text-amber-500 font-bold';
    return 'bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex flex-col w-[360px] min-w-[340px] max-w-[380px] h-[calc(100vh-210px)] rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#0f141d]/80 backdrop-blur-xl shadow-lg transition-all select-none overflow-hidden ${
        isDragging ? 'opacity-40 scale-95 border-sky-500 border-dashed' : 'hover:border-black/20 dark:hover:border-white/20'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
        <div className="flex items-center space-x-2.5 truncate">
          <div className="cursor-grab active:cursor-grabbing text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white">
            <GripVertical size={14} />
          </div>
          {renderSourceIcon()}
          <div className="truncate">
            <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center space-x-1.5">
              <span>{source.name}</span>
              <span className="text-[9px] font-normal uppercase px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.06] text-black/60 dark:text-white/60">
                {source.category}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            title="Refresh Column"
            className="p-1 rounded-lg text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
          </button>
          <button
            onClick={() => onRemoveColumn(source.id)}
            title="Remove Column from Dashboard"
            className="p-1 rounded-lg text-black/40 dark:text-white/40 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Column Stream Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.04] p-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 py-20 space-y-2">
            <RefreshCw size={24} className="animate-spin text-sky-500 opacity-80" />
            <span className="text-xs">Streaming real-time trends...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-black/40 dark:text-white/40 py-20">
            <Zap size={28} className="mb-2 stroke-1 opacity-40" />
            <span className="text-xs">No live stories available right now</span>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group relative p-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors rounded-2xl flex flex-col justify-between"
            >
              <div className="flex items-start space-x-2.5">
                {/* Ranking Badge */}
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] shrink-0 mt-0.5 ${getRankBadgeClass(
                    item.rank
                  )}`}
                >
                  {item.rank}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <a
                    href={item.url}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onOpenArticleReader) {
                        onOpenArticleReader(item.title, item.url, item.snippet || undefined);
                      } else {
                        openExternalLink(item.url);
                      }
                    }}
                    className="font-semibold text-xs leading-snug text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 line-clamp-2 transition-colors cursor-pointer"
                  >
                    {item.title}
                  </a>

                  {item.snippet && (
                    <p className="text-[11px] text-black/55 dark:text-white/55 line-clamp-2 mt-1 leading-relaxed">
                      {item.snippet}
                    </p>
                  )}

                  {/* Extra Meta (Points / Stars / Launches) */}
                  <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-black/50 dark:text-white/50">
                    {item.extraInfo && (
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.extraInfo}
                      </span>
                    )}
                    {item.author && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[100px]">{item.author}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions (Hover) */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end space-x-1 pt-1.5 transition-opacity">
                {onOpenArticleReader && (
                  <button
                    onClick={() =>
                      onOpenArticleReader(item.title, item.url, item.snippet || undefined)
                    }
                    title="Read Article Inside App"
                    className="p-1 rounded text-black/50 dark:text-white/50 hover:text-sky-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <BookOpen size={12} />
                  </button>
                )}
                {onSaveItem && (
                  <button
                    onClick={() => onSaveItem(item, source.name)}
                    title="Bookmark to Reading Queue"
                    className="p-1 rounded text-black/50 dark:text-white/50 hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  >
                    <Bookmark size={12} />
                  </button>
                )}
                <button
                  onClick={() => openExternalLink(item.url)}
                  title="Open in Browser"
                  className="p-1 rounded text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

