import React from 'react';
import {
  AlertCircle,
  Inbox,
  WifiOff,
  SearchX,
  FileQuestion,
  RefreshCw,
  FolderPlus,
  Compass,
} from 'lucide-react';

export type EmptyStateType =
  | 'no-search-results'
  | 'no-archives'
  | 'catalog-offline'
  | 'no-internet'
  | 'download-empty'
  | 'index-empty'
  | 'missing-file'
  | 'workspace-empty';

interface Props {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const KnowledgeEmptyState: React.FC<Props> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const getDefaults = () => {
    switch (type) {
      case 'no-search-results':
        return {
          icon: <SearchX className="w-10 h-10 text-slate-400 dark:text-slate-500" />,
          title: title || 'No Matching Knowledge Found',
          description:
            description ||
            'Try adjusting your search keywords, clearing active filters, or expanding the archive search scope.',
          actionLabel: actionLabel || 'Clear Search Filters',
        };
      case 'catalog-offline':
        return {
          icon: <WifiOff className="w-10 h-10 text-amber-500" />,
          title: title || 'OPDS Catalog Offline',
          description:
            description ||
            'Unable to establish a connection to the remote Kiwix OPDS feed. Check your network or switch to local library.',
          actionLabel: actionLabel || 'Retry Connection',
        };
      case 'no-archives':
        return {
          icon: <Inbox className="w-10 h-10 text-slate-400 dark:text-slate-500" />,
          title: title || 'Your Knowledge Library is Empty',
          description:
            description ||
            'You haven’t imported or downloaded any offline ZIM archives yet. Discover collections or import local files.',
          actionLabel: actionLabel || 'Explore Catalog',
        };
      case 'index-empty':
        return {
          icon: <AlertCircle className="w-10 h-10 text-sky-500" />,
          title: title || 'FTS5 Search Index Not Ready',
          description:
            description ||
            'Articles have not been indexed for full-text search yet. Index your installed archives to enable instant lexical queries.',
          actionLabel: actionLabel || 'Open Indexing Manager',
        };
      case 'missing-file':
        return {
          icon: <FileQuestion className="w-10 h-10 text-rose-500" />,
          title: title || 'Archive File Unreachable',
          description:
            description ||
            'The physical .zim file at this location has been moved, renamed, or unmounted.',
          actionLabel: actionLabel || 'Relink File Location',
        };
      case 'workspace-empty':
      default:
        return {
          icon: <FolderPlus className="w-10 h-10 text-slate-400 dark:text-slate-500" />,
          title: title || 'No Items Saved in Workspace',
          description:
            description ||
            'Save interesting articles, research notes, and highlighted excerpts here to organize your personal dossier.',
          actionLabel: actionLabel || 'Browse Library',
        };
    }
  };

  const defaults = getDefaults();

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-white/10 shadow-sm max-w-xl mx-auto my-6 space-y-4">
      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
        {defaults.icon}
      </div>

      <div className="space-y-1.5 max-w-md">
        <h4 className="text-base font-bold text-slate-900 dark:text-white">
          {defaults.title}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
          {defaults.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {onAction && defaults.actionLabel && (
          <button
            onClick={onAction}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{defaults.actionLabel}</span>
          </button>
        )}

        {onSecondaryAction && secondaryActionLabel && (
          <button
            onClick={onSecondaryAction}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

