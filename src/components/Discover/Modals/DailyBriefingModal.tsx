'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Calendar,
  Copy,
  MessageSquare,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { generateDailyBriefing } from '@/lib/services/discover/intelligenceApi';
import Markdown from 'markdown-to-jsx';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusTopics?: string[];
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  onClose,
  focusTopics,
}) => {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const loadBriefing = () => {
    setLoading(true);
    generateDailyBriefing(focusTopics)
      .then((res) => setBriefing(res))
      .catch((err) => {
        toast.error(err.message || 'Briefing generation failed');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && !briefing) {
      loadBriefing();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(briefing);
    toast.success('Briefing copied to clipboard');
  };

  const handleDiscuss = () => {
    onClose();
    const prompt = encodeURIComponent(
      `Let's analyze today's Noectra Intelligence Research Briefing:\n\n${briefing}`
    );
    navigate(`/chat?q=${prompt}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-[#0c101a] border border-cyan-500/30 dark:border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Noectra AI Daily Briefing</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Executive Radar
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Calendar size={12} />
                  <span>{new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadBriefing}
                title="Regenerate Briefing"
                className="p-2 rounded-xl text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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

          {/* Content Body */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200 scrollbar-thin">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <Loader2 size={36} className="animate-spin text-cyan-500" />
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Synthesizing global research feeds and verified papers...
                </p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:leading-relaxed">
                <Markdown>{briefing}</Markdown>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Copy size={13} />
              <span>Copy Briefing</span>
            </button>

            <button
              type="button"
              onClick={handleDiscuss}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <MessageSquare size={14} />
              <span>Discuss Briefing in Chat</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DailyBriefingModal;

