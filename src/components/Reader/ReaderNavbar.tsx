import React, { useState } from 'react';
import {
  LayoutGrid,
  Columns2,
  Newspaper,
  AlignJustify,
  RefreshCw,
  CheckCheck,
  SlidersHorizontal,
  Settings,
  Bell,
  Search,
  X,
  Star,
  CircleDot,
  ListFilter,
} from 'lucide-react';
import { FilterType, ViewConfigs, ViewType } from '@/lib/reader/types';

interface ReaderNavbarProps {
  currentView: ViewType;
  onViewChange: (v: ViewType) => void;
  currentFilter: FilterType;
  onFilterChange: (f: FilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onMarkAllRead: () => void;
  viewConfigs: ViewConfigs;
  onViewConfigsChange: (cfg: ViewConfigs) => void;
  onOpenSettings: () => void;
  onOpenLogs: () => void;
  unreadLogsCount: number;
  totalUnreadCount: number;
}

export default function ReaderNavbar({
  currentView,
  onViewChange,
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing,
  onMarkAllRead,
  viewConfigs,
  onViewConfigsChange,
  onOpenSettings,
  onOpenLogs,
  unreadLogsCount,
  totalUnreadCount,
}: ReaderNavbarProps) {
  const [showConfigPopover, setShowConfigPopover] = useState(false);

  return (
    <header className="relative z-20 flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1017]/80 backdrop-blur-xl transition-colors">
      {/* Left: View Mode Toggles & Filters */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center p-0.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
          <button
            onClick={() => onViewChange('cards')}
            title="Cards View"
            className={`p-1.5 rounded-lg transition-all ${
              currentView === 'cards'
                ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewChange('list')}
            title="Split List View"
            className={`p-1.5 rounded-lg transition-all ${
              currentView === 'list'
                ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <Columns2 size={16} />
          </button>
          <button
            onClick={() => onViewChange('magazine')}
            title="Magazine View"
            className={`p-1.5 rounded-lg transition-all ${
              currentView === 'magazine'
                ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <Newspaper size={16} />
          </button>
          <button
            onClick={() => onViewChange('compact')}
            title="Compact View"
            className={`p-1.5 rounded-lg transition-all ${
              currentView === 'compact'
                ? 'bg-white dark:bg-white/15 text-black dark:text-white shadow-sm'
                : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
            }`}
          >
            <AlignJustify size={16} />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

        {/* Filter Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
              currentFilter === 'all'
                ? 'bg-black/10 dark:bg-white/15 text-black dark:text-white font-semibold'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            <ListFilter size={13} />
            <span>All</span>
          </button>
          <button
            onClick={() => onFilterChange('unread')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
              currentFilter === 'unread'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            <CircleDot size={13} />
            <span>Unread</span>
            {totalUnreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold">
                {totalUnreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onFilterChange('starred')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
              currentFilter === 'starred'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            <Star size={13} />
            <span>Starred</span>
          </button>
        </div>
      </div>

      {/* Center: Search with Regex Support */}
      <div className="relative flex-1 max-w-sm mx-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search articles (supports /regex/)..."
          className="w-full pl-8 pr-7 py-1 text-xs rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Right: Actions, View Configs, Logs, Settings */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Feeds (Shortcut: r)"
          className="p-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-sky-500' : ''} />
        </button>

        <button
          onClick={onMarkAllRead}
          title="Mark All as Read (Shortcut: a)"
          className="p-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all"
        >
          <CheckCheck size={15} />
        </button>

        {/* View Configs Popover */}
        <div className="relative">
          <button
            onClick={() => setShowConfigPopover(!showConfigPopover)}
            title="View Options"
            className={`p-1.5 rounded-xl border transition-all ${
              showConfigPopover
                ? 'border-sky-500 text-sky-500 bg-sky-500/10'
                : 'border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal size={15} />
          </button>

          {showConfigPopover && (
            <div className="absolute right-0 mt-2 w-52 p-3 rounded-2xl bg-white dark:bg-[#121721] border border-black/10 dark:border-white/15 shadow-xl z-50 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white mb-2">Display Options</div>
              <label className="flex items-center justify-between py-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white">
                <span>Show Cover Image</span>
                <input
                  type="checkbox"
                  checked={viewConfigs.showCover}
                  onChange={(e) =>
                    onViewConfigsChange({ ...viewConfigs, showCover: e.target.checked })
                  }
                  className="rounded text-sky-500 focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between py-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white">
                <span>Show Text Snippet</span>
                <input
                  type="checkbox"
                  checked={viewConfigs.showSnippet}
                  onChange={(e) =>
                    onViewConfigsChange({ ...viewConfigs, showSnippet: e.target.checked })
                  }
                  className="rounded text-sky-500 focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between py-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white">
                <span>Fade Read Items</span>
                <input
                  type="checkbox"
                  checked={viewConfigs.fadeRead}
                  onChange={(e) =>
                    onViewConfigsChange({ ...viewConfigs, fadeRead: e.target.checked })
                  }
                  className="rounded text-sky-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Activity Logs */}
        <button
          onClick={onOpenLogs}
          title="Activity Logs"
          className="relative p-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all"
        >
          <Bell size={15} />
          {unreadLogsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-white dark:ring-[#0c1017]" />
          )}
        </button>

        {/* Settings Studio */}
        <button
          onClick={onOpenSettings}
          title="Reader Settings & Feeds Studio"
          className="p-1.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
}

