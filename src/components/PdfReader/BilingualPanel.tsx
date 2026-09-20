import React, { useState, useEffect } from 'react';
import { ParagraphTranslation } from './types';
import {
  Languages,
  RotateCcw,
  Copy,
  Check,
  X,
  StickyNote,
  Sparkles,
  Loader2,
  ChevronDown,
  BookOpen,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { translatePageContent } from '@/lib/services/bilingualService';

interface BilingualPanelProps {
  isOpen: boolean;
  currentPage: number;
  totalPages: number;
  documentTitle?: string;
  pageText: string;
  targetLanguage: string;
  onTargetLanguageChange: (lang: string) => void;
  onClose: () => void;
  onAddMarginNote?: (text: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'Persian', label: 'Persian (فارسی)' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'French', label: 'French (Français)' },
  { code: 'German', label: 'German (Deutsch)' },
  { code: 'Chinese', label: 'Chinese (中文)' },
  { code: 'Arabic', label: 'Arabic (العربية)' },
  { code: 'Turkish', label: 'Turkish (Türkçe)' },
  { code: 'Russian', label: 'Russian (Русский)' },
];

export const BilingualPanel: React.FC<BilingualPanelProps> = ({
  isOpen,
  currentPage,
  totalPages,
  documentTitle,
  pageText,
  targetLanguage,
  onTargetLanguageChange,
  onClose,
  onAddMarginNote,
}) => {
  const [translations, setTranslations] = useState<ParagraphTranslation[]>([]);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState<number>(13);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedParaId, setCopiedParaId] = useState<string | null>(null);

  // Extract paragraphs from pageText
  const extractParagraphs = (text: string): string[] => {
    if (!text.trim()) return [];
    return text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 25);
  };

  // Run or load translation when pageText, currentPage or targetLanguage changes
  useEffect(() => {
    if (!isOpen || !pageText) return;

    const cacheKey = `pdf_trans_${documentTitle || 'doc'}_p${currentPage}_${targetLanguage}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setTranslations(JSON.parse(cached));
        return;
      } catch {}
    }

    // Trigger fresh translation
    handleTranslate(false);
  }, [currentPage, targetLanguage, isOpen, pageText]);

  const handleTranslate = async (force: boolean = false) => {
    const paragraphs = extractParagraphs(pageText);
    if (paragraphs.length === 0) {
      setTranslations([]);
      return;
    }

    const cacheKey = `pdf_trans_${documentTitle || 'doc'}_p${currentPage}_${targetLanguage}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setTranslations(JSON.parse(cached));
          return;
        } catch {}
      }
    }

    try {
      setLoading(true);
      soundService.play('dispatch');
      const results = await translatePageContent(paragraphs, targetLanguage, documentTitle);
      setTranslations(results);
      localStorage.setItem(cacheKey, JSON.stringify(results));
      toast.success(`Translated Page ${currentPage} into ${targetLanguage}`);
    } catch (err: any) {
      console.error('Translation error:', err);
      toast.error('Failed to translate page. Check AI model configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (translations.length === 0) return;
    const text = translations
      .map((t) => `[Paragraph ${t.index}]\n${t.translated}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(text);
      soundService.play('copy');
      setCopiedAll(true);
      toast.success('All translations copied to clipboard');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyParagraph = async (t: ParagraphTranslation) => {
    try {
      await navigator.clipboard.writeText(t.translated);
      soundService.play('copy');
      setCopiedParaId(t.id);
      toast.success(`Paragraph ${t.index} translation copied`);
      setTimeout(() => setCopiedParaId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-[420px] lg:w-[480px] h-full border-l border-light-200 dark:border-white/10 bg-light-primary/95 dark:bg-[#0a0d14]/95 backdrop-blur-xl flex flex-col z-20 shrink-0 select-text transition-all">
      {/* Top Toolbar */}
      <div className="p-3 border-b border-light-200 dark:border-white/10 bg-light-secondary/60 dark:bg-white/[0.02] flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Languages size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-black/90 dark:text-white truncate">
              Bilingual Reader
            </h3>
            <span className="text-[10px] text-black/50 dark:text-white/40 font-mono">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {/* Target Language Dropdown */}
          <select
            value={targetLanguage}
            onChange={(e) => onTargetLanguageChange(e.target.value)}
            className="text-xs font-medium py-1 px-2 rounded-lg bg-light-primary dark:bg-[#141822] border border-light-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-colors cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#141822] text-slate-900 dark:text-white">
                {lang.label}
              </option>
            ))}
          </select>

          {/* Font Size Adjusters */}
          <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              className="px-1.5 py-0.5 rounded text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              title="Decrease font size"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(18, s + 1))}
              className="px-1.5 py-0.5 rounded text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              title="Increase font size"
            >
              A+
            </button>
          </div>

          {/* Refresh / Re-translate */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleTranslate(true)}
            title="Re-translate this page"
            className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Copy All */}
          <button
            type="button"
            onClick={handleCopyAll}
            title="Copy all translations on this page"
            className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
          >
            {copiedAll ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          {/* Close Panel */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Paragraphs Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Loading Spinner Skeleton */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 text-black/50 dark:text-white/50">
            <Loader2 size={32} className="animate-spin text-sky-500" />
            <p className="text-xs font-medium">Translating Page {currentPage} into {targetLanguage}...</p>
            <p className="text-[11px] text-black/40 dark:text-white/40">
              Generating academic translation preserving mathematical premises and scientific context.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && translations.length === 0 && (
          <div className="py-16 flex flex-col items-center justify-center text-center text-black/40 dark:text-white/40 space-y-2">
            <BookOpen size={32} className="opacity-40" />
            <p className="text-xs font-semibold">No Extractable Text On Page {currentPage}</p>
            <p className="text-[11px] max-w-xs leading-relaxed">
              This page might contain image-only scans or diagrams without an embedded text layer.
            </p>
            <button
              type="button"
              onClick={() => handleTranslate(true)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium"
            >
              Retry Translation
            </button>
          </div>
        )}

        {/* List of Paragraph Cards */}
        {!loading &&
          translations.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-light-secondary/60 dark:bg-white/[0.02] border border-light-200 dark:border-white/5 hover:border-sky-500/30 transition-all space-y-2.5 group shadow-xs"
            >
              {/* Card Meta & Actions Header */}
              <div className="flex items-center justify-between text-[10px] text-black/40 dark:text-white/40 select-none">
                <span className="font-mono px-1.5 py-0.5 rounded bg-light-primary dark:bg-white/10 font-medium text-sky-600 dark:text-sky-400">
                  § {item.index}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Copy Paragraph */}
                  <button
                    type="button"
                    onClick={() => handleCopyParagraph(item)}
                    title="Copy translation"
                    className="p-1 rounded hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {copiedParaId === item.id ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>

                  {/* Add to Margin Note */}
                  {onAddMarginNote && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddMarginNote(`🌐 [Translation - §${item.index}]:\n${item.translated}`);
                        toast.success(`Paragraph ${item.index} translation added to margin note`);
                      }}
                      title="Send this translation into a margin note"
                      className="p-1 rounded hover:bg-light-200 dark:hover:bg-white/10 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                    >
                      <StickyNote size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Original Excerpt (Collapsed/Subtle) */}
              <p className="text-[11px] text-black/50 dark:text-white/40 italic line-clamp-2 leading-relaxed border-l-2 pl-2 border-light-300 dark:border-white/20">
                "{item.original}"
              </p>

              {/* Translated Text in Target Language */}
              <div
                dir="auto"
                style={{ fontSize: `${fontSize}px` }}
                className="text-black/90 dark:text-white/95 leading-relaxed font-sans font-normal"
              >
                {item.translated}
              </div>
            </div>
          ))}
      </div>
    </aside>
  );
};
