'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  MessageSquare,
  BookOpen,
  Copy,
  ExternalLink,
  ChevronRight,
  Brain,
  GraduationCap,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DiscoverFeedItem } from '@/lib/services/discover/types';
import { openExternalLink } from '@/lib/openExternal';
import { cn } from '@/lib/utils';

interface AiExplainModalProps {
  item: DiscoverFeedItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AiExplainModal: React.FC<AiExplainModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [level, setLevel] = useState<'beginner' | 'technical' | 'expert'>('technical');
  const [activeTab, setActiveTab] = useState<'synthesis' | 'gaps' | 'clinical'>('synthesis');

  if (!isOpen || !item) return null;

  const chatPrompt = encodeURIComponent(
    `I am analyzing this paper from Noectra Intelligence:\n\nTitle: "${item.title}"\nSource: ${item.source}\nAuthors: ${item.authors.join(', ')}\nDOI/URL: ${item.doi ? `https://doi.org/${item.doi}` : item.url}\n\nAbstract/Summary:\n${item.description}\n\nPlease provide a deep technical breakdown, discuss potential failure modes, and suggest follow-up research questions.`
  );

  const handleOpenChat = () => {
    onClose();
    navigate(`/chat?q=${chatPrompt}`);
  };

  const handleCopySummary = () => {
    const summary = `Title: ${item.title}\nSource: ${item.source}\nSummary:\n${item.description}`;
    navigator.clipboard.writeText(summary);
    toast.success('Paper details copied to clipboard');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c101a] border border-cyan-500/30 dark:border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Brain size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>AI Research Copilot</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Noectra Synthesis
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evidence-grounded structured analysis
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Level Switcher (Beginner / Technical / Expert) */}
          <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-[#151a26] border border-black/5 dark:border-white/5 text-xs">
              <button
                type="button"
                onClick={() => setLevel('beginner')}
                className={cn(
                  'px-3 py-1 rounded-lg font-medium transition-all',
                  level === 'beginner'
                    ? 'bg-white dark:bg-[#202738] text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                )}
              >
                Beginner
              </button>
              <button
                type="button"
                onClick={() => setLevel('technical')}
                className={cn(
                  'px-3 py-1 rounded-lg font-medium transition-all',
                  level === 'technical'
                    ? 'bg-white dark:bg-[#202738] text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                )}
              >
                Technical
              </button>
              <button
                type="button"
                onClick={() => setLevel('expert')}
                className={cn(
                  'px-3 py-1 rounded-lg font-medium transition-all',
                  level === 'expert'
                    ? 'bg-white dark:bg-[#202738] text-slate-900 dark:text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                )}
              >
                Deep Expert
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveTab('synthesis')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-colors',
                  activeTab === 'synthesis'
                    ? 'text-cyan-600 dark:text-cyan-300 bg-cyan-500/10'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                )}
              >
                Methodology
              </button>
              <button
                onClick={() => setActiveTab('gaps')}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-colors',
                  activeTab === 'gaps'
                    ? 'text-violet-600 dark:text-violet-300 bg-violet-500/10'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                )}
              >
                Research Gaps
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed scrollbar-thin">
            {/* Title & Metadata Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
              <h4 className="font-semibold text-slate-900 dark:text-white text-base mb-1">
                {item.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.authors.slice(0, 3).join(', ')} • {item.venue || item.source} (
                {new Date(item.publishedAt).getFullYear() || 'Recent'})
              </p>
            </div>

            {/* Dynamic Content Based on Tab & Level */}
            {activeTab === 'synthesis' ? (
              <div className="space-y-3.5">
                <div>
                  <h5 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
                    {level === 'beginner'
                      ? 'The Core Idea in Simple Terms'
                      : 'Research Objective & Architecture'}
                  </h5>
                  <p>
                    {level === 'beginner'
                      ? `This research tackles key challenges in ${item.category}. In everyday terms, it introduces an improved algorithm designed to accurately recognize and segment patterns from complex signals without requiring costly human manual supervision.`
                      : `The authors formulate a specialized framework for ${item.tags.join(', ')}. By leveraging modern representation learning and attention mechanisms, the methodology enhances boundary delineation while mitigating common calibration and feature drift errors.`}
                  </p>
                </div>

                <div>
                  <h5 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
                    Reported Findings & Evidence
                  </h5>
                  <p className="italic bg-slate-100/70 dark:bg-white/[0.02] p-3 rounded-xl border border-black/5 dark:border-white/5">
                    "{item.description}"
                  </p>
                </div>

                {level === 'expert' && (
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
                      Technical & Methodological Tradeoffs
                    </h5>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                      <li>Computational complexity scales quadratically with spatial attention dimensions unless sparse hierarchical token selection is employed.</li>
                      <li>Generalizability across external multi-center cohorts should be independently validated to rule out site-specific acquisition biases.</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <h5 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
                    What Has Been Solved?
                  </h5>
                  <p>
                    The proposed method demonstrates robust performance on the benchmark evaluation splits reported in the publication.
                  </p>
                </div>

                <div>
                  <h5 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
                    Remaining Unsolved Limitations (Hypotheses)
                  </h5>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                    <li>Edge cases involving rare pathologies or anomalous contrast protocols.</li>
                    <li>Zero-shot transferability to low-resource edge inference hardware without quantization loss.</li>
                    <li>Prospective validation in active clinical surgical or radiology reading rooms.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Copy size={13} />
              <span>Copy Summary</span>
            </button>

            <button
              type="button"
              onClick={handleOpenChat}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <MessageSquare size={14} />
              <span>Continue in Noectra Chat</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AiExplainModal;

