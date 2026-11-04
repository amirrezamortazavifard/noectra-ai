'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UNIVERSAL_DISCIPLINES,
  UniversalDiscipline,
  DisciplineSubTopic,
} from '@/lib/services/discover/taxonomy';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Sparkles,
  BookOpen,
  Layers,
  Check,
  Flame,
} from 'lucide-react';

interface UniversalKnowledgeNavigatorProps {
  activeCategory: string;
  onSelectCategory: (categoryId: string) => void;
  activeTopic: string;
  onSelectTopic: (topicId: string) => void;
  onResetAll: () => void;
}

export const UniversalKnowledgeNavigator: React.FC<UniversalKnowledgeNavigatorProps> = ({
  activeCategory,
  onSelectCategory,
  activeTopic,
  onSelectTopic,
  onResetAll,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>(
    activeCategory !== 'all' ? activeCategory : 'medicine'
  );
  const [filterQuery, setFilterQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Keep selected discipline synced when activeCategory changes
  useEffect(() => {
    if (activeCategory !== 'all') {
      setSelectedDisciplineId(activeCategory);
    }
  }, [activeCategory]);

  // Find active items for label display
  const currentDiscipline = useMemo(() => {
    return UNIVERSAL_DISCIPLINES.find((d) => d.id === activeCategory);
  }, [activeCategory]);

  const currentTopic = useMemo(() => {
    if (activeTopic === 'all') return null;
    for (const d of UNIVERSAL_DISCIPLINES) {
      const found = d.topics.find((t) => t.id === activeTopic);
      if (found) return found;
    }
    return null;
  }, [activeTopic]);

  // Selected discipline for the drawer view
  const activeDrawerDiscipline = useMemo(() => {
    return (
      UNIVERSAL_DISCIPLINES.find((d) => d.id === selectedDisciplineId) ||
      UNIVERSAL_DISCIPLINES[0]
    );
  }, [selectedDisciplineId]);

  // Filtered topics when user types inside the search box
  const searchResults = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return null;

    const results: { discipline: UniversalDiscipline; topic: DisciplineSubTopic }[] = [];
    for (const disc of UNIVERSAL_DISCIPLINES) {
      for (const top of disc.topics) {
        if (
          top.name.toLowerCase().includes(q) ||
          top.description.toLowerCase().includes(q) ||
          top.keywords.some((k) => k.toLowerCase().includes(q)) ||
          disc.name.toLowerCase().includes(q)
        ) {
          results.push({ discipline: disc, topic: top });
        }
      }
    }
    return results;
  }, [filterQuery]);

  const handleSelectDiscipline = (discId: string) => {
    setSelectedDisciplineId(discId);
    if (discId === 'all') {
      onSelectCategory('all');
      onSelectTopic('all');
      setIsOpen(false);
    } else {
      onSelectCategory(discId);
      // Keep topic open or set to all
      onSelectTopic('all');
    }
  };

  const handleSelectTopicItem = (topicId: string, discId: string) => {
    onSelectCategory(discId);
    onSelectTopic(topicId);
    setIsOpen(false);
    setFilterQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full z-30 select-none">
      {/* ------------------------------------------------------------- */}
      {/* Collapsed Bar: Interactive Knowledge Selector Trigger         */}
      {/* ------------------------------------------------------------- */}
      <div
        className={cn(
          'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl transition-all duration-200 border shadow-sm',
          'bg-white dark:bg-[#111522]',
          isOpen
            ? 'border-cyan-500/50 shadow-cyan-500/10'
            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
        )}
      >
        {/* Left: Current Selection Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-3 text-left flex-1 min-w-0 group cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/15 to-blue-500/15 dark:from-cyan-500/20 dark:to-blue-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center flex-shrink-0 border border-cyan-500/30 group-hover:scale-105 transition-transform">
            <span className="text-lg">
              {currentTopic?.icon || currentDiscipline?.icon || '🌐'}
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Active Knowledge Domain
              </span>
              <span>•</span>
              <span className="truncate">
                {currentDiscipline ? currentDiscipline.name : 'All Universal Disciplines'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {currentTopic ? currentTopic.name : 'All Specializations & Streams'}
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  'text-slate-400 transition-transform duration-200',
                  isOpen && 'rotate-180 text-cyan-500'
                )}
              />
            </div>
          </div>
        </button>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Quick Clear / Reset if filtered */}
          {(activeCategory !== 'all' || activeTopic !== 'all') && (
            <button
              type="button"
              onClick={onResetAll}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium flex items-center gap-1 transition-colors"
              title="Reset to All Disciplines"
            >
              <X size={13} />
              <span className="hidden md:inline">Reset Domain</span>
            </button>
          )}

          {/* Toggle Drawer Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm',
              isOpen
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-800 dark:text-white border border-slate-200/80 dark:border-white/10'
            )}
          >
            <Layers size={13} />
            <span>{isOpen ? 'Close Catalog' : 'Browse Disciplines'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Expanded Slide-Down Mega Drawer ("حالت کشویی")                  */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white/95 dark:bg-[#0f1422]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/15 shadow-2xl p-4 overflow-hidden z-40 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Instant Filter Input inside Drawer */}
          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search across all disciplines (e.g. Dentistry, Orthodontics, Astrophysics, CRISPR, Nanomaterials, Surgery)..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              autoFocus
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* If Search is Active: Show Global Results */}
          {searchResults ? (
            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
              <div className="text-[11px] font-mono text-slate-400 pb-1">
                Found {searchResults.length} matching sub-categories:
              </div>
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No disciplines or sub-topics match &ldquo;{filterQuery}&rdquo;. Try another term.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {searchResults.map(({ discipline, topic }) => {
                    const isSelected = activeTopic === topic.id;
                    return (
                      <button
                        key={`${discipline.id}_${topic.id}`}
                        type="button"
                        onClick={() => handleSelectTopicItem(topic.id, discipline.id)}
                        className={cn(
                          'flex items-start gap-2.5 p-2.5 rounded-xl text-left border transition-all duration-150',
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-900 dark:text-cyan-200'
                            : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/5 hover:border-cyan-500/30 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                        )}
                      >
                        <span className="text-xl flex-shrink-0 mt-0.5">{topic.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {topic.name}
                            </span>
                            {topic.isHot && (
                              <Flame size={12} className="text-orange-500 fill-orange-500/20" />
                            )}
                          </div>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                            {discipline.name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {topic.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Standard Dual-Tier Knowledge Catalog */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-h-[460px]">
              {/* Left Column: Major Disciplines (Columns 1-4) */}
              <div className="lg:col-span-4 flex flex-col gap-1 overflow-y-auto pr-1 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/10 pb-3 lg:pb-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 pb-1">
                  Primary Knowledge Domains
                </span>

                {/* All Disciplines Master Button */}
                <button
                  type="button"
                  onClick={() => handleSelectDiscipline('all')}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-left transition-all',
                    activeCategory === 'all'
                      ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌐</span>
                    <span>All Disciplines (Global Stream)</span>
                  </div>
                  {activeCategory === 'all' && (
                    <Check size={14} className="text-cyan-500" />
                  )}
                </button>

                {/* List of the 8 Universal Disciplines */}
                {UNIVERSAL_DISCIPLINES.map((discipline) => {
                  const isSelected = selectedDisciplineId === discipline.id;
                  const isCurrentActive = activeCategory === discipline.id;

                  return (
                    <button
                      key={discipline.id}
                      type="button"
                      onClick={() => setSelectedDisciplineId(discipline.id)}
                      onMouseEnter={() => setSelectedDisciplineId(discipline.id)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-xl text-xs font-medium text-left transition-all',
                        isSelected
                          ? 'bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white',
                        isCurrentActive && 'border-l-2 border-cyan-500 pl-1.5'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base flex-shrink-0">{discipline.icon}</span>
                        <span className="truncate">{discipline.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">
                          {discipline.topics.length}
                        </span>
                        <ChevronRight size={13} className="text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Sub-Categories & Specializations (Columns 5-12) */}
              <div className="lg:col-span-8 flex flex-col gap-2.5 overflow-y-auto pr-1">
                {/* Active Discipline Header */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeDrawerDiscipline.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {activeDrawerDiscipline.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {activeDrawerDiscipline.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(activeDrawerDiscipline.id);
                      onSelectTopic('all');
                      setIsOpen(false);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                  >
                    View All in Domain
                  </button>
                </div>

                {/* Sub-Topics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {activeDrawerDiscipline.topics.map((topic) => {
                    const isSelected = activeTopic === topic.id;

                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() =>
                          handleSelectTopicItem(topic.id, activeDrawerDiscipline.id)
                        }
                        className={cn(
                          'flex items-start gap-2.5 p-2.5 rounded-xl text-left border transition-all duration-150 group cursor-pointer',
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-900 dark:text-cyan-200 shadow-sm font-semibold'
                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] hover:bg-white dark:hover:bg-white/[0.06] hover:border-cyan-500/30'
                        )}
                      >
                        <span className="text-xl flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                          {topic.icon}
                        </span>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                              {topic.name}
                            </span>
                            {topic.isHot && (
                              <Flame size={12} className="text-orange-500 fill-orange-500/20" />
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                            {topic.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversalKnowledgeNavigator;
