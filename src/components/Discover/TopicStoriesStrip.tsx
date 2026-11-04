'use client';

import React, { useRef, useState, useEffect } from 'react';
import { DISCOVERY_STORY_TOPICS, StoryTopicItem } from '@/lib/services/discover/taxonomy';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface TopicStoriesStripProps {
  activeTopic: string;
  onSelectTopic: (topicId: string, category: string) => void;
}

export const TopicStoriesStrip: React.FC<TopicStoriesStripProps> = ({
  activeTopic,
  onSelectTopic,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -260 : 260;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full flex items-center group/strip">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="absolute left-0 z-10 p-1.5 rounded-full bg-white/95 dark:bg-[#121622]/95 border border-slate-200/90 dark:border-white/15 text-slate-700 dark:text-slate-300 shadow-md hover:scale-105 transition-all -ml-2"
          title="Scroll Left"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Pill Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none select-none w-full scroll-smooth"
      >
        {DISCOVERY_STORY_TOPICS.map((topic: StoryTopicItem) => {
          const isActive = activeTopic === topic.id;

          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                if (isActive) {
                  onSelectTopic('all', 'all');
                } else {
                  onSelectTopic(topic.id, topic.category);
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 border flex-shrink-0 active:scale-95 cursor-pointer',
                isActive
                  ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border-cyan-500/40 dark:border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.18)] font-semibold'
                  : 'bg-white dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
              )}
            >
              <span className="text-sm">{topic.icon}</span>
              <span className="font-medium tracking-tight">{topic.title}</span>

              {topic.hasNew && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="absolute right-0 z-10 p-1.5 rounded-full bg-white/95 dark:bg-[#121622]/95 border border-slate-200/90 dark:border-white/15 text-slate-700 dark:text-slate-300 shadow-md hover:scale-105 transition-all -mr-2"
          title="Scroll Right"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};

export default TopicStoriesStrip;
