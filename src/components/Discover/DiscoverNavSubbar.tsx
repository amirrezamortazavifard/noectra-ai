'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  Check,
  Tag,
} from 'lucide-react';
import { IntelligenceFeedMode } from '@/lib/services/discover/types';
import { cn } from '@/lib/utils';
import { GlassDropdown, DropdownItem } from '@/components/Discover/GlassDropdown';
import { HierarchicalSourceSelector } from '@/components/Discover/HierarchicalSourceSelector';

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

  activeSource: string;
  onSelectSource: (src: string) => void;
  sourceItems?: DropdownItem[];

  activeTopic: string;
  onResetTopic: () => void;
  itemCount: number;
}

interface ModeMeta {
  key: IntelligenceFeedMode;
  label: string;
  description: string;
  icon: React.ReactNode;
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
  activeSource,
  onSelectSource,
  sourceItems,
  activeTopic,
  onResetTopic,
  itemCount,
}) => {
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close mode dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    if (isModeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModeDropdownOpen]);

  const feedModes: ModeMeta[] = [
    {
      key: 'for_you',
      label: 'For You',
      description: 'Personalized multi-disciplinary research intelligence',
      icon: <Sparkles size={14} className="text-cyan-500" />,
    },
    {
      key: 'live_buzz',
      label: 'Live Buzz 🔥',
      description: 'Real-time multi-column trending tech & scientific radar',
      icon: <Flame size={14} className="text-orange-500 fill-orange-500/20" />,
    },
    {
      key: 'latest',
      label: 'Latest Streams',
      description: 'Chronological live feed from all 20+ verified research sources',
      icon: <Zap size={14} className="text-amber-500" />,
    },
    {
      key: 'high_signal',
      label: 'High Signal',
      description: 'Breakthrough publications, Nature/Science papers and top citations',
      icon: <Radio size={14} className="text-emerald-500" />,
    },
    {
      key: 'following',
      label: 'Following',
      description: 'Discoveries matching your explicitly followed topics and journals',
      icon: <Star size={14} className="text-yellow-500" />,
    },
    {
      key: 'research_only',
      label: 'Academic Preprints',
      description: 'Peer-reviewed articles and arXiv papers exclusively',
      icon: <BookOpen size={14} className="text-blue-500" />,
    },
  ];

  const currentModeMeta =
    feedModes.find((m) => m.key === currentMode) || {
      key: currentMode,
      label: currentMode === 'saved' ? 'Saved Bookmarks' : 'Reading Queue',
      description: 'Your personal intelligence repository',
      icon: currentMode === 'saved' ? <Bookmark size={14} className="text-rose-500" /> : <Layers size={14} className="text-violet-500" />,
    };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ------------------------------------------------------------- */}
      {/* Primary Deck: Mode Dropdown, Library Pills & Search Bar       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Left: Mode Dropdown + Library Scope Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Feed Perspective Dropdown ("از حالت افقی خارج شده و در قالب یک کشویی شیک") */}
          <div ref={modeDropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsModeDropdownOpen((prev) => !prev)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border shadow-sm cursor-pointer select-none',
                'bg-white dark:bg-[#111522]',
                isModeDropdownOpen
                  ? 'border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/10'
                  : 'border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-white/20'
              )}
            >
              <span>{currentModeMeta.icon}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {currentModeMeta.label}
              </span>
              <ChevronDown
                size={13}
                className={cn(
                  'text-slate-400 transition-transform duration-200',
                  isModeDropdownOpen && 'rotate-180 text-cyan-500'
                )}
              />
            </button>

            {/* Mode Dropdown Menu */}
            {isModeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl bg-white/95 dark:bg-[#0f1422]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/15 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2.5 py-1 block">
                  Select Feed Perspective
                </span>
                <div className="flex flex-col gap-0.5">
                  {feedModes.map((mode) => {
                    const isSelected = currentMode === mode.key;
                    return (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => {
                          onSelectMode(mode.key);
                          setIsModeDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all',
                          isSelected
                            ? 'bg-cyan-500/15 text-cyan-900 dark:text-cyan-200 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-black dark:hover:text-white'
                        )}
                      >
                        <span className="mt-0.5">{mode.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {mode.label}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                            {mode.description}
                          </span>
                        </div>
                        {isSelected && (
                          <Check size={14} className="text-cyan-500 ml-auto mt-0.5 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Library Pills: Saved & Queue */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectMode('saved')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer',
                currentMode === 'saved'
                  ? 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40 shadow-sm font-semibold'
                  : 'bg-white dark:bg-[#111522] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.05]'
              )}
            >
              <Bookmark size={13} className="text-rose-500" />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 ml-0.5 font-bold">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('queue')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer',
                currentMode === 'queue'
                  ? 'bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/40 shadow-sm font-semibold'
                  : 'bg-white dark:bg-[#111522] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.05]'
              )}
            >
              <Layers size={13} className="text-violet-500" />
              <span>Queue</span>
              {queueCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300 ml-0.5 font-bold">
                  {queueCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right: Universal Search & Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <form onSubmit={onSearchSubmit} className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search papers, preprints, authors, DOIs, or keywords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-20 py-2 rounded-xl bg-white dark:bg-[#111522] border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
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
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium transition-colors"
            >
              Search
            </button>
          </form>

          {/* Command Palette Trigger */}
          <button
            type="button"
            title="Open Command Palette (Ctrl+K)"
            onClick={onOpenCommandPalette}
            className="p-2.5 rounded-xl bg-white dark:bg-[#111522] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:border-cyan-500/40 transition-colors shadow-sm hidden sm:flex items-center gap-1.5 text-xs font-mono"
          >
            <SlidersHorizontal size={14} />
            <span className="text-[10px] text-slate-400">Ctrl+K</span>
          </button>

          {/* Refresh Feed */}
          <button
            type="button"
            title="Refresh Feed (R)"
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-white dark:bg-[#111522] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:border-cyan-500/40 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-cyan-500' : ''} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Secondary Deck: Source Combobox & Active Topic Filter Bar     */}
      {/* ------------------------------------------------------------- */}
      {currentMode !== 'live_buzz' && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
          {/* Left: Hierarchical Categorized Source Selector & Active Topic Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <HierarchicalSourceSelector
              activeSource={activeSource}
              onSelectSource={onSelectSource}
            />

            {/* Active Sub-Topic Chip */}
            {activeTopic && activeTopic !== 'all' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium">
                <Tag size={12} className="text-cyan-500" />
                <span>Field: {activeTopic.replace(/_/g, ' ')}</span>
                <button
                  type="button"
                  onClick={onResetTopic}
                  className="hover:text-cyan-900 dark:hover:text-white transition-colors ml-1"
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
              {itemCount} discoveries in stream
            </span>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverNavSubbar;
