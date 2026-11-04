'use client';

import React, { useMemo } from 'react';
import { openExternalLink } from '@/lib/openExternal';
import { cn } from '@/lib/utils';
import {
  X,
  ExternalLink,
  MessageSquare,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

interface AlphaXivModalProps {
  isOpen: boolean;
  onClose: () => void;
  paper: {
    id: string;
    title: string;
    url: string;
    doi?: string;
    authors?: string[];
    description?: string;
  } | null;
}

export function extractArxivId(input: string): string | null {
  if (!input) return null;
  // Match 2401.12345 or 2401.12345v1 or similar
  const match = input.match(/\b(\d{4}\.\d{4,5}(?:v\d+)?)\b/);
  if (match) return match[1];

  // Match old format: math/0211159 or cs/0112017
  const oldMatch = input.match(/\b([a-zA-Z\-]+(?:\.[a-zA-Z\-]+)?\/\d{7})\b/);
  if (oldMatch) return oldMatch[1];

  return null;
}

export const AlphaXivModal: React.FC<AlphaXivModalProps> = ({
  isOpen,
  onClose,
  paper,
}) => {
  const [copied, setCopied] = React.useState(false);

  const arxivId = useMemo(() => {
    if (!paper) return null;
    return (
      extractArxivId(paper.url) ||
      (paper.doi ? extractArxivId(paper.doi) : null) ||
      extractArxivId(paper.id) ||
      extractArxivId(paper.title)
    );
  }, [paper]);

  const alphaXivUrl = useMemo(() => {
    if (arxivId) {
      return `https://www.alphaxiv.org/abs/${arxivId}`;
    }
    if (paper) {
      return `https://www.alphaxiv.org/search?q=${encodeURIComponent(paper.title)}`;
    }
    return 'https://www.alphaxiv.org';
  }, [arxivId, paper]);

  if (!isOpen || !paper) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(alphaXivUrl);
      setCopied(true);
      toast.success('alphaXiv link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleOpenBrowser = () => {
    openExternalLink(alphaXivUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] rounded-3xl bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-white/15 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white select-none">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#111522]/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
              αX
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  alphaXiv Open Peer Discussions & Annotations
                </span>
                {arxivId && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-mono text-[10px] font-semibold border border-cyan-500/30">
                    arXiv:{arxivId}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xl">
                {paper.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Copy alphaXiv URL"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>

            <button
              type="button"
              onClick={handleOpenBrowser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Open in Browser</span>
              <ExternalLink size={13} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Embedded Iframe Container */}
        <div className="flex-1 w-full bg-slate-100 dark:bg-black/40 relative overflow-hidden">
          <iframe
            src={alphaXivUrl}
            title={`alphaXiv - ${paper.title}`}
            className="w-full h-full border-0 select-text"
            allow="clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />

          {/* Bottom Bar Info Pill */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between p-2.5 rounded-2xl bg-white/95 dark:bg-[#121622]/95 border border-slate-200/90 dark:border-white/10 shadow-lg text-xs pointer-events-auto backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <MessageSquare size={14} className="text-cyan-500" />
              <span>
                Public community comments, questions, and equation annotations from alphaXiv.
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenBrowser}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Participate in Discussion</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlphaXivModal;
