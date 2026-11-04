'use client';

import React from 'react';
import {
  Sparkles,
  Zap,
  Star,
  Radio,
  BookOpen,
  Bookmark,
  Layers,
  Search,
  X,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { IntelligenceFeedMode } from '@/lib/services/discover/types';
import { cn } from '@/lib/utils';

interface DiscoverNavSubbarProps {
  currentMode: IntelligenceFeedMode;
  onSelectMode: (mode: IntelligenceFeedMode) => void;
  savedCount: number;
  queueCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenCommandPalette: () => void;
  activeFilterCount: number;
  onResetFilters: () => void;
}

export const DiscoverNavSubbar: React.FC<DiscoverNavSubbarProps> = ({
  currentMode,
  onSelectMode,
  savedCount,
  queueCount,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onRefresh,
  isLoading,
  onOpenCommandPalette,
  activeFilterCount,
  onResetFilters,
}) => {
  const modes: { key: IntelligenceFeedMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'for_you', label: 'For You', icon: <Sparkles size={14} className="text-cyan-500" /> },
    { key: 'latest', label: 'Latest', icon: <Zap size={14} className="text-amber-500" /> },
    { key: 'following', label: 'Following', icon: <Star size={14} className="text-yellow-500" /> },
    { key: 'high_signal', label: 'High Signal', icon: <Radio size={14} className="text-emerald-500" /> },
    { key: 'research_only', label: 'Research Only', icon: <BookOpen size={14} className="text-blue-500" /> },
    {
      key: 'saved',
      label: 'Saved',
      icon: <Bookmark size={14} className="text-rose-500" />,
      badge: savedCount,
    },
    {
      key: 'queue',
      label: 'Queue',
      icon: <Layers size={14} className="text-violet-500" />,
      badge: queueCount,
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Controls: Mode Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Horizontal Mode Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 overflow-x-auto scrollbar-none select-none">
          {modes.map((mode) => {
            const isActive = currentMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => onSelectMode(mode.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95',
                  isActive
                    ? 'bg-white dark:bg-[#1a2030] text-slate-900 dark:text-white shadow-sm border border-black/5 dark:border-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
                {mode.badge !== undefined && mode.badge > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 ml-0.5">
                    {mode.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Universal Search & Quick Action Palette */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <form onSubmit={onSearchSubmit} className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search papers, DOIs, clinical topics, or keywords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-24 py-2 rounded-2xl bg-white dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition-colors"
            >
              Search
            </button>
          </form>

          {/* Command Palette Trigger */}
          <button
            type="button"
            title="Open Command Palette (Ctrl+K)"
            onClick={onOpenCommandPalette}
            className="p-2 rounded-2xl bg-white dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:border-cyan-500/40 transition-colors shadow-sm hidden sm:flex items-center gap-1.5 text-xs font-mono"
          >
            <SlidersHorizontal size={15} />
            <span className="text-[10px] text-slate-400">Ctrl+K</span>
          </button>

          {/* Refresh Feed */}
          <button
            type="button"
            title="Refresh Feed (R)"
            onClick={onRefresh}
            className="p-2 rounded-2xl bg-white dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:border-cyan-500/40 transition-colors shadow-sm"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              title="Reset all filters"
              onClick={onResetFilters}
              className="p-2 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors shadow-sm text-xs flex items-center gap-1 font-medium"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscoverNavSubbar;

