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
  Columns,
  List,
  AlignLeft,
  Volume2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { summarizeNote, extractConcept } from '@/lib/services/aiNoteService';
import {
  translatePageContent,
  translateSingleSection,
  speakTerm,
  TranslationEngine,
} from '@/lib/services/bilingualService';
import { isRtlLanguage } from '@/lib/services/persianTextFormatter';

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
  bilingualSegments?: ParagraphTranslation[];
  activeBilingualSectionId?: string | null;
  onHoverBilingualSection?: (id: string | null) => void;
  onClickBilingualSection?: (id: string) => void;
  onSaveConceptNote?: (quote: string, translated: string) => void;

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
  bilingualSegments,
  activeBilingualSectionId,
  onHoverBilingualSection,
  onClickBilingualSection,
  onSaveConceptNote,
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
  const [bilingualViewMode, setBilingualViewMode] = useState<'cards' | 'split' | 'flow'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expandedOriginalIds, setExpandedOriginalIds] = useState<Record<string, boolean>>({});
  const [retranslatingIds, setRetranslatingIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPairId, setCopiedPairId] = useState<string | null>(null);

  // Extract paragraphs fallback
  const extractParagraphs = (text: string): string[] => {
    if (!text.trim()) return [];
    return text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 25);
  };

  // Auto-scroll to active card when selected from PDF
  useEffect(() => {
    if (!activeBilingualSectionId || activeTab !== 'bilingual') return;
    const cardEl = document.getElementById(`bilingual-card-${activeBilingualSectionId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeBilingualSectionId, activeTab]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'bilingual') return;
    if (!pageText && (!bilingualSegments || bilingualSegments.length === 0)) return;

    const cacheKey = `pdf_trans_${meta?.title || meta?.name || 'doc'}_p${currentPage}_${targetLanguage}_${translationEngine}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedList: ParagraphTranslation[] = JSON.parse(cached);
        if (bilingualSegments && bilingualSegments.length > 0) {
          const merged = bilingualSegments.map((seg, i) => ({
            ...seg,
            translated: cachedList[i]?.translated || '',
          }));
          setTranslations(merged);
        } else {
          setTranslations(cachedList);
        }
        return;
      } catch {}
    }

    handleTranslatePage(false);
  }, [
    currentPage,
    targetLanguage,
    translationEngine,
    isOpen,
    activeTab,
    pageText,
    bilingualSegments,
  ]);

  const handleTranslatePage = async (force: boolean = false, engineOverride?: TranslationEngine) => {
    const activeEngine = engineOverride || translationEngine;
    const rawParagraphs: (string | ParagraphTranslation)[] =
      bilingualSegments && bilingualSegments.length > 0
        ? bilingualSegments
        : extractParagraphs(pageText);

    if (rawParagraphs.length === 0) {
      setTranslations([]);
      return;
    }

    const cacheKey = `pdf_trans_${meta?.title || meta?.name || 'doc'}_p${currentPage}_${targetLanguage}_${activeEngine}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedList: ParagraphTranslation[] = JSON.parse(cached);
          if (bilingualSegments && bilingualSegments.length > 0) {
            const merged = bilingualSegments.map((seg, i) => ({
              ...seg,
              translated: cachedList[i]?.translated || '',
            }));
            setTranslations(merged);
          } else {
            setTranslations(cachedList);
          }
          return;
        } catch {}
      }
    }

    try {
      setBilingualLoading(true);
      soundService.play('dispatch');
      const results = await translatePageContent(
        rawParagraphs,
        targetLanguage,
        meta?.title || meta?.name,
        activeEngine
      );
      setTranslations(results);
      localStorage.setItem(cacheKey, JSON.stringify(results));
      toast.success(
        `Translated ${results.length} sections (${activeEngine === 'google' ? 'Google Translate' : 'AI Model'})`
      );
    } catch (err: any) {
      toast.error('Failed to translate page content');
    } finally {
      setBilingualLoading(false);
    }
  };

  const handleRetranslateSection = async (item: ParagraphTranslation) => {
    try {
      setRetranslatingIds((prev) => ({ ...prev, [item.id]: true }));
      soundService.play('dispatch');
      const newTranslation = await translateSingleSection(
        item.original,
        targetLanguage,
        translationEngine,
        meta?.title || meta?.name
      );
      const updated = translations.map((t) =>
        t.id === item.id ? { ...t, translated: newTranslation } : t
      );
      setTranslations(updated);
      const cacheKey = `pdf_trans_${meta?.title || meta?.name || 'doc'}_p${currentPage}_${targetLanguage}_${translationEngine}`;
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      toast.success(`Section § ${item.index} re-translated`);
    } catch {
      toast.error('Failed to re-translate section');
    } finally {
      setRetranslatingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleCopySection = async (item: ParagraphTranslation) => {
    try {
      soundService.play('copy');
      await navigator.clipboard.writeText(item.translated);
      setCopiedId(item.id);
      toast.success(`Copied section § ${item.index}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyPair = async (item: ParagraphTranslation) => {
    try {
      soundService.play('copy');
      const text = `[Excerpt]: "${item.original}"\n\n[Translation (${targetLanguage})]:\n${item.translated}`;
      await navigator.clipboard.writeText(text);
      setCopiedPairId(item.id);
      toast.success(`Copied bilingual pair for section § ${item.index}`);
      setTimeout(() => setCopiedPairId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSpeakText = (text: string, isTrans: boolean) => {
    soundService.play('pop');
    const isRtl = isRtlLanguage(targetLanguage);
    speakTerm(text, isTrans ? (isRtl ? 'fa-IR' : 'en-US') : 'en-US');
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
          <div className="px-3.5 py-2 border-b border-light-200 dark:border-white/10 bg-light-secondary/40 dark:bg-white/[0.01] flex flex-wrap items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-1.5">
              <select
                value={targetLanguage}
                onChange={(e) => onTargetLanguageChange(e.target.value)}
                className="text-xs font-semibold py-1 px-2 rounded-lg bg-light-primary dark:bg-[#141822] border border-light-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 shadow-2xs"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#141822] text-slate-900 dark:text-white">
                    {lang.label}
                  </option>
                ))}
              </select>

              {/* Translation Engine Toggle */}
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
            </div>

            {/* View Mode & Tools */}
            <div className="flex items-center gap-1">
              {/* View Mode Toggle: Cards | Split | Flow */}
              <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setBilingualViewMode('cards')}
                  title="Cards View"
                  className={`p-1 rounded transition-colors ${
                    bilingualViewMode === 'cards'
                      ? 'bg-light-primary dark:bg-white/15 text-sky-600 dark:text-sky-400 font-semibold shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setBilingualViewMode('split')}
                  title="Side-by-Side Dual View"
                  className={`p-1 rounded transition-colors ${
                    bilingualViewMode === 'split'
                      ? 'bg-light-primary dark:bg-white/15 text-sky-600 dark:text-sky-400 font-semibold shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Columns size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setBilingualViewMode('flow')}
                  title="Continuous Article Flow"
                  className={`p-1 rounded transition-colors ${
                    bilingualViewMode === 'flow'
                      ? 'bg-light-primary dark:bg-white/15 text-sky-600 dark:text-sky-400 font-semibold shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <AlignLeft size={13} />
                </button>
              </div>

              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => setShowSearch((v) => !v)}
                title="Search translations"
                className={`p-1.5 rounded-lg border transition-colors ${
                  showSearch
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
                    : 'border-light-200 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10'
                }`}
              >
                <Search size={13} />
              </button>

              {/* Font Size */}
              <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setBilingualFontSize((s) => Math.max(11, s - 1))}
                  title="Decrease font size"
                  className="px-1.5 py-0.5 rounded text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setBilingualFontSize((s) => Math.min(20, s + 1))}
                  title="Increase font size"
                  className="px-1.5 py-0.5 rounded text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                >
                  A+
                </button>
              </div>

              {/* Retranslate */}
              <button
                type="button"
                disabled={bilingualLoading}
                onClick={() => handleTranslatePage(true)}
                title="Re-translate page"
                className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={13} className={bilingualLoading ? 'animate-spin' : ''} />
              </button>

              {/* Copy All */}
              <button
                type="button"
                onClick={async () => {
                  const text = translations.map((t) => t.translated).join('\n\n');
                  await navigator.clipboard.writeText(text);
                  setCopiedAllTrans(true);
                  toast.success('All translations copied');
                  setTimeout(() => setCopiedAllTrans(false), 2000);
                }}
                title="Copy all translations"
                className="p-1.5 rounded-lg text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
              >
                {copiedAllTrans ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Expandable Search Filter Bar */}
          {showSearch && (
            <div className="px-4 py-2 border-b border-light-200 dark:border-white/10 bg-light-primary dark:bg-[#10141e] animate-in fade-in slide-in-from-top-1">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by term in source or translation..."
                  className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-sky-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sync & Stats Status Indicator */}
          <div className="px-4 py-1.5 border-b border-light-200/60 dark:border-white/5 bg-light-primary/50 dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-black/50 dark:text-white/45 select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <span>Page {currentPage}</span>
              <span>·</span>
              <span>{translations.length} Sections</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-light-secondary dark:bg-white/5 text-slate-700 dark:text-slate-300">
              {isRtlLanguage(targetLanguage) ? 'RTL Layout Active' : 'LTR Layout'}
            </span>
          </div>

          {/* Paragraphs List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar select-text">
            {bilingualLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-center space-y-3 text-black/50 dark:text-white/50 select-none">
                <Loader2 size={32} className="animate-spin text-sky-500" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Translating Page {currentPage} into {targetLanguage}...
                </p>
                <p className="text-[11px] text-black/40 dark:text-white/40 max-w-xs">
                  {translationEngine === 'google'
                    ? 'Using neural translation for instant results'
                    : 'Using deep academic AI model for publication-grade precision'}
                </p>
              </div>
            ) : translations.length === 0 ? (
              <div className="py-24 text-center text-black/40 dark:text-white/40 select-none">
                <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No Extractable Text On This Page</p>
                <p className="text-[11px] mt-1 max-w-xs mx-auto">
                  Try running OCR if this is an image-based scanned page.
                </p>
              </div>
            ) : (
              (searchQuery.trim()
                ? translations.filter(
                    (t) =>
                      t.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.translated.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : translations
              ).map((item) => {
                const isActive = activeBilingualSectionId === item.id;
                const isRtl = isRtlLanguage(targetLanguage);
                const isExpanded = Boolean(expandedOriginalIds[item.id]);
                const isRetranslating = Boolean(retranslatingIds[item.id]);

                // 1. CARDS VIEW (Default Interactive)
                if (bilingualViewMode === 'cards') {
                  return (
                    <div
                      key={item.id}
                      id={`bilingual-card-${item.id}`}
                      onMouseEnter={() => onHoverBilingualSection?.(item.id)}
                      onMouseLeave={() => onHoverBilingualSection?.(null)}
                      onClick={() => onClickBilingualSection?.(item.id)}
                      className={`p-3.5 rounded-2xl transition-all duration-200 group relative border cursor-pointer select-text ${
                        isActive
                          ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.12] border-sky-500/70 dark:border-sky-400/80 ring-2 ring-sky-500/30 shadow-md shadow-sky-500/15 scale-[1.01]'
                          : 'bg-light-secondary/60 dark:bg-white/[0.02] border-light-200 dark:border-white/5 hover:border-sky-500/40 hover:bg-light-secondary/80 dark:hover:bg-white/[0.04] shadow-2xs'
                      }`}
                    >
                      {/* Top Bar with Badges and Section Actions */}
                      <div className="flex items-center justify-between text-[11px] pb-2 border-b border-light-200/50 dark:border-white/5 select-none gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-xs animate-pulse'
                                : 'bg-light-primary dark:bg-white/10 text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            § {item.index}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400 animate-in fade-in flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>Active Sync</span>
                            </span>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex items-center gap-0.5">
                          {/* Speak Translation */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeakText(item.translated, true);
                            }}
                            title="Listen to translation (Speech synthesis)"
                            className="p-1 rounded text-black/50 dark:text-white/50 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
                          >
                            <Volume2 size={12} />
                          </button>

                          {/* Re-translate this section only */}
                          <button
                            type="button"
                            disabled={isRetranslating}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetranslateSection(item);
                            }}
                            title="Re-translate this section only"
                            className="p-1 rounded text-black/50 dark:text-white/50 hover:text-purple-500 dark:hover:text-purple-400 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
                          >
                            <Sparkles
                              size={12}
                              className={isRetranslating ? 'animate-spin text-purple-500' : ''}
                            />
                          </button>

                          {/* Copy Translation */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySection(item);
                            }}
                            title="Copy translation text"
                            className="p-1 rounded text-black/50 dark:text-white/50 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
                          >
                            {copiedId === item.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>

                          {/* Copy Bilingual Pair */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPair(item);
                            }}
                            title="Copy bilingual pair (English & Translation for research notes)"
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-black/50 dark:text-white/50 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
                          >
                            {copiedPairId === item.id ? 'Copied' : 'Both'}
                          </button>

                          {/* Save as Concept Note */}
                          {onSaveConceptNote && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                soundService.play('pop');
                                onSaveConceptNote(item.original, item.translated);
                                toast.success(`Saved section § ${item.index} to Notes`);
                              }}
                              title="Save translation as Margin Note"
                              className="p-1 rounded text-black/50 dark:text-white/50 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
                            >
                              <StickyNote size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Original English Preview with Toggle */}
                      <div className="pt-2 select-text">
                        <div
                          dir="ltr"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedOriginalIds((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }));
                          }}
                          className="text-[11px] text-black/60 dark:text-white/50 font-sans italic border-l-2 pl-2 border-sky-400/40 hover:border-sky-400 hover:text-black dark:hover:text-white/80 transition-colors cursor-pointer group/orig"
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              "{isExpanded ? item.original : item.original.slice(0, 150) + (item.original.length > 150 ? '...' : '')}"
                            </span>
                            <span className="text-[10px] opacity-0 group-hover/orig:opacity-100 transition-opacity ml-1 shrink-0">
                              {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Translated Body */}
                      <div className="pt-2 select-text">
                        <div
                          dir={isRtl ? 'rtl' : 'ltr'}
                          style={{ fontSize: `${bilingualFontSize}px` }}
                          className={`font-normal select-text transition-colors ${
                            isRtl
                              ? 'text-right font-persian leading-[1.9] text-slate-900 dark:text-slate-100'
                              : 'text-left font-sans leading-relaxed text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.translated}
                        </div>
                      </div>
                    </div>
                  );
                }

                // 2. SPLIT DUAL-COLUMN VIEW (Side-by-Side Reading)
                if (bilingualViewMode === 'split') {
                  return (
                    <div
                      key={item.id}
                      id={`bilingual-card-${item.id}`}
                      onMouseEnter={() => onHoverBilingualSection?.(item.id)}
                      onMouseLeave={() => onHoverBilingualSection?.(null)}
                      onClick={() => onClickBilingualSection?.(item.id)}
                      className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-sky-500/[0.08] dark:bg-sky-500/[0.12] border-sky-500/70 ring-2 ring-sky-500/30'
                          : 'bg-light-secondary/60 dark:bg-white/[0.02] border-light-200 dark:border-white/5 hover:border-sky-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] pb-1.5 mb-2 border-b border-light-200/50 dark:border-white/5 text-black/50 dark:text-white/40">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-light-primary dark:bg-white/10 text-sky-600 dark:text-sky-400 font-semibold">
                          § {item.index}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySection(item);
                            }}
                            className="p-1 rounded hover:bg-light-200 dark:hover:bg-white/10"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* English Column */}
                        <div
                          dir="ltr"
                          className="text-[11px] leading-relaxed text-black/70 dark:text-white/60 border-l-2 pl-2 border-sky-400/40 select-text"
                        >
                          {item.original}
                        </div>

                        {/* Translated Column */}
                        <div
                          dir={isRtl ? 'rtl' : 'ltr'}
                          style={{ fontSize: `${bilingualFontSize}px` }}
                          className={`select-text ${
                            isRtl
                              ? 'text-right font-persian leading-[1.9] text-slate-900 dark:text-slate-100'
                              : 'text-left font-sans leading-relaxed text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {item.translated}
                        </div>
                      </div>
                    </div>
                  );
                }

                // 3. CONTINUOUS ARTICLE FLOW VIEW
                return (
                  <div
                    key={item.id}
                    id={`bilingual-card-${item.id}`}
                    onMouseEnter={() => onHoverBilingualSection?.(item.id)}
                    onMouseLeave={() => onHoverBilingualSection?.(null)}
                    onClick={() => onClickBilingualSection?.(item.id)}
                    className={`p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/[0.1] dark:bg-sky-500/[0.15] border-l-4 border-sky-500 shadow-sm'
                        : 'hover:bg-light-secondary/60 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400 font-semibold shrink-0 select-none">
                        § {item.index}
                      </span>
                      <div
                        dir={isRtl ? 'rtl' : 'ltr'}
                        style={{ fontSize: `${bilingualFontSize}px` }}
                        className={`flex-1 select-text ${
                          isRtl
                            ? 'text-right font-persian leading-[1.9] text-slate-900 dark:text-slate-100'
                            : 'text-left font-sans leading-relaxed text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {item.translated}
                      </div>
                    </div>
                  </div>
                );
              })
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
