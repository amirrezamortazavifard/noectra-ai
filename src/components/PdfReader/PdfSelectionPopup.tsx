import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Languages,
  Volume2,
  Gauge,
} from 'lucide-react';
import { HighlightColor, HIGHLIGHT_COLORS, TextSelectionInfo } from './types';
import { toast } from 'sonner';

interface PdfSelectionPopupProps {
  selection: TextSelectionInfo;
  onHighlight: (color: HighlightColor) => void;
  onAskAi: (prompt?: string) => void;
  onReadAloud?: (text: string) => void;
  onSpeedRead?: (text: string) => void;
  onDismiss: () => void;
}

export const PdfSelectionPopup: React.FC<PdfSelectionPopupProps> = ({
  selection,
  onHighlight,
  onAskAi,
  onReadAloud,
  onSpeedRead,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy text');
    }
  };

  const handleHighlightClick = (color: HighlightColor, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedColor(color);
    onHighlight(color);
  };

  // Calculate popup position (centered horizontally above or below selection)
  const rect = selection.clientRect;
  const top = Math.max(12, rect.top - 54);
  const left = Math.max(16, Math.min(window.innerWidth - 340, rect.left + rect.width / 2 - 160));

  return (
    <div
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: 9999,
      }}
      className="animate-in fade-in zoom-in-95 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/95 dark:bg-[#0f131a]/95 backdrop-blur-xl border border-light-200 dark:border-white/15 shadow-2xl shadow-black/15 dark:shadow-black/60 text-black dark:text-white text-xs">
        {/* Colors */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-light-200 dark:border-white/10">
          {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((color) => {
            const info = HIGHLIGHT_COLORS[color];
            return (
              <button
                key={color}
                type="button"
                onClick={(e) => handleHighlightClick(color, e)}
                title={`Highlight with ${info.name}`}
                className="w-5 h-5 rounded-full transition-transform hover:scale-125 focus:outline-none flex items-center justify-center p-0.5"
                style={{ backgroundColor: info.preview }}
              >
                {selectedColor === color && (
                  <div className="w-1.5 h-1.5 rounded-full bg-black/60" />
                )}
              </button>
            );
          })}
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy selected text"
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-light-200 dark:hover:bg-white/10 text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        {/* Ask AI Button */}
        <button
          type="button"
          onClick={() => onAskAi()}
          title="Ask AI about this selection"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium shadow-md shadow-sky-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles size={13} className="text-amber-300 animate-pulse" />
          <span>Ask AI</span>
        </button>

        {/* Explain Action */}
        <button
          type="button"
          onClick={() => onAskAi('Explain this excerpt clearly and simply:')}
          title="Explain this excerpt"
          className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
        >
          <BookOpen size={13} />
        </button>

        {/* Translate Action */}
        <button
          type="button"
          onClick={() => onAskAi('Translate this excerpt clearly and accurately into English:')}
          title="Translate text"
          className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
        >
          <Languages size={13} />
        </button>

        {/* Read Aloud TTS Action */}
        {onReadAloud && (
          <button
            type="button"
            onClick={() => onReadAloud(selection.text)}
            title="Read aloud (TTS Narration)"
            className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
          >
            <Volume2 size={13} />
          </button>
        )}

        {/* Speed Read RSVP Action */}
        {onSpeedRead && (
          <button
            type="button"
            onClick={() => onSpeedRead(selection.text)}
            title="Speed Read (RSVP)"
            className="p-1.5 rounded-lg hover:bg-light-200 dark:hover:bg-white/10 text-black/70 dark:text-white/70 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
          >
            <Gauge size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
