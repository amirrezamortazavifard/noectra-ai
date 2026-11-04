'use client';

import React from 'react';
import {
  Activity,
  Sparkles,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Trash2,
  Radio,
  ExternalLink,
  ChevronRight,
  Layers,
  Star,
  X,
  Plus,
} from 'lucide-react';
import {
  SourceStatusInfo,
  TrendingTopicStat,
  QueueDiscoverItem,
  FollowedTopic,
} from '@/lib/services/discover/types';
import { cn } from '@/lib/utils';

interface IntelligencePulseSidebarProps {
  sourcesStatus: SourceStatusInfo[];
  onlineCount: number;
  totalSources: number;
  trendingTopics: TrendingTopicStat[];
  readingQueue: QueueDiscoverItem[];
  followedTopics: FollowedTopic[];
  onSelectTopic: (topic: string) => void;
  onOpenBriefingModal: () => void;
  onToggleQueueRead: (id: string, isRead: boolean) => void;
  onRemoveFromQueue: (id: string) => void;
  onUnfollowTopic: (topicId: string) => void;
  onOpenItem: (item: any) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const IntelligencePulseSidebar: React.FC<IntelligencePulseSidebarProps> = ({
  sourcesStatus,
  onlineCount,
  totalSources,
  trendingTopics,
  readingQueue,
  followedTopics,
  onSelectTopic,
  onOpenBriefingModal,
  onToggleQueueRead,
  onRemoveFromQueue,
  onUnfollowTopic,
  onOpenItem,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <aside className="w-full flex flex-col gap-5 select-none">
      {/* 1. Global Intelligence Pulse Widget */}
      <div className="rounded-2xl p-5 bg-white/80 dark:bg-[#0e121b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Intelligence Pulse
            </h3>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            {onlineCount}/{totalSources} Live
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Verified Sources
            </p>
            <p className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
              {totalSources} Channels
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Research Velocity
            </p>
            <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
              +38% / 7d
            </p>
          </div>
        </div>

        {/* AI Daily Briefing Button */}
        <button
          type="button"
          onClick={onOpenBriefingModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <Sparkles size={14} />
          <span>Generate AI Daily Briefing</span>
        </button>
      </div>

      {/* 2. Trending Research Topics */}
      <div className="rounded-2xl p-5 bg-white/80 dark:bg-[#0e121b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-cyan-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Trending Radar
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Real Freq.</span>
        </div>

        <div className="flex flex-col gap-2">
          {trendingTopics.map((trend, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectTopic(trend.topic)}
              className="flex items-center justify-between p-2 rounded-xl text-left bg-transparent hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-mono text-slate-400 w-4">
                  0{idx + 1}
                </span>
                <div className="truncate">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">
                    {trend.topic}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {trend.category}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 flex-shrink-0 ml-2">
                {trend.velocity}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Your Reading Queue */}
      <div className="rounded-2xl p-5 bg-white/80 dark:bg-[#0e121b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-violet-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Reading Queue
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold">
            {readingQueue.length}
          </span>
        </div>

        {readingQueue.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your reading queue is empty.
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Click the book icon on any card to save it for later.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
            {readingQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-violet-500/30 transition-colors group"
              >
                <div
                  onClick={() => onOpenItem(item.dataJson || item)}
                  className="flex-1 cursor-pointer min-w-0"
                >
                  <p
                    className={cn(
                      'text-xs font-medium leading-snug line-clamp-1 transition-colors',
                      item.isRead
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400'
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.source}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    title={item.isRead ? 'Mark as Unread' : 'Mark as Read'}
                    onClick={() => onToggleQueueRead(item.id, !item.isRead)}
                    className={cn(
                      'p-1 rounded-md transition-colors',
                      item.isRead
                        ? 'text-emerald-500'
                        : 'text-slate-400 hover:text-emerald-500'
                    )}
                  >
                    <CheckCircle2 size={13} />
                  </button>

                  <button
                    type="button"
                    title="Remove from queue"
                    onClick={() => onRemoveFromQueue(item.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Followed Topics */}
      <div className="rounded-2xl p-5 bg-white/80 dark:bg-[#0e121b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Followed Topics
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {followedTopics.length} Active
          </span>
        </div>

        {followedTopics.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
            Follow topics in the top strip to customize your feed.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {followedTopics.map((topic) => (
              <span
                key={topic.topicId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
              >
                <span
                  onClick={() => onSelectTopic(topic.displayName)}
                  className="cursor-pointer hover:underline"
                >
                  {topic.displayName}
                </span>
                <button
                  type="button"
                  onClick={() => onUnfollowTopic(topic.topicId)}
                  className="p-0.5 hover:text-rose-500 rounded-full transition-colors"
                  title="Unfollow topic"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5. Sources Status Monitor */}
      <div className="rounded-2xl p-5 bg-white/80 dark:bg-[#0e121b]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio size={15} className="text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Sources Health
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Live Telemetry</span>
        </div>

        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
          {sourcesStatus.map((src) => (
            <div
              key={src.key}
              className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-white/[0.04] last:border-0"
            >
              <div className="truncate pr-2">
                <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {src.name}
                </p>
                <p className="text-[10px] text-slate-400 font-mono capitalize">
                  {src.sourceType}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  {src.latencyMs}ms
                </span>
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    src.status === 'online'
                      ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                      : src.status === 'degraded'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default IntelligencePulseSidebar;
