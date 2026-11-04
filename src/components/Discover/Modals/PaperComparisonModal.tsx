'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Layers,
  Sparkles,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { DiscoverFeedItem } from '@/lib/services/discover/types';
import { generatePaperComparison } from '@/lib/services/discover/intelligenceApi';
import Markdown from 'markdown-to-jsx';

interface PaperComparisonModalProps {
  papers: DiscoverFeedItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemovePaper: (id: string) => void;
  onClearAll: () => void;
}

export const PaperComparisonModal: React.FC<PaperComparisonModalProps> = ({
  papers,
  isOpen,
  onClose,
  onRemovePaper,
  onClearAll,
}) => {
  const [comparisonText, setComparisonText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && papers.length >= 2) {
      setLoading(true);
      generatePaperComparison(papers)
        .then((md) => setComparisonText(md))
        .catch((err) => {
          toast.error(err.message || 'Comparison failed');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, papers]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(comparisonText);
    toast.success('Comparison matrix copied to clipboard');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c101a] border border-violet-500/30 dark:border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                <Layers size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Literature Comparison Matrix</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                    {papers.length} Papers Selected
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evidence-grounded synthesis of architectures, modalities, and reported findings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Selected Papers Header Strip */}
          <div className="px-6 py-3 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center gap-2 overflow-x-auto scrollbar-thin">
            {papers.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131722] border border-black/5 dark:border-white/10 text-xs shadow-sm flex-shrink-0"
              >
                <span className="font-mono text-violet-500 font-semibold">#{idx + 1}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                  {p.title}
                </span>
                <button
                  type="button"
                  onClick={() => onRemovePaper(p.id)}
                  className="text-slate-400 hover:text-rose-500"
                  title="Remove from comparison"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200 scrollbar-thin">
            {papers.length < 2 ? (
              <div className="py-16 text-center">
                <Layers size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Please select at least 2 papers from the feed to generate a comparison matrix.
                </p>
              </div>
            ) : loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-violet-500" />
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Synthesizing comparative matrix and research gaps...
                </p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-table:border prose-table:border-slate-200 dark:prose-table:border-white/10 prose-th:bg-slate-100 dark:prose-th:bg-white/5 prose-th:p-2 prose-td:p-2">
                <Markdown>{comparisonText}</Markdown>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Copy size={13} />
              <span>Copy Matrix</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaperComparisonModal;

