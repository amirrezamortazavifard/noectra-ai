import React, { useState } from 'react';
import { DictionaryPopupState, DictionaryLookupResult } from './types';
import {
  Volume2,
  Bookmark,
  Copy,
  Check,
  X,
  Sparkles,
  Loader2,
  BookOpen,
  StickyNote,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { speakTerm, TranslationEngine } from '@/lib/services/bilingualService';

interface InlineDictionaryPopupProps {
  state: DictionaryPopupState;
  currentEngine?: TranslationEngine;
  onSwitchEngine?: (engine: TranslationEngine) => void;
  onClose: () => void;
  onSaveToCards?: (result: DictionaryLookupResult) => void;
  onAddToMarginNote?: (text: string) => void;
}

export const InlineDictionaryPopup: React.FC<InlineDictionaryPopupProps> = ({
  state,
  currentEngine = 'ai',
  onSwitchEngine,
  onClose,
  onSaveToCards,
  onAddToMarginNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedToCard, setSavedToCard] = useState(false);

  const rect = state.clientRect;
  // Position tooltip directly beneath or above selection
  const popupWidth = 360;
  const top = Math.max(16, Math.min(window.innerHeight - 360, rect.bottom + 12));
  const left = Math.max(16, Math.min(window.innerWidth - popupWidth - 20, rect.left + rect.width / 2 - popupWidth / 2));

  const handleCopy = async () => {
    if (!state.result) return;
    const text = `${state.result.term} (${state.result.partOfSpeech || ''})\nDefinition: ${state.result.definition}\nTranslation: ${state.result.translation}`;
    try {
      await navigator.clipboard.writeText(text);
      soundService.play('copy');
      setCopied(true);
      toast.success('Term definition copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSaveCard = () => {
    if (!state.result) return;
    soundService.play('pop');
    onSaveToCards?.(state.result);
    setSavedToCard(true);
    toast.success(`"${state.result.term}" saved as concept card`);
    setTimeout(() => setSavedToCard(false), 2500);
  };

  const handlePronounce = () => {
    soundService.play('pop');
    speakTerm(state.term);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${popupWidth}px`,
        zIndex: 10000,
      }}
      className="animate-in fade-in zoom-in-95 duration-150 select-none text-black dark:text-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 rounded-2xl bg-white/95 dark:bg-[#0c0f16]/95 backdrop-blur-2xl border border-light-200 dark:border-white/15 shadow-2xl shadow-black/20 dark:shadow-black/70 flex flex-col space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-light-200 dark:border-white/10 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <BookOpen size={15} />
            </div>
            <h3 className="text-sm font-bold text-black/90 dark:text-white capitalize truncate max-w-[180px]">
              {state.term}
            </h3>

            {state.result?.partOfSpeech && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-light-secondary dark:bg-white/10 font-mono text-black/60 dark:text-white/60">
                {state.result.partOfSpeech}
              </span>
            )}

            {/* Audio Pronunciation */}
            <button
              type="button"
              onClick={handlePronounce}
              title="Listen to English pronunciation"
              className="p-1 rounded-md text-black/50 dark:text-white/50 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
            >
              <Volume2 size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {onSwitchEngine && (
              <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => onSwitchEngine('ai')}
                  title="Analyze with AI Model (Academic deep context)"
                  className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                    currentEngine === 'ai'
                      ? 'bg-purple-500 text-white font-medium shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Sparkles size={10} />
                  <span>AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchEngine('google')}
                  title="Translate with Google Translate (Instant neural)"
                  className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-0.5 ${
                    currentEngine === 'google'
                      ? 'bg-emerald-600 text-white font-medium shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Globe size={10} />
                  <span>Google</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {state.loading && (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 text-black/50 dark:text-white/50">
            <Loader2 size={24} className="animate-spin text-sky-500" />
            <p className="text-xs">
              {currentEngine === 'google' ? 'Fetching Google Translation...' : 'Analyzing term in scientific context with AI...'}
            </p>
          </div>
        )}

        {/* Content */}
        {!state.loading && state.result && (
          <div className="space-y-3">
            {/* Academic English Definition */}
            <div>
              <span className="text-[10px] font-semibold text-black/40 dark:text-white/40 block mb-1">
                ACADEMIC DEFINITION
              </span>
              <p className="text-xs text-black/85 dark:text-white/90 leading-relaxed">
                {state.result.definition}
              </p>
            </div>

            {/* Translation in Target Language (Persian) */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20">
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 block mb-1">
                TRANSLATION & CONTEXT
              </span>
              <p
                dir="auto"
                className="text-xs text-black/90 dark:text-amber-100 font-medium leading-relaxed"
              >
                {state.result.translation}
              </p>
            </div>

            {/* Domain Application */}
            {state.result.academicContext && (
              <div className="text-[11px] text-black/60 dark:text-white/50 italic border-l-2 pl-2 border-sky-500/40">
                Context: {state.result.academicContext}
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-light-200 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                {/* Save as Concept Card */}
                {onSaveToCards && (
                  <button
                    type="button"
                    onClick={handleSaveCard}
                    title="Save term as a flashcard in Research Canvas"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-medium transition-colors"
                  >
                    {savedToCard ? <Check size={12} className="text-emerald-500" /> : <Bookmark size={12} />}
                    <span>{savedToCard ? 'Saved' : 'Save Concept'}</span>
                  </button>
                )}

                {/* Add to Margin Note */}
                {onAddToMarginNote && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddToMarginNote(`💡 **${state.result?.term}**: ${state.result?.translation} - ${state.result?.definition}`);
                      onClose();
                    }}
                    title="Attach definition to current margin note"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-light-200 dark:hover:bg-white/10 text-black/70 dark:text-white/70 text-[11px] transition-colors"
                  >
                    <StickyNote size={12} />
                    <span>To Note</span>
                  </button>
                )}
              </div>

              {/* Copy Action */}
              <button
                type="button"
                onClick={handleCopy}
                title="Copy definition"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 text-[11px] transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
