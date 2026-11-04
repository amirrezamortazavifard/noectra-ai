'use client';

import React from 'react';
import { DISCOVERY_STORY_TOPICS, StoryTopicItem } from '@/lib/services/discover/taxonomy';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface TopicStoriesStripProps {
  activeTopic: string;
  onSelectTopic: (topicId: string, category: string) => void;
}

export const TopicStoriesStrip: React.FC<TopicStoriesStripProps> = ({
  activeTopic,
  onSelectTopic,
}) => {
  return (
    <div className="relative w-full py-2">
      {/* Scrollable Container */}
      <div className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none select-none px-0.5">
        {DISCOVERY_STORY_TOPICS.map((topic: StoryTopicItem) => {
          const isActive = activeTopic === topic.id;

          return (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.id, topic.category)}
              className="flex flex-col items-center group flex-shrink-0 focus:outline-none transition-transform active:scale-95"
            >
              {/* Outer Circular Gradient Ring */}
              <div
                className={cn(
                  'relative p-[2.5px] rounded-full transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-tr from-cyan-400 via-cyan-500 to-violet-500 shadow-[0_0_16px_rgba(6,182,212,0.45)] scale-105'
                    : 'bg-black/10 dark:bg-white/10 group-hover:bg-gradient-to-tr group-hover:from-cyan-500/60 group-hover:to-violet-500/60'
                )}
              >
                {/* Inner Icon Surface */}
                <div
                  className={cn(
                    'w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-200 border',
                    isActive
                      ? 'bg-white dark:bg-[#0e121b] border-cyan-400/50 text-white'
                      : 'bg-white/90 dark:bg-[#121622] border-black/5 dark:border-white/10 group-hover:border-white/30'
                  )}
                >
                  <span className="text-xl sm:text-2xl transition-transform duration-200 group-hover:scale-110">
                    {topic.icon}
                  </span>
                </div>

                {/* New Content Indicator Dot */}
                {topic.hasNew && (
                  <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-cyan-400 border-2 border-white dark:border-[#0c101a] animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="mt-2 text-center max-w-[76px] sm:max-w-[84px]">
                <p
                  className={cn(
                    'text-[11px] font-semibold truncate transition-colors leading-tight',
                    isActive
                      ? 'text-cyan-600 dark:text-cyan-300 font-bold'
                      : 'text-slate-800 dark:text-slate-200 group-hover:text-black dark:group-hover:text-white'
                  )}
                >
                  {topic.title}
                </p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                  {topic.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TopicStoriesStrip;

