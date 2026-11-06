'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  ExternalLink,
  Plus,
  Check,
  Sparkles,
  Flame,
  Radio,
  Users,
} from 'lucide-react';
import {
  POPULAR_REDDIT_COMMUNITIES,
  RedditSubreddit,
  searchRedditCommunities,
} from '@/lib/services/redditDirectory';
import { openExternalLink } from '@/lib/openExternal';
import { addSource } from '@/lib/reader/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RedditCommunityExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSubreddit?: (sub: string) => void;
  subscribedUrls?: string[];
  onSubscribed?: () => void;
}

const CATEGORIES = [
  'All',
  'AI & Machine Learning',
  'Computer Science & Tech',
  'Medicine & Healthcare',
  'Natural Sciences & Space',
  'Engineering & Robotics',
  'Startups & Business',
];

export const RedditCommunityExplorerModal: React.FC<RedditCommunityExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelectSubreddit,
  subscribedUrls = [],
  onSubscribed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [subscribingSub, setSubscribingSub] = useState<string | null>(null);

  const filteredCommunities = useMemo(() => {
    if (searchQuery.trim()) {
      return searchRedditCommunities(searchQuery, 24);
    }
    if (selectedCategory === 'All') {
      return POPULAR_REDDIT_COMMUNITIES;
    }
    return POPULAR_REDDIT_COMMUNITIES.filter((c) => c.category === selectedCategory);
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleSubscribe = async (community: RedditSubreddit) => {
    setSubscribingSub(community.sub);
    try {
      await addSource({
        url: community.feedUrl,
        name: community.name,
        openTarget: 'local',
        textDir: 'ltr',
      });
      toast.success(`Subscribed to ${community.name} in Reader!`);
      onSubscribed?.();
    } catch (e: any) {
      toast.error(e.message || `Failed to subscribe to ${community.name}`);
    } finally {
      setSubscribingSub(null);
    }
  };

  const handleExplore = (community: RedditSubreddit) => {
    if (onSelectSubreddit) {
      onSelectSubreddit(`reddit_${community.sub.toLowerCase()}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md select-none text-xs">
      <div className="relative w-[920px] max-w-[96vw] h-[680px] max-h-[92vh] bg-white dark:bg-[#0c101a] rounded-3xl border border-slate-200/90 dark:border-white/[0.12] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-xl font-bold shadow-sm">
              👾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Reddit Communities & Subreddits Radar
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/25 uppercase">
                  Live Directory
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Explore real scientific, technical & academic discussions across 150+ Reddit communities
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Autocomplete Bar */}
        <div className="p-4 border-b border-slate-200/60 dark:border-white/[0.06] bg-white dark:bg-transparent space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              autoFocus
              placeholder="Search by name (e.g. 'LocalLLaMA', 'Dentistry', 'ChatGPT') or topic keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setSearchQuery('');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border',
                  selectedCategory === cat && !searchQuery
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-white/10 hover:border-orange-500/30'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Communities Grid */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-3 px-1">
            <span>
              Showing {filteredCommunities.length} communities {searchQuery && `matching "${searchQuery}"`}
            </span>
            <span className="font-mono">Real-time RSS Enabled</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCommunities.map((comm) => {
              const isSubscribed = subscribedUrls.some(
                (u) => u === comm.feedUrl || u.toLowerCase().includes(comm.sub.toLowerCase())
              );
              const isBusy = subscribingSub === comm.sub;

              return (
                <div
                  key={comm.sub}
                  className="flex flex-col justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#111522] border border-slate-200/80 dark:border-white/[0.08] hover:border-orange-500/40 dark:hover:border-orange-500/30 transition-all shadow-sm group"
                >
                  <div>
                    {/* Top Row: Name, Icon, Subscribers */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xl">{comm.icon}</span>
                        <div className="truncate">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                            {comm.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                            <Users size={10} />
                            <span>{comm.subscribers}</span>
                          </span>
                        </div>
                      </div>

                      {comm.isHot && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                          HOT
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300/80 line-clamp-2 leading-relaxed mb-3">
                      {comm.description}
                    </p>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-1.5">
                    {/* Explore in Discover */}
                    <button
                      type="button"
                      onClick={() => handleExplore(comm)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/25 transition-colors active:scale-95"
                    >
                      <Radio size={11} />
                      <span>Explore</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Subscribe in Reader */}
                      <button
                        type="button"
                        disabled={isSubscribed || isBusy}
                        onClick={() => handleSubscribe(comm)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all active:scale-95',
                          isSubscribed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
                            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800'
                        )}
                      >
                        {isSubscribed ? (
                          <>
                            <Check size={11} />
                            <span>Subscribed</span>
                          </>
                        ) : (
                          <>
                            <Plus size={11} />
                            <span>{isBusy ? 'Adding...' : 'Subscribe'}</span>
                          </>
                        )}
                      </button>

                      {/* Open External Reddit */}
                      <button
                        type="button"
                        title="Open in Reddit"
                        onClick={() => openExternalLink(`https://www.reddit.com/r/${comm.sub}`)}
                        className="p-1 rounded-lg text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-orange-500" />
            <span>Reddit streams are cached in-memory with intelligent rate-limit mitigation</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-300/60 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default RedditCommunityExplorerModal;

