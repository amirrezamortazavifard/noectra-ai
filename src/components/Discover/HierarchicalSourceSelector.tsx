'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Radio,
  ChevronDown,
  Search,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  SOURCE_HIERARCHY_CATEGORIES,
  SourceCategoryGroup,
  SourceSubGroup,
  SourceItem,
  findSourceById,
  getAllHierarchicalSources,
} from '@/lib/services/discover/sourcesHierarchy';
import { cn } from '@/lib/utils';

interface HierarchicalSourceSelectorProps {
  activeSource: string;
  onSelectSource: (sourceId: string) => void;
  className?: string;
}

export const HierarchicalSourceSelector: React.FC<HierarchicalSourceSelectorProps> = ({
  activeSource,
  onSelectSource,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    SOURCE_HIERARCHY_CATEGORIES[0].id
  );
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedSource = useMemo(() => findSourceById(activeSource), [activeSource]);
  const allSources = useMemo(() => getAllHierarchicalSources(), []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter sources if search query is entered
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return allSources.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.subgroupName.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q) ||
        s.typeLabel.toLowerCase().includes(q)
    );
  }, [searchQuery, allSources]);

  const activeCategory = useMemo(
    () =>
      SOURCE_HIERARCHY_CATEGORIES.find((c) => c.id === selectedCategoryId) ||
      SOURCE_HIERARCHY_CATEGORIES[0],
    [selectedCategoryId]
  );

  const handleSelect = (sourceId: string) => {
    onSelectSource(sourceId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getBadgeStyle = (type: SourceItem['type']) => {
    switch (type) {
      case 'academic':
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20';
      case 'journal':
        return 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20';
      case 'clinical':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      case 'social':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'tech':
      default:
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20';
    }
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-xs', className)}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 shadow-sm border select-none',
            'bg-white dark:bg-[#111522] hover:bg-slate-50 dark:hover:bg-white/[0.06]',
            'backdrop-blur-md',
            isOpen
              ? 'border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-cyan-500/10 ring-2 ring-cyan-500/20'
              : 'border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
          )}
        >
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Radio size={13} className="text-violet-500" />
            <span className="font-semibold text-slate-400 dark:text-slate-500">Source:</span>
          </span>

          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[220px]">
            {selectedSource ? (
              <span className="flex items-center gap-1.5">
                <span>{selectedSource.icon}</span>
                <span className="truncate">{selectedSource.name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span>🌐</span>
                <span>All Verified Feeds (25+ Streams)</span>
              </span>
            )}
          </span>

          <ChevronDown
            size={13}
            className={cn('text-slate-400 transition-transform duration-200', isOpen && 'rotate-180 text-cyan-500')}
          />
        </button>

        {/* Quick Reset if specific source is chosen */}
        {activeSource !== 'all' && (
          <button
            type="button"
            onClick={() => onSelectSource('all')}
            title="Reset to All Sources"
            className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Hierarchical Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[92vw] sm:w-[680px] md:w-[780px] max-w-[820px] rounded-3xl bg-white/95 dark:bg-[#0c101a]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.12] shadow-[0_20px_70px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Top Search & Filter Bar */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                autoFocus
                placeholder="Search 25+ verified sources, preprints, journals, subreddits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* All Sources Master Option */}
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0',
                activeSource === 'all'
                  ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm'
                  : 'bg-white dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:border-cyan-500/50'
              )}
            >
              <span>🌐</span>
              <span>All Sources</span>
              {activeSource === 'all' && <Check size={12} />}
            </button>
          </div>

          {/* Main Hierarchical Body: Two-Column Categorized Browser */}
          {searchResults ? (
            /* Search Results View */
            <div className="p-4 max-h-[460px] overflow-y-auto space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span>Search results ({searchResults.length} matches)</span>
                {searchResults.length === 0 && <span>No sources found</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {searchResults.map((source) => {
                  const isSelected = activeSource === source.id;
                  return (
                    <div
                      key={source.id}
                      onClick={() => handleSelect(source.id)}
                      className={cn(
                        'flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer group',
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                          : 'bg-white/80 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.06] hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-white/[0.06]'
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                            <span>{source.icon}</span>
                            <span className="truncate">{source.name}</span>
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0',
                              getBadgeStyle(source.type)
                            )}
                          >
                            {source.typeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {source.description}
                        </p>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {source.categoryName} • {source.subgroupName}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400">
                            <Check size={12} />
                            <span>Selected</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Hierarchical Category & Subgroup View */
            <div className="flex flex-col sm:flex-row h-[480px]">
              {/* Left Pane: Categories List */}
              <div className="w-full sm:w-56 border-b sm:border-b-0 sm:border-r border-slate-200/80 dark:border-white/[0.08] p-2 space-y-1 bg-slate-50/50 dark:bg-white/[0.01] shrink-0 overflow-y-auto">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Disciplines & Types
                </div>

                {SOURCE_HIERARCHY_CATEGORIES.map((category) => {
                  const isCatActive = selectedCategoryId === category.id;
                  const totalSources = category.subgroups.reduce(
                    (acc, s) => acc + s.sources.length,
                    0
                  );
                  const hasSelectedSourceInside = category.subgroups.some((sg) =>
                    sg.sources.some((s) => s.id === activeSource)
                  );

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all',
                        isCatActive
                          ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 font-semibold shadow-sm border border-cyan-500/25'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base">{category.icon}</span>
                        <div className="truncate">
                          <div className="text-xs truncate">{category.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                            {category.badge}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {hasSelectedSourceInside && (
                          <span className="w-2 h-2 rounded-full bg-cyan-500" />
                        )}
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 font-medium">
                          {totalSources}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Pane: Subgroups & Source Cards */}
              <div className="flex-1 p-4 overflow-y-auto space-y-5 bg-white/50 dark:bg-transparent">
                {/* Category Header */}
                <div className="border-b border-slate-200/60 dark:border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeCategory.icon}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {activeCategory.name}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                      {activeCategory.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeCategory.description}
                  </p>
                </div>

                {/* Subgroups Loop */}
                {activeCategory.subgroups.map((subgroup) => (
                  <div key={subgroup.id} className="space-y-2.5">
                    {/* Subgroup Title Bar */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>{subgroup.icon}</span>
                        <span>{subgroup.name}</span>
                      </div>
                      {subgroup.description && (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          {subgroup.description}
                        </span>
                      )}
                    </div>

                    {/* Sources Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {subgroup.sources.map((source) => {
                        const isSelected = activeSource === source.id;

                        return (
                          <div
                            key={source.id}
                            onClick={() => handleSelect(source.id)}
                            className={cn(
                              'group relative flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer',
                              isSelected
                                ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30 shadow-sm'
                                : 'bg-white dark:bg-[#111522]/90 border-slate-200/80 dark:border-white/[0.06] hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-white/[0.06]'
                            )}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                                  <span>{source.icon}</span>
                                  <span className="truncate">{source.name}</span>
                                </span>

                                <span
                                  className={cn(
                                    'text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0',
                                    getBadgeStyle(source.type)
                                  )}
                                >
                                  {source.typeLabel}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {source.description}
                              </p>
                            </div>

                            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px]">
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Verified Live Feed</span>
                              </span>

                              {isSelected ? (
                                <span className="flex items-center gap-1 font-bold text-cyan-600 dark:text-cyan-400">
                                  <Check size={12} />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100 text-cyan-500 flex items-center gap-0.5 transition-opacity font-medium">
                                  <span>Select</span>
                                  <ArrowRight size={10} />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Summary Bar */}
          <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-cyan-500" />
              <span>Categorized Multi-Disciplinary Knowledge Mesh • 25+ Global Streams</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchicalSourceSelector;
