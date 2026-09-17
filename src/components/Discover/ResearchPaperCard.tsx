import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResearchPaper } from '@/lib/services/discover/types';
import {
  ExternalLink,
  MessageSquare,
  Sparkles,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { openExternalLink } from '@/lib/openExternal';

interface ResearchPaperCardProps {
  paper: ResearchPaper;
}

export const ResearchPaperCard: React.FC<ResearchPaperCardProps> = ({ paper }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = paper.doi ? `https://doi.org/${paper.doi}` : paper.url;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('DOI / Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPaper = (e: React.MouseEvent) => {
    openExternalLink(paper.url, e);
  };

  const handleOpenPdf = (e: React.MouseEvent) => {
    openExternalLink(paper.pdfUrl, e);
  };

  const chatPrompt = encodeURIComponent(
    `Please provide a comprehensive summary and analysis of this research paper:\n\nTitle: "${paper.title}"\nAuthors: ${paper.authors.join(', ')}\nYear: ${paper.year}\nVenue: ${paper.venue}\nURL: ${paper.url}\n\nAbstract:\n${paper.abstract}`
  );

  return (
    <div className="flex flex-col bg-light-secondary/60 dark:bg-[#121316] border border-light-200/80 dark:border-white/[0.08] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md group">
      {/* Header: Source, Venue, Year & Citations */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 font-medium">
            {paper.source}
          </span>
          <span className="text-black/50 dark:text-white/40">•</span>
          <span className="font-medium text-black/70 dark:text-white/70 truncate max-w-[200px] sm:max-w-[300px]">
            {paper.venue || 'Scholarly Journal'}
          </span>
          <span className="text-black/50 dark:text-white/40">•</span>
          <span className="text-black/60 dark:text-white/60 font-mono">{paper.year}</span>
        </div>

        {typeof paper.citationCount === 'number' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Sparkles size={12} />
            {paper.citationCount} {paper.citationCount === 1 ? 'citation' : 'citations'}
          </span>
        )}
      </div>

      {/* Paper Title */}
      <h3
        onClick={handleOpenPaper}
        className="text-lg font-medium leading-snug text-black dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors cursor-pointer"
      >
        <span className="hover:underline inline-flex items-start gap-1.5">
          <span>{paper.title}</span>
          <ExternalLink size={14} className="opacity-0 group-hover:opacity-60 transition-opacity mt-1 flex-shrink-0" />
        </span>
      </h3>

      {/* Authors List */}
      <div className="text-xs text-black/60 dark:text-white/60 mb-3 flex flex-wrap items-center gap-1">
        <span className="font-semibold text-black/70 dark:text-white/70">Authors:</span>
        <span>
          {paper.authors.slice(0, 5).join(', ')}
          {paper.authors.length > 5 ? ` et al. (+${paper.authors.length - 5})` : ''}
        </span>
      </div>

      {/* Abstract */}
      <div className="text-xs text-black/70 dark:text-white/70 leading-relaxed mb-4 flex-1">
        <p className={expanded ? '' : 'line-clamp-3'}>
          {paper.abstract}
        </p>
        {paper.abstract.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-0.5 font-medium"
          >
            {expanded ? (
              <>
                Show less <ChevronUp size={13} />
              </>
            ) : (
              <>
                Read abstract <ChevronDown size={13} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Fields of Study Badges */}
      {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {paper.fieldsOfStudy.map((field, idx) => (
            <span
              key={idx}
              className="text-[11px] px-2 py-0.5 rounded-full bg-light-200/50 dark:bg-white/[0.05] border border-light-300/60 dark:border-white/[0.08] text-black/60 dark:text-white/60"
            >
              {field}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-light-200/40 dark:border-white/[0.06] mt-auto">
        <div className="flex items-center gap-2">
          {/* AI Chat / Summarize Button */}
          <Link
            to={`/chat?q=${chatPrompt}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-colors"
          >
            <MessageSquare size={13} />
            Chat with Paper
          </Link>

          {/* PDF Link if available */}
          {paper.pdfUrl && (
            <button
              type="button"
              onClick={handleOpenPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors"
            >
              <Download size={13} />
              View PDF
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 text-black/50 dark:text-white/50">
          <button
            onClick={handleCopyLink}
            title="Copy DOI / Link"
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
          <button
            type="button"
            onClick={handleOpenPaper}
            title="Open paper link"
            className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResearchPaperCard;
