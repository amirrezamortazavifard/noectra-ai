import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Languages,
  FileText,
  Sparkles,
  Zap,
  CheckCircle2,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { OcrPageResponse } from '@/lib/services/ocrService';

interface OcrResultPanelProps {
  isOpen: boolean;
  onClose: () => void;
  result: OcrPageResponse | null;
  pageNumber: number;
  engineName?: string;
  onSendToBilingual?: (text: string) => void;
  onSaveToNotes?: (text: string) => void;
  onAskAi?: (text: string) => void;
}

export const OcrResultPanel: React.FC<OcrResultPanelProps> = ({
  isOpen,
  onClose,
  result,
  pageNumber,
  engineName = 'Native OS Engine',
  onSendToBilingual,
  onSaveToNotes,
  onAskAi,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen || !result) return null;

  const handleCopy = () => {
    if (!result.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    soundService.play('copy');
    toast.success('OCR text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredText = searchFilter.trim()
    ? result.text
        .split('\n')
        .filter((line) => line.toLowerCase().includes(searchFilter.toLowerCase()))
        .join('\n')
    : result.text;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] z-50 bg-light-primary dark:bg-dark-primary border-l border-light-200 dark:border-white/10 shadow-2xl flex flex-col transition-transform duration-200 animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 border-b border-light-200 dark:border-white/10 flex items-center justify-between bg-light-secondary/30 dark:bg-dark-secondary/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ScanLine size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Page {pageNumber} OCR Extracted Text
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1">
                <Zap size={10} />
                {result.latencyMs}ms
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-white/50">
              {engineName} • {result.wordCount} words detected
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundService.play('tick');
            onClose();
          }}
          className="w-7 h-7 rounded-lg hover:bg-light-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 flex items-center justify-center transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Action Buttons Bar */}
      <div className="p-3 border-b border-light-200 dark:border-white/10 bg-light-primary/50 dark:bg-dark-primary/50 flex flex-wrap gap-2 items-center">
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-light-secondary dark:bg-white/10 hover:bg-light-200 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-light-200 dark:border-white/10 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy Text</span>
            </>
          )}
        </button>

        {onSendToBilingual && (
          <button
            onClick={() => {
              soundService.play('tick');
              onSendToBilingual(result.text);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
          >
            <Languages size={13} />
            <span>Translate in Bilingual</span>
          </button>
        )}

        {onSaveToNotes && (
          <button
            onClick={() => {
              soundService.play('tick');
              onSaveToNotes(result.text);
              toast.success('Added OCR text to Margin Notes');
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
          >
            <FileText size={13} />
            <span>Add to Notes</span>
          </button>
        )}

        {onAskAi && (
          <button
            onClick={() => {
              soundService.play('tick');
              onAskAi(result.text);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 dark:bg-purple-500/20 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
          >
            <Sparkles size={13} />
            <span>Ask AI</span>
          </button>
        )}
      </div>

      {/* Search Filter Input */}
      <div className="px-4 py-2 border-b border-light-200 dark:border-white/10 bg-light-secondary/10 dark:bg-dark-secondary/10">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter lines in OCR text..."
          className="w-full text-xs px-2.5 py-1.5 rounded-md bg-light-primary dark:bg-white/5 border border-light-200 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Main Text Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 select-text font-sans">
        {filteredText ? (
          <pre className="text-xs text-slate-800 dark:text-white/90 whitespace-pre-wrap font-sans leading-relaxed break-words">
            {filteredText}
          </pre>
        ) : (
          <div className="text-center py-12 text-slate-400 dark:text-white/40 text-xs">
            No matching text found.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-light-200 dark:border-white/10 bg-light-secondary/20 dark:bg-dark-secondary/20 flex items-center justify-between text-[11px] text-slate-500 dark:text-white/50">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span>Interactive text layer also rendered on page canvas</span>
        </div>
        <span>{result.lines.length} lines</span>
      </div>
    </div>
  );
};
