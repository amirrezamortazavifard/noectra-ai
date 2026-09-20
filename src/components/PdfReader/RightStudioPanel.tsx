import React, { useState, useEffect, useRef } from 'react';
import {
  Highlight,
  HighlightColor,
  HIGHLIGHT_COLORS,
  PdfDocumentMeta,
  ParagraphTranslation,
  AiChatMessage,
} from './types';
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
  Send,
  Bot,
  User,
  Quote,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { summarizeNote, extractConcept } from '@/lib/services/aiNoteService';
import { translatePageContent } from '@/lib/services/bilingualService';
import { searchDocument, formatRagContextForPrompt } from '@/lib/rag/ragEngine';
import Markdown from 'markdown-to-jsx';

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

    const cacheKey = `pdf_trans_${meta?.title || meta?.name || 'doc'}_p${currentPage}_${targetLanguage}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setTranslations(JSON.parse(cached));
        return;
      } catch {}
    }

    handleTranslatePage(false);
  }, [currentPage, targetLanguage, isOpen, activeTab, pageText]);

  const handleTranslatePage = async (force: boolean = false) => {
    const paragraphs = extractParagraphs(pageText);
    if (paragraphs.length === 0) {
      setTranslations([]);
      return;
    }

    const cacheKey = `pdf_trans_${meta?.title || meta?.name || 'doc'}_p${currentPage}_${targetLanguage}`;
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
      const results = await translatePageContent(paragraphs, targetLanguage, meta?.title || meta?.name);
      setTranslations(results);
      localStorage.setItem(cacheKey, JSON.stringify(results));
      toast.success(`Translated Page ${currentPage}`);
    } catch (err: any) {
      toast.error('Failed to translate page');
    } finally {
      setBilingualLoading(false);
    }
  };

  // --- AI Chat State ---
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (meta?.id) {
      const saved = localStorage.getItem(`pdf_chat_${meta.id}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  }, [meta?.id]);

  useEffect(() => {
    if (meta?.id && messages.length > 0 && !aiLoading) {
      const cleanMessages = messages.map((m) => ({ ...m, isStreaming: false }));
      localStorage.setItem(`pdf_chat_${meta.id}`, JSON.stringify(cleanMessages));
    }
  }, [messages, aiLoading, meta?.id]);

  useEffect(() => {
    if (activeTab === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, aiLoading, activeTab]);

  useEffect(() => {
    if (initialPrompt && isOpen && activeTab === 'ai') {
      handleSendAiMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendAiMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || aiInput).trim();
    if (!textToSend && !activeExcerpt) return;

    const userMessageContent = textToSend || 'Please explain this selected excerpt from the PDF.';
    const excerptToUse = activeExcerpt || undefined;

    const userMsg: AiChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageContent,
      excerpt: excerptToUse,
      pageNumber: currentPage,
      timestamp: Date.now(),
    };

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: AiChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setAiInput('');
    setAiLoading(true);
    soundService.play('dispatch');

    try {
      const chatModel = localStorage.getItem('chatModelKey');
      const chatModelProvider = localStorage.getItem('chatModelProviderId');

      let fullPrompt = '';
      if (meta?.title || meta?.name) {
        fullPrompt += `[Context: Document "${meta.title || meta.name}", Page ${currentPage}]\n\n`;
      }
      if (excerptToUse) {
        fullPrompt += `[Selected Excerpt from Page ${currentPage}]:\n"${excerptToUse}"\n\n`;
      } else if (meta?.id) {
        try {
          const ragResults = await searchDocument(meta.id, userMessageContent, 4);
          if (ragResults && ragResults.length > 0) {
            fullPrompt += formatRagContextForPrompt(ragResults);
          }
        } catch {}
      }
      fullPrompt += `\n[User Question]:\n${userMessageContent}\n\n[Instruction]: Provide clear, grounded answers with citations like [Page X] where appropriate.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fullPrompt,
          message: {
            messageId: userMsg.id,
            chatId: 'pdf-assistant-session',
            content: fullPrompt,
          },
          chatId: 'pdf-assistant-session',
          history: messages.map((m) => [m.role, m.content]),
          chatModel: {
            providerId: chatModelProvider,
            key: chatModel,
          },
        }),
      });

      if (!res.ok) throw new Error(`Chat API error: ${res.statusText}`);

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === 'message' && data.data) {
                accumulatedContent += data.data;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: accumulatedContent, isStreaming: true }
                      : msg
                  )
                );
              }
            } catch {
              accumulatedContent += line;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedContent, isStreaming: true }
                    : msg
                )
              );
            }
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: '⚠️ Failed to get AI response. Please check your model settings.',
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setAiLoading(false);
      onClearExcerpt();
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
                <p className="text-xs font-medium">Translating Page {currentPage} into {targetLanguage}...</p>
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
          {/* Active Excerpt Box if any */}
          {activeExcerpt && (
            <div className="p-3 mx-4 mt-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start justify-between gap-2 shrink-0">
              <div className="flex items-start gap-2 min-w-0">
                <Quote size={13} className="text-purple-500 shrink-0 mt-0.5" />
                <p className="text-xs text-black/80 dark:text-purple-200 line-clamp-2 italic">
                  "{activeExcerpt}"
                </p>
              </div>
              <button
                type="button"
                onClick={onClearExcerpt}
                className="p-0.5 rounded text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar select-text">
            {messages.length === 0 ? (
              <div className="py-20 text-center text-black/40 dark:text-white/40 space-y-2 select-none">
                <Sparkles size={32} className="mx-auto text-purple-500/50" />
                <p className="text-xs font-semibold text-black/70 dark:text-white/70">
                  AI Document Assistant
                </p>
                <p className="text-[11px] max-w-xs mx-auto leading-relaxed">
                  Ask questions, request summaries, or verify citations across this document.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <Bot size={13} />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-tr-xs'
                          : 'bg-light-secondary/80 dark:bg-white/[0.04] border border-light-200 dark:border-white/10 text-black/90 dark:text-white rounded-tl-xs'
                      }`}
                    >
                      <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed">
                        <Markdown>{m.content}</Markdown>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AI Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAiMessage();
            }}
            className="p-3 border-t border-light-200 dark:border-white/10 bg-light-primary dark:bg-[#0c0f16] flex items-center gap-2 select-none"
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask anything about this document..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/30 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={aiLoading || (!aiInput.trim() && !activeExcerpt)}
              className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-md disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
