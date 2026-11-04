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
  Flame,
  Check,
  Tag,
} from 'lucide-react';
import { IntelligenceFeedMode } from '@/lib/services/discover/types';
import { cn } from '@/lib/utils';
import { GlassDropdown, DropdownItem } from '@/components/Discover/GlassDropdown';

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

  // Combobox dropdowns & metadata
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  categoryItems: DropdownItem[];

  activeSource: string;
  onSelectSource: (src: string) => void;
  sourceItems: DropdownItem[];

  activeTopic: string;
  onResetTopic: () => void;
  itemCount: number;
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
  activeCategory,
  onSelectCategory,
  categoryItems,
  activeSource,
  onSelectSource,
  sourceItems,
  activeTopic,
  onResetTopic,
  itemCount,
}) => {
  const modes: { key: IntelligenceFeedMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'for_you', label: 'For You', icon: <Sparkles size={13} className="text-cyan-500" /> },
    { key: 'live_buzz', label: 'Live Buzz', icon: <Flame size={13} className="text-orange-500 fill-orange-500/20" /> },
    { key: 'latest', label: 'Latest', icon: <Zap size={13} className="text-amber-500" /> },
    { key: 'following', label: 'Following', icon: <Star size={13} className="text-yellow-500" /> },
    { key: 'high_signal', label: 'High Signal', icon: <Radio size={13} className="text-emerald-500" /> },
    { key: 'research_only', label: 'Research', icon: <BookOpen size={13} className="text-blue-500" /> },
    {
      key: 'saved',
      label: 'Saved',
      icon: <Bookmark size={13} className="text-rose-500" />,
      badge: savedCount,
    },
    {
      key: 'queue',
      label: 'Queue',
      icon: <Layers size={13} className="text-violet-500" />,
      badge: queueCount,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* ------------------------------------------------------------- */}
      {/* Tier 1: Mode Switcher Tabs & Universal Search Input           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
        {/* Horizontal Mode Segmented Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 overflow-x-auto scrollbar-none select-none flex-shrink-0">
          {modes.map((mode) => {
            const isActive = currentMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => onSelectMode(mode.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer',
                  isActive
                    ? 'bg-white dark:bg-[#1a2030] text-slate-900 dark:text-white shadow-sm border border-black/5 dark:border-white/15 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
                {mode.badge !== undefined && mode.badge > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-white/15 text-slate-800 dark:text-slate-200 ml-0.5">
                    {mode.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Universal Search & Quick Action Palette */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <form onSubmit={onSearchSubmit} className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search papers, DOIs, clinical topics, or keywords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-20 py-1.5 rounded-xl bg-white dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-black dark:hover:text-white"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium transition-colors"
            >
              Search
            </button>
          </form>

          {/* Command Palette Trigger */}
          <button
            type="button"
            title="Open Command Palette (Ctrl+K)"
            onClick={onOpenCommandPalette}
            className="p-2 rounded-xl bg-white dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:border-cyan-500/40 transition-colors shadow-sm hidden sm:flex items-center gap-1.5 text-xs font-mono"
          >
            <SlidersHorizontal size={14} />
            <span className="text-[10px] text-slate-400">Ctrl+K</span>
          </button>

          {/* Refresh Feed */}
          <button
            type="button"
            title="Refresh Feed (R)"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white dark:bg-[#111520] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:border-cyan-500/40 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-500' : ''} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Tier 2: Combobox Filters & Telemetry Summary                  */}
      {/* ------------------------------------------------------------- */}
      {currentMode !== 'live_buzz' && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
          {/* Left: Combobox Dropdowns & Active Topic Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <GlassDropdown
              label="All Disciplines"
              prefix="Discipline"
              icon={<Layers size={13} className="text-cyan-500" />}
              items={categoryItems}
              selectedKey={activeCategory}
              onSelect={onSelectCategory}
              widthClass="min-w-[200px]"
            />

            <GlassDropdown
              label="All Verified Feeds"
              prefix="Source"
              icon={<Radio size={13} className="text-violet-500" />}
              items={sourceItems}
              selectedKey={activeSource}
              onSelect={onSelectSource}
              widthClass="min-w-[220px]"
            />

            {/* Active Topic Filter Chip if selected */}
            {activeTopic && activeTopic !== 'all' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium">
                <Tag size={12} className="text-cyan-500" />
                <span>Topic: {activeTopic.replace(/_/g, ' ')}</span>
                <button
                  type="button"
                  onClick={onResetTopic}
                  className="hover:text-cyan-900 dark:hover:text-white transition-colors ml-0.5"
                  title="Remove topic filter"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Right: Item Count & Reset Button */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {itemCount} discoveries loaded
            </span>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverNavSubbar;
