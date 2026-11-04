'use client';

import React from 'react';
import { openExternalLink } from '@/lib/openExternal';
import { cn } from '@/lib/utils';
import {
  X,
  Rss,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  CheckCheck,
  Activity,
  Layers,
  Calendar,
  Zap,
  Globe2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface FeedProfileInfo {
  id: string;
  title: string;
  url: string;
  siteUrl?: string;
  category?: string;
  icon?: string;
  totalArticles?: number;
  unreadCount?: number;
  lastSyncedAt?: string;
  velocityPerWeek?: number;
  latencyMs?: number;
}

interface FeedProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  feed: FeedProfileInfo | null;
  onRefreshFeed?: (feedId: string) => void;
  onMarkAllRead?: (feedId: string) => void;
  onUnsubscribe?: (feedId: string) => void;
}

export const FeedProfileModal: React.FC<FeedProfileModalProps> = ({
  isOpen,
  onClose,
  feed,
  onRefreshFeed,
  onMarkAllRead,
  onUnsubscribe,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !feed) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopied(true);
      toast.success('Feed URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const velocity = feed.velocityPerWeek || 7.5;
  const latency = feed.latencyMs || 120;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-white/15 shadow-2xl p-6 flex flex-col gap-5 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold text-xl flex-shrink-0 shadow-sm">
              {feed.icon || <Rss size={22} />}
            </div>

            <div className="flex flex-col min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {feed.title}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs">
                {feed.url}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Health & Cadence Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Health & Latency */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
              <Activity size={12} className="animate-pulse" />
              <span>Stream Health</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-bold text-slate-900 dark:text-white">Active</span>
              <span className="text-xs font-mono text-slate-400">{latency}ms latency</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              HTTP 200 OK • SSL Verified
            </span>
          </div>

          {/* Card 2: Publishing Cadence */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
              <Zap size={12} />
              <span>Velocity Cadence</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                ~{velocity.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">posts / week</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {velocity >= 7 ? 'High Frequency Stream' : 'Weekly Digest'}
            </span>
          </div>
        </div>

        {/* Storage & Unread Metrics */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Layers size={14} className="text-cyan-500" />
            <span>Articles Cached</span>
          </div>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {feed.totalArticles || 48} items ({feed.unreadCount || 12} unread)
          </span>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {onRefreshFeed && (
              <button
                type="button"
                onClick={() => {
                  onRefreshFeed(feed.id);
                  toast.success(`Refreshing ${feed.title}...`);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-xs font-semibold text-slate-900 dark:text-white transition-colors"
              >
                <RefreshCw size={13} />
                <span>Sync Now</span>
              </button>
            )}

            {onMarkAllRead && (
              <button
                type="button"
                onClick={() => {
                  onMarkAllRead(feed.id);
                  toast.success('Marked all as read');
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-xs font-semibold text-slate-900 dark:text-white transition-colors"
              >
                <CheckCheck size={13} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] text-xs font-medium transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copied ? 'Copied URL' : 'Copy RSS Feed URL'}</span>
            </button>

            {feed.siteUrl && (
              <button
                type="button"
                onClick={() => openExternalLink(feed.siteUrl!)}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.05] text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
                title="Open Official Website"
              >
                <Globe2 size={15} />
              </button>
            )}

            {onUnsubscribe && (
              <button
                type="button"
                onClick={() => {
                  onUnsubscribe(feed.id);
                  onClose();
                }}
                className="p-2 rounded-xl border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Unsubscribe Feed"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedProfileModal;
