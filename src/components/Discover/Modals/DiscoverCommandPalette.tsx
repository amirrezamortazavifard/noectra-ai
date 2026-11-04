'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  BookOpen,
  Newspaper,
  Layers,
  Radio,
  ArrowRight,
  X,
  Star,
  Activity,
} from 'lucide-react';
import { MEDICAL_CV_TAXONOMY, DISCOVERY_STORY_TOPICS } from '@/lib/services/discover/taxonomy';
import { cn } from '@/lib/utils';

interface DiscoverCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (type: 'topic' | 'source' | 'mode' | 'query', value: string) => void;
}

export const DiscoverCommandPalette: React.FC<DiscoverCommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle palette
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTopics = MEDICAL_CV_TAXONOMY.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.keywords.some((kw) => kw.toLowerCase().includes(query.toLowerCase()))
  );

  const viewModes = [
    { key: 'for_you', label: 'For You Feed', icon: '✨', desc: 'Personalized intelligence mix' },
    { key: 'latest', label: 'Latest Feed', icon: '⚡', desc: 'Chronological research stream' },
    { key: 'following', label: 'Following Feed', icon: '⭐', desc: 'Only your followed research topics' },
    { key: 'high_signal', label: 'High Signal', icon: '📡', desc: 'Top-tier breakthroughs and peer-reviewed work' },
    { key: 'research_only', label: 'Academic Papers Only', icon: '🎓', desc: 'Preprints and journal literature' },
    { key: 'saved', label: 'Saved Bookmarks', icon: '🔖', desc: 'Your saved library' },
    { key: 'queue', label: 'Reading Queue', icon: '📚', desc: 'Articles queued for study' },
  ];

  const filteredModes = viewModes.filter((m) =>
    m.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#0e121b] border border-cyan-500/30 dark:border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Search Input Bar */}
          <div className="relative flex items-center px-4 py-3.5 border-b border-slate-200/80 dark:border-white/10">
            <Search size={18} className="text-cyan-500 mr-3 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Jump to topic, research domain, or view mode (e.g. Radiology, SAM, Following)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  onSelectAction('query', query.trim());
                  onClose();
                }
              }}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* List Options */}
          <div className="max-h-80 overflow-y-auto p-3 space-y-4 text-xs scrollbar-thin">
            {/* Direct Search Option */}
            {query.trim() && (
              <div
                onClick={() => {
                  onSelectAction('query', query.trim());
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 cursor-pointer border border-cyan-500/25 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-cyan-500" />
                  <span className="font-semibold">Search all feeds for: "{query}"</span>
                </div>
                <ArrowRight size={13} />
              </div>
            )}

            {/* View Modes */}
            {filteredModes.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1.5 tracking-wider">
                  View Modes
                </p>
                <div className="space-y-1">
                  {filteredModes.map((mode) => (
                    <div
                      key={mode.key}
                      onClick={() => {
                        onSelectAction('mode', mode.key);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{mode.icon}</span>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {mode.label}
                          </p>
                          <p className="text-[10px] text-slate-400">{mode.desc}</p>
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {filteredTopics.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1.5 tracking-wider">
                  Medical AI & Computer Vision Topics
                </p>
                <div className="space-y-1">
                  {filteredTopics.slice(0, 8).map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => {
                        onSelectAction('topic', topic.name);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{topic.icon}</span>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {topic.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-sm">
                            {topic.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={12} className="text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="px-4 py-2 border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Press Enter to select</span>
            <span>ESC to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DiscoverCommandPalette;

