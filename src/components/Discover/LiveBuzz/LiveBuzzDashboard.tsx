import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import {
  LiveBuzzItem,
  LiveBuzzSourceMeta,
  fetchLiveBuzzSources,
} from '@/lib/services/discover/liveBuzzApi';
import { LiveBuzzColumnCard } from './LiveBuzzColumnCard';
import { LiveBuzzCustomizeModal } from './LiveBuzzCustomizeModal';
import { toast } from 'sonner';

interface LiveBuzzDashboardProps {
  onOpenArticleReader?: (title: string, url: string, snippet?: string) => void;
  onSaveItem?: (item: LiveBuzzItem, sourceName: string) => void;
}

const DEFAULT_ACTIVE_COLUMNS = ['github', 'hackernews', 'producthunt', 'huggingface'];

export const LiveBuzzDashboard: React.FC<LiveBuzzDashboardProps> = ({
  onOpenArticleReader,
  onSaveItem,
}) => {
  const [availableSources, setAvailableSources] = useState<LiveBuzzSourceMeta[]>([]);
  const [activeColumnIds, setActiveColumnIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('noectra_live_buzz_columns');
    return saved ? JSON.parse(saved) : DEFAULT_ACTIVE_COLUMNS;
  });
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveBuzzSources().then(setAvailableSources).catch(() => {});
  }, []);

  const saveColumns = (newIds: string[]) => {
    setActiveColumnIds(newIds);
    localStorage.setItem('noectra_live_buzz_columns', JSON.stringify(newIds));
  };

  const handleToggleColumn = (id: string) => {
    if (activeColumnIds.includes(id)) {
      if (activeColumnIds.length <= 1) {
        toast.error('You must keep at least one column visible');
        return;
      }
      saveColumns(activeColumnIds.filter((c) => c !== id));
    } else {
      saveColumns([...activeColumnIds, id]);
    }
  };

  const handleRemoveColumn = (id: string) => {
    if (activeColumnIds.length <= 1) {
      toast.error('You must keep at least one column visible');
      return;
    }
    saveColumns(activeColumnIds.filter((c) => c !== id));
  };

  const handleResetDefault = () => {
    saveColumns(DEFAULT_ACTIVE_COLUMNS);
    toast.success('Reset columns to default layout');
  };

  // Drag & Drop Handlers
  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedColumnId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedColumnId || draggedColumnId === targetId) return;

    const fromIndex = activeColumnIds.indexOf(draggedColumnId);
    const toIndex = activeColumnIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const updated = [...activeColumnIds];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    saveColumns(updated);
    setDraggedColumnId(null);
  };

  // Map active columns to metadata
  const activeSources = activeColumnIds
    .map((id) => availableSources.find((s) => s.id === id))
    .filter(Boolean) as LiveBuzzSourceMeta[];

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden">
      {/* Sub-header Toolbar */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.01]">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-xs">
            <Flame size={14} className="fill-orange-500 animate-pulse" />
            <span>Real-Time Trending Radar</span>
          </div>
          <span className="text-[11px] text-black/50 dark:text-white/50 hidden sm:inline">
            Drag columns to reorder • Auto-updated with adaptive smart caching
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <SlidersHorizontal size={13} />
            <span>Customize Columns ({activeColumnIds.length})</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Column Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex items-start space-x-5 h-full min-w-max pb-2">
          {activeSources.map((source) => (
            <LiveBuzzColumnCard
              key={source.id}
              source={source}
              onRemoveColumn={handleRemoveColumn}
              onOpenArticleReader={onOpenArticleReader}
              onSaveItem={onSaveItem}
              isDragging={draggedColumnId === source.id}
              onDragStart={(e) => handleDragStart(source.id, e)}
              onDragOver={(e) => handleDragOver(source.id, e)}
              onDrop={(e) => handleDrop(source.id, e)}
            />
          ))}

          {/* Quick Add Column placeholder */}
          <button
            onClick={() => setIsCustomizeOpen(true)}
            className="flex flex-col items-center justify-center w-72 h-[calc(100vh-210px)] rounded-3xl border-2 border-dashed border-black/10 dark:border-white/10 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all text-black/40 dark:text-white/40 hover:text-sky-500 p-6 space-y-2 group cursor-pointer"
          >
            <div className="p-3 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] group-hover:bg-sky-500/10 transition-colors">
              <Plus size={22} className="group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-semibold text-xs">Add More Columns</span>
            <span className="text-[10px] text-center opacity-70">
              Pin GitHub, Hacker News, Product Hunt, Hugging Face, ArXiv or TechCrunch
            </span>
          </button>
        </div>
      </div>

      {/* Customization Modal */}
      <LiveBuzzCustomizeModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        availableSources={availableSources}
        activeColumnIds={activeColumnIds}
        onToggleColumn={handleToggleColumn}
        onResetDefault={handleResetDefault}
      />
    </div>
  );
};

