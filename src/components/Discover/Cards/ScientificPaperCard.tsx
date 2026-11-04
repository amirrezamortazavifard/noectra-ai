'use client';

import React, { useState } from 'react';
import { DiscoverFeedItem } from '@/lib/services/discover/types';
import {
  ExternalLink,
  BookOpen,
  Bookmark,
  MessageSquare,
  Sparkles,
  Layers,
  FileDown,
  Copy,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { openExternalLink } from '@/lib/openExternal';
import { cn } from '@/lib/utils';

interface ScientificPaperCardProps {
  paper: DiscoverFeedItem;
  isSaved?: boolean;
  isInQueue?: boolean;
  onSave?: (paper: DiscoverFeedItem) => void;
  onAddToQueue?: (paper: DiscoverFeedItem) => void;
  onExplainAi?: (paper: DiscoverFeedItem) => void;
  onDiscussAi?: (paper: DiscoverFeedItem) => void;
  isComparing?: boolean;
  onToggleCompare?: (paper: DiscoverFeedItem) => void;
}

export const ScientificPaperCard: React.FC<ScientificPaperCardProps> = ({
  paper,
  isSaved,
  isInQueue,
  onSave,
  onAddToQueue,
  onExplainAi,
  onDiscussAi,
  isComparing,
  onToggleCompare,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  const handleOpenSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    openExternalLink(paper.url, e);
  };

  const handleOpenPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (paper.pdfUrl) {
      openExternalLink(paper.pdfUrl, e);
    }
  };

  const handleCopyCitation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const citation = `${paper.authors.slice(0, 3).join(', ')}${
      paper.authors.length > 3 ? ' et al.' : ''
    }. "${paper.title}". ${paper.venue || paper.source} (${new Date(
      paper.publishedAt
    ).getFullYear() || 'Recent'}). ${paper.doi ? `DOI: ${paper.doi}` : paper.url}`;
    navigator.clipboard.writeText(citation);
    toast.success('Citation copied to clipboard');
  };

  return (
    <div className="flex flex-col rounded-2xl bg-white/80 dark:bg-[#0f1420]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-cyan-500/40 dark:hover:border-cyan-500/35 p-5 transition-all duration-200 shadow-sm hover:shadow-md group">
      {/* Top Header: Source, Venue, Year & Citations */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-medium">
            {paper.source}
          </span>
          <span className="text-slate-400 dark:text-white/30">•</span>
          <span className="font-medium text-slate-700 dark:text-white/70 truncate max-w-[200px] sm:max-w-[260px]">
            {paper.venue || 'Scholarly Journal'}
          </span>
          <span className="text-slate-400 dark:text-white/30">•</span>
          <span className="text-slate-500 dark:text-white/50 font-mono text-[11px]">
            {new Date(paper.publishedAt).getFullYear() || 'Recent'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {paper.citationCount !== undefined && paper.citationCount !== null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Sparkles size={11} />
              <span>{paper.citationCount} cit.</span>
            </span>
          )}

          {paper.openAccess && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              OA
            </span>
          )}
        </div>
      </div>

      {/* Paper Title */}
      <h3
        onClick={handleOpenSource}
        className="text-base sm:text-lg font-medium leading-snug text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer"
      >
        <span className="hover:underline inline-flex items-start gap-1.5">
          <span>{paper.title}</span>
          <ExternalLink
            size={13}
            className="opacity-0 group-hover:opacity-70 transition-opacity mt-1 flex-shrink-0"
          />
        </span>
      </h3>

      {/* Authors List */}
      {paper.authors && paper.authors.length > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Authors: </span>
          <span>
            {paper.authors.slice(0, 4).join(', ')}
            {paper.authors.length > 4 ? ` et al.` : ''}
          </span>
        </div>
      )}

      {/* Tags */}
      {paper.tags && paper.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {paper.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 border border-black/5 dark:border-white/10"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Abstract */}
      <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 flex-1">
        <p className={expanded ? '' : 'line-clamp-3'}>{paper.description}</p>
        {paper.description.length > 200 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-0.5 font-medium"
          >
            <span>{expanded ? 'Show Less' : 'Read Abstract'}</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Footer Action Row */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-white/10 text-xs">
        <div className="flex items-center gap-2">
          {/* AI Explain Button */}
          <button
            type="button"
            onClick={() => onExplainAi?.(paper)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 transition-colors active:scale-95"
          >
            <Sparkles size={12} />
            <span>AI Explain</span>
          </button>

          {/* Discuss in Chat */}
          <button
            type="button"
            onClick={() => onDiscussAi?.(paper)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white transition-colors active:scale-95"
          >
            <MessageSquare size={12} />
            <span>Discuss</span>
          </button>

          {/* Compare Toggle */}
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(paper)}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors',
                isComparing
                  ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Layers size={12} />
              <span>{isComparing ? 'Comparing' : 'Compare'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          {/* Direct PDF Link */}
          {paper.pdfUrl && (
            <button
              type="button"
              title="Open PDF"
              onClick={handleOpenPdf}
              className="p-1.5 rounded-lg hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <FileDown size={15} />
            </button>
          )}

          {/* Reading Queue */}
          <button
            type="button"
            title={isInQueue ? 'In Reading Queue' : 'Add to Reading Queue'}
            onClick={() => onAddToQueue?.(paper)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isInQueue
                ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            )}
          >
            <BookOpen size={15} />
          </button>

          {/* Bookmark */}
          <button
            type="button"
            title={isSaved ? 'Saved to Bookmarks' : 'Save Bookmark'}
            onClick={() => onSave?.(paper)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isSaved
                ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                : 'hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            )}
          >
            <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          {/* Copy Citation */}
          <button
            type="button"
            title="Copy Citation"
            onClick={handleCopyCitation}
            className="p-1.5 rounded-lg hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScientificPaperCard;
