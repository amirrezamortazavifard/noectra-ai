import React, { useState } from 'react';
import {
  Inbox,
  Clock,
  Star,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Rss,
  Upload,
  Download,
  Filter,
} from 'lucide-react';
import { FeedGroup, FeedSource } from '@/lib/reader/types';

interface ReaderSidebarProps {
  sources: FeedSource[];
  groups: FeedGroup[];
  selectedSourceId: string | null;
  selectedGroupId: string | null;
  onSelectSource: (id: string | null) => void;
  onSelectGroup: (id: string | null) => void;
  onOpenAddModal: () => void;
  onOpenOpmlImport: () => void;
  onExportOpml: () => void;
  unreadOnlyInMenu: boolean;
  onToggleUnreadOnlyInMenu: () => void;
  totalUnreadCount: number;
}

export default function ReaderSidebar({
  sources,
  groups,
  selectedSourceId,
  selectedGroupId,
  onSelectSource,
  onSelectGroup,
  onOpenAddModal,
  onOpenOpmlImport,
  onExportOpml,
  unreadOnlyInMenu,
  onToggleUnreadOnlyInMenu,
  totalUnreadCount,
}: ReaderSidebarProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (gid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedGroups((prev) => ({ ...prev, [gid]: !prev[gid] }));
  };

  const isAllSelected = selectedSourceId === null && selectedGroupId === null;

  // Filter sources if unreadOnlyInMenu is active
  const filteredSources = unreadOnlyInMenu
    ? sources.filter((s) => s.unreadCount > 0)
    : sources;

  // Map sources to groups
  const groupedSourceIds = new Set<string>();
  groups.forEach((g) => g.sids.forEach((id) => groupedSourceIds.add(id)));

  const ungroupedSources = filteredSources.filter(
    (s) => !groupedSourceIds.has(s.id) && !s.hidden
  );

  return (
    <aside className="w-64 h-full flex flex-col border-r border-black/[0.06] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.01] select-none text-xs">
      {/* Top Header */}
      <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
        <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
          Subscriptions
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={onToggleUnreadOnlyInMenu}
            title={unreadOnlyInMenu ? 'Showing only unread' : 'Show only unread feeds'}
            className={`p-1 rounded-lg transition-all ${
              unreadOnlyInMenu
                ? 'bg-sky-500/20 text-sky-500 font-bold'
                : 'text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white'
            }`}
          >
            <Filter size={13} />
          </button>
          <button
            onClick={onOpenAddModal}
            title="Subscribe to Feed"
            className="p-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-all"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Quick Views */}
        <div className="space-y-0.5">
          <button
            onClick={() => {
              onSelectSource(null);
              onSelectGroup(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
              isAllSelected
                ? 'bg-black/[0.08] dark:bg-white/[0.1] text-black dark:text-white font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Inbox size={15} className="text-black/60 dark:text-white/60" />
              <span>All Articles</span>
            </div>
            {totalUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold">
                {totalUnreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Groups & Feeds Tree */}
        <div className="space-y-2">
          {groups.map((group) => {
            const isGroupSelected = selectedGroupId === group.id;
            const isCollapsed = !!collapsedGroups[group.id];
            const groupSources = sources.filter((s) => group.sids.includes(s.id) && !s.hidden);
            const groupUnread = groupSources.reduce((acc, curr) => acc + curr.unreadCount, 0);

            if (unreadOnlyInMenu && groupUnread === 0) return null;

            return (
              <div key={group.id} className="space-y-0.5">
                <div
                  onClick={() => {
                    onSelectSource(null);
                    onSelectGroup(group.id);
                  }}
                  className={`group flex items-center justify-between px-2 py-1 rounded-xl cursor-pointer transition-all ${
                    isGroupSelected
                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <button
                      onClick={(e) => toggleGroup(group.id, e)}
                      className="p-0.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                    >
                      {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {isCollapsed ? (
                      <Folder size={14} className="text-amber-500 shrink-0" />
                    ) : (
                      <FolderOpen size={14} className="text-amber-500 shrink-0" />
                    )}
                    <span className="truncate">{group.name}</span>
                  </div>
                  {groupUnread > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-600 dark:text-sky-300 font-semibold">
                      {groupUnread}
                    </span>
                  )}
                </div>

                {/* Group Feeds */}
                {!isCollapsed && (
                  <div className="pl-4 space-y-0.5">
                    {groupSources.map((source) => {
                      const isSourceSelected = selectedSourceId === source.id;
                      return (
                        <button
                          key={source.id}
                          onClick={() => {
                            onSelectGroup(null);
                            onSelectSource(source.id);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-lg transition-all ${
                            isSourceSelected
                              ? 'bg-black/[0.08] dark:bg-white/[0.1] text-black dark:text-white font-medium'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            {source.iconUrl ? (
                              <img
                                src={source.iconUrl}
                                alt=""
                                className="w-3.5 h-3.5 rounded shrink-0 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Rss size={12} className="text-orange-500 shrink-0" />
                            )}
                            <span className="truncate text-left">{source.name}</span>
                          </div>
                          {source.unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/15 text-sky-600 dark:text-sky-300 font-semibold">
                              {source.unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped Feeds */}
          {ungroupedSources.length > 0 && (
            <div className="space-y-0.5 pt-1">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-black/40 dark:text-white/40 tracking-wider">
                Feeds
              </div>
              {ungroupedSources.map((source) => {
                const isSourceSelected = selectedSourceId === source.id;
                return (
                  <button
                    key={source.id}
                    onClick={() => {
                      onSelectGroup(null);
                      onSelectSource(source.id);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg transition-all ${
                      isSourceSelected
                        ? 'bg-black/[0.08] dark:bg-white/[0.1] text-black dark:text-white font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {source.iconUrl ? (
                        <img
                          src={source.iconUrl}
                          alt=""
                          className="w-3.5 h-3.5 rounded shrink-0 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Rss size={12} className="text-orange-500 shrink-0" />
                      )}
                      <span className="truncate text-left">{source.name}</span>
                    </div>
                    {source.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/15 text-sky-600 dark:text-sky-300 font-semibold">
                        {source.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Utilities: Import / Export OPML */}
      <div className="p-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-black/50 dark:text-white/50">
        <button
          onClick={onOpenOpmlImport}
          className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all"
        >
          <Upload size={12} />
          <span>Import OPML</span>
        </button>
        <button
          onClick={onExportOpml}
          className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all"
        >
          <Download size={12} />
          <span>Export OPML</span>
        </button>
      </div>
    </aside>
  );
}

