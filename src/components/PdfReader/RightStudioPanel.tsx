import React, { useState, useEffect } from 'react';
import {
  Highlight,
  HighlightColor,
  HIGHLIGHT_COLORS,
  PdfDocumentMeta,
  ParagraphTranslation,
} from './types';
import { PdfAiPanel } from './PdfAiPanel';
import {
  StickyNote,
  Languages,
  Sparkles,
  X,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { summarizeNote, extractConcept } from '@/lib/services/aiNoteService';
import { translatePageContent, TranslationEngine } from '@/lib/services/bilingualService';

export type StudioTab = 'notes' | 'bilingual' | 'ai';

interface RightStudioPanelProps {
  isOpen: boolean;
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  onClose: () => void;

  // Document metadata
  meta: PdfDocumentMeta | null;
  currentPage: number;
  totalPages: number;

  // Notes tab props
  highlights: Highlight[];
  activeNoteId?: string | null;
  onSelectNote: (id: string | null) => void;
  onUpdateNote: (id: string, note: string) => void;
  onHighlightDelete: (id: string) => void;
  onAskAiAboutExcerpt: (quote: string, note?: string) => void;

  // Bilingual tab props
  pageText: string;
  targetLanguage: string;
  onTargetLanguageChange: (lang: string) => void;

  // AI Assistant tab props
  activeExcerpt: string | null;
  onClearExcerpt: () => void;
  initialPrompt?: string;
  onJumpToCitation?: (pageNumber: number, quote?: string) => void;
  isIndexed?: boolean;
  indexingProgress?: { pct: number; status: string } | null;
  onReindex?: () => void;
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

export const RightStudioPanel: React.FC<RightStudioPanelProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  meta,
  currentPage,
  totalPages,
  highlights,
  activeNoteId,
  onSelectNote,
  onUpdateNote,
  onHighlightDelete,
  onAskAiAboutExcerpt,
  pageText,
  targetLanguage,
  onTargetLanguageChange,
  activeExcerpt,
  onClearExcerpt,
  initialPrompt,
  onJumpToCitation,
  isIndexed,
  indexingProgress,
  onReindex,
}) => {
  // --- Notes State ---
  const [editingNoteText, setEditingNoteText] = useState<{ [id: string]: string }>({});
  const [isAiProcessing, setIsAiProcessing] = useState<{ [id: string]: boolean }>({});
  const [expandAllNotes, setExpandAllNotes] = useState(false);

  useEffect(() => {
    const textMap: { [id: string]: string } = {};
    for (const h of highlights) {
      textMap[h.id] = h.note || '';
    }
    setEditingNoteText(textMap);
  }, [highlights]);

  // --- Bilingual State ---
  const [translations, setTranslations] = useState<ParagraphTranslation[]>([]);
  const [bilingualLoading, setBilingualLoading] = useState(false);
  const [bilingualFontSize, setBilingualFontSize] = useState<number>(13);
  const [copiedAllTrans, setCopiedAllTrans] = useState(false);
  const [translationEngine, setTranslationEngine] = useState<TranslationEngine>(
    () => (localStorage.getItem('pdf_translation_engine') as TranslationEngine) || 'ai'
  );

  // Extract paragraphs
  const extractParagraphs = (text: string): string[] => {
    if (!text.trim()) return [];
    return text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 25);
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'bilingual' || !pageText) return;

    const cacheKey = `pdf_trans_${meta?.title || meta?.name || 'doc'}_p${currentPage}_${targetLanguage}_${translationEngine}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setTranslations(JSON.parse(cached));
        return;
      } catch {}
    }

    handleTranslatePage(false);
  }, [currentPage, targetLanguage, translationEngine, isOpen, activeTab, pageText]);

  const handleTranslatePage = async (force: boolean = false, engineOverride?: TranslationEngine) => {
    const activeEngine = engineOverride || translationEngine;
    const paragraphs = extractParagraphs(pageText);
    if (paragraphs.length === 0) {
      setTranslations([]);
      return;
    }

    const cacheKey = `pdf_trans_${meta?.title || meta?.name || 'doc'}_p${currentPage}_${targetLanguage}_${activeEngine}`;
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
      setBilingualLoading(true);
      soundService.play('dispatch');
      const results = await translatePageContent(
        paragraphs,
        targetLanguage,
        meta?.title || meta?.name,
        activeEngine
      );
      setTranslations(results);
      localStorage.setItem(cacheKey, JSON.stringify(results));
      toast.success(
        `Translated Page ${currentPage} (${activeEngine === 'google' ? 'Google Translate' : 'AI Model'})`
      );
    } catch (err: any) {
      toast.error('Failed to translate page');
    } finally {
      setBilingualLoading(false);
    }
  };



  // --- Handlers for Notes ---
  const handleNoteChange = (id: string, text: string) => {
    setEditingNoteText((prev) => ({ ...prev, [id]: text }));
    onUpdateNote(id, text);
  };

  const handleSummarizeNote = async (hl: Highlight) => {
    try {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: true }));
      soundService.play('dispatch');
      toast.loading('AI summarizing note...', { id: `sum-${hl.id}` });
      const summary = await summarizeNote(hl.text, editingNoteText[hl.id] || hl.note);
      const updated = editingNoteText[hl.id]
        ? `${editingNoteText[hl.id]}\n\n⚡ **Summary**: ${summary}`
        : `⚡ **Summary**: ${summary}`;
      handleNoteChange(hl.id, updated);
      toast.success('Summary added to note', { id: `sum-${hl.id}` });
    } catch {
      toast.error('Failed to summarize note', { id: `sum-${hl.id}` });
    } finally {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: false }));
    }
  };

  const handleExtractConcept = async (hl: Highlight) => {
    try {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: true }));
      soundService.play('dispatch');
      toast.loading('Extracting concept...', { id: `con-${hl.id}` });
      const concept = await extractConcept(hl.text);
      const updated = editingNoteText[hl.id]
        ? `${editingNoteText[hl.id]}\n\n💡 ${concept}`
        : `💡 ${concept}`;
      handleNoteChange(hl.id, updated);
      toast.success('Concept extracted into note', { id: `con-${hl.id}` });
    } catch {
      toast.error('Failed to extract concept', { id: `con-${hl.id}` });
    } finally {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: false }));
    }
  };

  if (!isOpen) return null;

  const pageHighlights = highlights.filter((h) => h.pageNumber === currentPage);
  const sortedHighlights = [...pageHighlights].sort((a, b) => {
    const yA = a.anchorY !== undefined ? a.anchorY : (a.rects?.[0]?.y ?? 0) * 100;
    const yB = b.anchorY !== undefined ? b.anchorY : (b.rects?.[0]?.y ?? 0) * 100;
    return yA - yB;
  });

  return (
    <aside className="w-[390px] sm:w-[430px] lg:w-[460px] h-full border-l border-light-200 dark:border-white/10 bg-light-primary/95 dark:bg-[#0c0f16]/95 backdrop-blur-2xl flex flex-col z-20 shrink-0 select-none transition-all shadow-2xl">
      {/* Top Segmented Studio Controller */}
      <div className="h-14 px-3 border-b border-light-200 dark:border-white/10 bg-light-secondary/50 dark:bg-white/[0.02] flex items-center justify-between gap-2 shrink-0">
        {/* Segmented Pills */}
        <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-xl p-0.5">
          {/* Notes Tab */}
          <button
            type="button"
            onClick={() => onTabChange('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'notes'
                ? 'bg-light-primary dark:bg-white/15 text-amber-600 dark:text-amber-400 shadow-xs border border-light-200 dark:border-transparent'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            <StickyNote size={13} />
            <span>Notes</span>
            {pageHighlights.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 font-mono">
                {pageHighlights.length}
              </span>
            )}
          </button>

          {/* Bilingual Tab */}
          <button
            type="button"
            onClick={() => onTabChange('bilingual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'bilingual'
                ? 'bg-light-primary dark:bg-white/15 text-emerald-600 dark:text-emerald-400 shadow-xs border border-light-200 dark:border-transparent'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            <Languages size={13} />
            <span>Bilingual</span>
          </button>

          {/* AI Assistant Tab */}
          <button
            type="button"
            onClick={() => onTabChange('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-light-primary dark:bg-white/15 text-purple-600 dark:text-purple-400 shadow-xs border border-light-200 dark:border-transparent'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            <span>AI Chat</span>
          </button>
        </div>

        {/* Close Button (Zen Mode) */}
        <button
          type="button"
          onClick={onClose}
          title="Collapse Studio (Focus Zen Mode)"
          className="p-2 rounded-xl text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ==================== TAB 1: NOTES ==================== */}
      {activeTab === 'notes' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar select-text">
          <div className="flex items-center justify-between pb-1 text-xs text-black/60 dark:text-white/60 select-none">
            <span className="font-semibold text-black/90 dark:text-white">
              Page {currentPage} Annotations ({sortedHighlights.length})
            </span>
            {sortedHighlights.length > 0 && (
              <button
                type="button"
                onClick={() => setExpandAllNotes((v) => !v)}
                className="text-[11px] hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                {expandAllNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{expandAllNotes ? 'Collapse' : 'Expand All'}</span>
              </button>
            )}
          </div>

          {sortedHighlights.length === 0 ? (
            <div className="py-16 text-center text-black/40 dark:text-white/40 select-none">
              <StickyNote size={32} className="mx-auto mb-2 opacity-30 text-amber-500" />
              <p className="text-xs font-medium text-black/70 dark:text-white/70">
                No Notes on Page {currentPage}
              </p>
              <p className="text-[11px] mt-1 max-w-xs mx-auto leading-relaxed">
                Select any text in the PDF and click <span className="text-amber-500 font-semibold">"Note"</span> to anchor margin thoughts directly here.
              </p>
            </div>
          ) : (
            sortedHighlights.map((hl) => {
              const colorDef = HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow;
              const isExpanded = expandAllNotes || activeNoteId === hl.id;
              const hasNote = Boolean(editingNoteText[hl.id]?.trim());

              return (
                <div
                  key={hl.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'bg-white dark:bg-[#111622] shadow-xl shadow-black/10 dark:shadow-black/60 ring-1'
                      : 'bg-white/80 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] border-light-200 dark:border-white/5'
                  }`}
                  style={{ borderColor: isExpanded ? colorDef.border : undefined }}
                >
                  {/* Note Header */}
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer select-none"
                    onClick={() => onSelectNote(isExpanded ? null : hl.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: colorDef.preview }}
                      />
                      <span className="text-[11px] font-mono font-medium text-black/60 dark:text-white/60">
                        Line Callout · p.{hl.pageNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onHighlightDelete(hl.id)}
                        className="p-1 rounded hover:bg-rose-500/20 text-black/30 dark:text-white/30 hover:text-rose-500 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectNote(isExpanded ? null : hl.id)}
                        className="p-1 rounded text-black/40 dark:text-white/40"
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Quoted Text */}
                  <div className="px-3 pb-2">
                    <p
                      className="text-[11px] text-black/70 dark:text-white/70 italic line-clamp-2 pl-2 border-l-2 py-0.5"
                      style={{ borderColor: colorDef.border }}
                    >
                      "{hl.text}"
                    </p>
                  </div>

                  {/* Collapsed Snippet */}
                  {!isExpanded && hasNote && (
                    <div
                      className="px-3 pb-3 cursor-pointer"
                      onClick={() => onSelectNote(hl.id)}
                    >
                      <p className="text-xs text-black/90 dark:text-white/90 line-clamp-2 bg-light-secondary/60 dark:bg-white/[0.02] p-2 rounded-xl border border-light-200 dark:border-white/5 font-sans leading-relaxed">
                        {editingNoteText[hl.id]}
                      </p>
                    </div>
                  )}

                  {/* Expanded Note Editor */}
                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-2 border-t border-light-200 dark:border-white/5 mt-1">
                      <textarea
                        rows={3}
                        value={editingNoteText[hl.id] || ''}
                        onChange={(e) => handleNoteChange(hl.id, e.target.value)}
                        placeholder="Write analysis, observations, or synthesis..."
                        className="w-full mt-2 p-2.5 text-xs rounded-xl bg-light-secondary/80 dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/30 focus:outline-none focus:border-sky-500 font-sans resize-y custom-scrollbar"
                        autoFocus
                      />

                      {/* AI Quick Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 select-none">
                        <button
                          type="button"
                          disabled={isAiProcessing[hl.id]}
                          onClick={() => handleSummarizeNote(hl)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium border border-amber-500/20 transition-colors"
                        >
                          {isAiProcessing[hl.id] ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Sparkles size={11} />
                          )}
                          <span>Summarize</span>
                        </button>

                        <button
                          type="button"
                          disabled={isAiProcessing[hl.id]}
                          onClick={() => handleExtractConcept(hl)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-medium border border-sky-500/20 transition-colors"
                        >
                          <Lightbulb size={11} />
                          <span>Concept</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onAskAiAboutExcerpt(hl.text, editingNoteText[hl.id]);
                            onTabChange('ai');
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-medium border border-purple-500/20 transition-colors ml-auto"
                        >
                          <MessageSquare size={11} />
                          <span>Ask AI</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================== TAB 2: BILINGUAL ==================== */}
      {activeTab === 'bilingual' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-toolbar */}
          <div className="px-4 py-2 border-b border-light-200 dark:border-white/10 bg-light-secondary/40 dark:bg-white/[0.01] flex items-center justify-between gap-2 select-none">
            <select
              value={targetLanguage}
              onChange={(e) => onTargetLanguageChange(e.target.value)}
              className="text-xs font-medium py-1 px-2 rounded-lg bg-light-primary dark:bg-[#141822] border border-light-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#141822] text-slate-900 dark:text-white">
                  {lang.label}
                </option>
              ))}
            </select>

            {/* Translation Engine Toggle: AI Model vs Google Translate */}
            <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setTranslationEngine('ai');
                  localStorage.setItem('pdf_translation_engine', 'ai');
                  handleTranslatePage(true, 'ai');
                }}
                title="Translate with active AI Model (Deep context-aware academic quality)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all ${
                  translationEngine === 'ai'
                    ? 'bg-purple-500 text-white font-semibold shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                <Sparkles size={11} />
                <span>AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranslationEngine('google');
                  localStorage.setItem('pdf_translation_engine', 'google');
                  handleTranslatePage(true, 'google');
                }}
                title="Translate with Google Translate (Instant neural translation)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all ${
                  translationEngine === 'google'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
              >
                <Globe size={11} />
                <span>Google</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setBilingualFontSize((s) => Math.max(11, s - 1))}
                  className="px-1.5 py-0.5 rounded text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setBilingualFontSize((s) => Math.min(18, s + 1))}
                  className="px-1.5 py-0.5 rounded text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                >
                  A+
                </button>
              </div>

              <button
                type="button"
                disabled={bilingualLoading}
                onClick={() => handleTranslatePage(true)}
                title="Re-translate page"
                className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={13} className={bilingualLoading ? 'animate-spin' : ''} />
              </button>

              <button
                type="button"
                onClick={async () => {
                  const text = translations.map((t) => t.translated).join('\n\n');
                  await navigator.clipboard.writeText(text);
                  setCopiedAllTrans(true);
                  toast.success('Translations copied');
                  setTimeout(() => setCopiedAllTrans(false), 2000);
                }}
                title="Copy all translations"
                className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
              >
                {copiedAllTrans ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Paragraphs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar select-text">
            {bilingualLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-2 text-black/50 dark:text-white/50 select-none">
                <Loader2 size={28} className="animate-spin text-sky-500" />
                <p className="text-xs font-medium">
                  Translating Page {currentPage} into {targetLanguage} ({translationEngine === 'google' ? 'Google Translate' : 'AI Model'})...
                </p>
              </div>
            ) : translations.length === 0 ? (
              <div className="py-20 text-center text-black/40 dark:text-white/40 select-none">
                <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No Extractable Text On This Page</p>
              </div>
            ) : (
              translations.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-light-secondary/60 dark:bg-white/[0.02] border border-light-200 dark:border-white/5 hover:border-sky-500/30 transition-all space-y-2 group shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-black/40 dark:text-white/40 select-none">
                    <span className="font-mono px-1.5 py-0.5 rounded bg-light-primary dark:bg-white/10 text-sky-600 dark:text-sky-400 font-medium">
                      § {item.index}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.translated);
                        toast.success(`Copied paragraph ${item.index}`);
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-light-200 dark:hover:bg-white/10 text-black/60 dark:text-white/60"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                  <p className="text-[11px] text-black/50 dark:text-white/40 italic line-clamp-2 border-l-2 pl-2 border-light-300 dark:border-white/20">
                    "{item.original}"
                  </p>
                  <div
                    dir="auto"
                    style={{ fontSize: `${bilingualFontSize}px` }}
                    className="text-black/90 dark:text-white/95 leading-relaxed font-sans"
                  >
                    {item.translated}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: AI ASSISTANT ==================== */}
      {activeTab === 'ai' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <PdfAiPanel
            isOpen={isOpen && activeTab === 'ai'}
            meta={meta}
            currentPage={currentPage}
            pageText={pageText}
            activeExcerpt={activeExcerpt}
            onClearExcerpt={onClearExcerpt}
            onClose={onClose}
            initialPrompt={initialPrompt}
            onJumpToCitation={onJumpToCitation}
            isIndexed={isIndexed}
            indexingProgress={indexingProgress}
            onReindex={onReindex}
          />
        </div>
      )}
    </aside>
  );
};
