import React, { useState } from 'react';
import {
  Highlight,
  HighlightColor,
  HIGHLIGHT_COLORS,
  CanvasCard,
  CanvasCardType,
  PdfDocumentMeta,
} from './types';
import {
  Sparkles,
  LayoutGrid,
  Plus,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  X,
  Trash2,
  Edit3,
  Bookmark,
  StickyNote,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Lightbulb,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { synthesizeCards } from '@/lib/services/aiNoteService';
import Markdown from 'markdown-to-jsx';

interface CanvasCardsStudioProps {
  isOpen: boolean;
  meta: PdfDocumentMeta | null;
  highlights: Highlight[];
  cards: CanvasCard[];
  currentPage: number;
  onClose: () => void;
  onNavigateToPage: (page: number) => void;
  onSaveCards: (cards: CanvasCard[]) => void;
  onUpdateHighlightNote: (id: string, note: string) => void;
  onDeleteHighlight: (id: string) => void;
}

const CARD_TYPE_CONFIG: Record<
  CanvasCardType,
  { label: string; icon: React.FC<any>; bg: string; text: string }
> = {
  margin_note: {
    label: 'Margin Note',
    icon: StickyNote,
    bg: 'bg-amber-500/15',
    text: 'text-amber-500 dark:text-amber-400',
  },
  thought: {
    label: 'Thought & Idea',
    icon: Lightbulb,
    bg: 'bg-purple-500/15',
    text: 'text-purple-500 dark:text-purple-400',
  },
  concept: {
    label: 'Core Concept',
    icon: Bookmark,
    bg: 'bg-sky-500/15',
    text: 'text-sky-500 dark:text-sky-400',
  },
  summary: {
    label: 'Key Summary',
    icon: FileText,
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-500 dark:text-emerald-400',
  },
  question: {
    label: 'Open Question',
    icon: HelpCircle,
    bg: 'bg-rose-500/15',
    text: 'text-rose-500 dark:text-rose-400',
  },
};

export const CanvasCardsStudio: React.FC<CanvasCardsStudioProps> = ({
  isOpen,
  meta,
  highlights,
  cards,
  currentPage,
  onClose,
  onNavigateToPage,
  onSaveCards,
  onUpdateHighlightNote,
  onDeleteHighlight,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<CanvasCardType | 'all'>('all');
  const [selectedColor, setSelectedColor] = useState<HighlightColor | 'all'>('all');

  // New Card Modal State
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardType, setNewCardType] = useState<CanvasCardType>('thought');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardContent, setNewCardContent] = useState('');
  const [newCardColor, setNewCardColor] = useState<HighlightColor>('purple');
  const [newCardPage, setNewCardPage] = useState<number>(currentPage);

  // AI Synthesis State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<string | null>(null);

  // Copy state
  const [copiedExport, setCopiedExport] = useState(false);

  if (!isOpen) return null;

  // Combine highlights that have notes into unified cards if not already in cards
  const highlightCards: CanvasCard[] = highlights.map((h) => ({
    id: `hl_card_${h.id}`,
    documentId: h.documentId,
    pageNumber: h.pageNumber,
    highlightId: h.id,
    type: 'margin_note' as CanvasCardType,
    title: h.note ? h.note.split('\n')[0].slice(0, 40) : undefined,
    content: h.note || '',
    quote: h.text,
    color: h.color,
    anchorY: h.anchorY,
    timestamp: h.timestamp,
    updatedAt: h.updatedAt,
  }));

  const allDisplayCards = [...cards, ...highlightCards];

  // Filter cards
  const filteredCards = allDisplayCards.filter((card) => {
    if (selectedType !== 'all' && card.type !== selectedType) return false;
    if (selectedColor !== 'all' && card.color !== selectedColor) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQuote = card.quote?.toLowerCase().includes(q);
      const matchContent = card.content.toLowerCase().includes(q);
      const matchTitle = card.title?.toLowerCase().includes(q);
      if (!matchQuote && !matchContent && !matchTitle) return false;
    }
    return true;
  });

  const handleCreateNewCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardContent.trim()) {
      toast.error('Card content cannot be empty');
      return;
    }

    const newCard: CanvasCard = {
      id: Date.now().toString(),
      documentId: meta?.id || 'doc',
      pageNumber: newCardPage || currentPage,
      type: newCardType,
      title: newCardTitle.trim() || undefined,
      content: newCardContent.trim(),
      color: newCardColor,
      timestamp: Date.now(),
    };

    onSaveCards([newCard, ...cards]);
    soundService.play('pop');
    toast.success('Research card added to canvas');

    // Reset Form
    setNewCardTitle('');
    setNewCardContent('');
    setIsCreatingCard(false);
  };

  const handleDeleteCard = (card: CanvasCard) => {
    soundService.play('pop');
    if (card.highlightId) {
      onDeleteHighlight(card.highlightId);
    } else {
      onSaveCards(cards.filter((c) => c.id !== card.id));
    }
    toast.success('Card removed');
  };

  // Generate clean Markdown for Obsidian / Notion export
  const generateMarkdownExport = (): string => {
    const title = meta?.title || meta?.name || 'Document Notes';
    let md = `# Research Notes: ${title}\n\n`;
    md += `*Generated by Noectra AI Research Studio on ${new Date().toLocaleDateString()}*\n\n`;
    md += `---\n\n`;

    if (synthesisResult) {
      md += `## ⚡ Executive AI Synthesis\n\n${synthesisResult}\n\n---\n\n`;
    }

    md += `## 📚 Collected Cards & Margin Annotations (${allDisplayCards.length})\n\n`;

    allDisplayCards.forEach((c, i) => {
      const typeInfo = CARD_TYPE_CONFIG[c.type] || CARD_TYPE_CONFIG.margin_note;
      md += `### ${i + 1}. [${typeInfo.label}] ${c.title || `Note on Page ${c.pageNumber || 'N/A'}`}\n`;
      if (c.pageNumber) md += `- **Citation**: Page ${c.pageNumber}\n`;
      if (c.quote) md += `- **Quote**:\n  > "${c.quote}"\n\n`;
      if (c.content) md += `- **Analysis & Notes**:\n  ${c.content}\n\n`;
      md += `---\n\n`;
    });

    return md;
  };

  const handleExportMarkdown = async () => {
    const md = generateMarkdownExport();
    try {
      await navigator.clipboard.writeText(md);
      setCopiedExport(true);
      toast.success('Markdown copied to clipboard for Obsidian/Notion');
      setTimeout(() => setCopiedExport(false), 2000);
    } catch {
      toast.error('Failed to copy Markdown');
    }
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownExport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(meta?.name || 'document').replace(/\.[^/.]+$/, '')}_research_notes.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Research notes downloaded as .md file');
  };

  const handleRunAiSynthesis = async () => {
    if (allDisplayCards.length === 0) {
      toast.info('No notes or cards collected yet to synthesize');
      return;
    }
    try {
      setIsSynthesizing(true);
      soundService.play('dispatch');
      toast.loading('Synthesizing all research cards with AI...', { id: 'ai-synthesis' });
      const synthesis = await synthesizeCards(allDisplayCards, meta?.title || meta?.name);
      setSynthesisResult(synthesis);
      toast.success('AI Synthesis completed!', { id: 'ai-synthesis' });
    } catch (err: any) {
      toast.error('AI Synthesis failed. Please ensure an AI model is configured.', {
        id: 'ai-synthesis',
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[90vh] bg-light-primary dark:bg-[#0c0f16] border border-light-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-black dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Top Header */}
        <div className="h-16 px-6 border-b border-light-200 dark:border-white/10 bg-light-secondary/60 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500/20 to-blue-500/20 text-sky-500 dark:text-sky-400 border border-sky-500/30 shadow-sm">
              <LayoutGrid size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-black/90 dark:text-white/95">
                  Research Canvas & Cards Studio
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-medium">
                  {allDisplayCards.length} Cards
                </span>
              </div>
              <p className="text-[11px] text-black/50 dark:text-white/40 truncate max-w-[320px] sm:max-w-md">
                {meta?.title || meta?.name || 'Document Knowledge Base'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Synthesize Button */}
            <button
              type="button"
              disabled={isSynthesizing || allDisplayCards.length === 0}
              onClick={handleRunAiSynthesis}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSynthesizing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} className="text-amber-300 animate-pulse" />
              )}
              <span className="hidden sm:inline">Synthesize All</span>
            </button>

            {/* Export Dropdown / Actions */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              title="Copy notes as Markdown (Obsidian / Notion)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-light-secondary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 text-xs font-medium border border-light-200 dark:border-white/10 text-black/80 dark:text-white/80 transition-colors"
            >
              {copiedExport ? (
                <Check size={14} className="text-emerald-500" />
              ) : (
                <Copy size={14} />
              )}
              <span className="hidden sm:inline">Copy Markdown</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              title="Download as .md file"
              className="p-2 rounded-xl bg-light-secondary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 text-black/70 dark:text-white/70 border border-light-200 dark:border-white/10 transition-colors"
            >
              <Download size={15} />
            </button>

            {/* New Card Button */}
            <button
              type="button"
              onClick={() => setIsCreatingCard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm transition-all hover:scale-105"
            >
              <Plus size={14} />
              <span>New Card</span>
            </button>

            <div className="w-px h-5 bg-light-200 dark:border-white/10 mx-1" />

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-black/60 dark:text-white/60 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="px-6 py-3 border-b border-light-200 dark:border-white/10 bg-light-primary dark:bg-[#0c0f16] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative w-full">
              <Search
                size={14}
                className="absolute left-3 top-2.5 text-black/40 dark:text-white/40"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, quotes, concepts..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/30 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedType === 'all'
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-black/60 dark:text-white/60 hover:bg-light-secondary dark:hover:bg-white/5'
              }`}
            >
              All Types
            </button>

            {(Object.keys(CARD_TYPE_CONFIG) as CanvasCardType[]).map((typeKey) => {
              const conf = CARD_TYPE_CONFIG[typeKey];
              const Icon = conf.icon;
              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => setSelectedType(typeKey)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedType === typeKey
                      ? `${conf.bg} ${conf.text} border border-current`
                      : 'text-black/60 dark:text-white/60 hover:bg-light-secondary dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={12} />
                  <span>{conf.label}</span>
                </button>
              );
            })}
          </div>

          {/* Color Filter Swatches */}
          <div className="flex items-center gap-1 border-l border-light-200 dark:border-white/10 pl-3">
            <button
              type="button"
              onClick={() => setSelectedColor('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                selectedColor === 'all'
                  ? 'bg-light-secondary dark:bg-white/15 text-black dark:text-white font-semibold'
                  : 'text-black/50 dark:text-white/50'
              }`}
            >
              ALL
            </button>
            {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setSelectedColor(selectedColor === col ? 'all' : col)}
                className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${
                  selectedColor === col ? 'ring-2 ring-sky-500 scale-110' : ''
                }`}
                style={{ backgroundColor: HIGHLIGHT_COLORS[col].preview }}
              />
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* AI Synthesis Box if Available */}
          {synthesisResult && (
            <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500 dark:text-purple-400" />
                  <h3 className="text-sm font-bold text-purple-600 dark:text-purple-300">
                    Executive AI Synthesis & Literature Review
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSynthesisResult(null)}
                  className="p-1 rounded text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="text-xs text-black/80 dark:text-white/85 leading-relaxed prose dark:prose-invert max-w-none">
                <Markdown>{synthesisResult}</Markdown>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-black/40 dark:text-white/40">
              <LayoutGrid size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-semibold text-black/70 dark:text-white/70">
                No Research Cards Found
              </p>
              <p className="text-xs mt-1 max-w-sm">
                Create new research cards or highlight passages in the PDF with margin notes to build your document knowledge base.
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingCard(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md transition-all"
              >
                Create First Card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCards.map((card) => {
                const typeConfig = CARD_TYPE_CONFIG[card.type] || CARD_TYPE_CONFIG.margin_note;
                const TypeIcon = typeConfig.icon;
                const colorDef = HIGHLIGHT_COLORS[card.color] || HIGHLIGHT_COLORS.yellow;

                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-2xl bg-light-secondary/70 dark:bg-white/[0.02] hover:bg-light-secondary dark:hover:bg-white/[0.04] border border-light-200 dark:border-white/10 hover:border-sky-500/40 transition-all flex flex-col justify-between shadow-xs hover:shadow-lg group"
                    style={{
                      borderTopWidth: '3px',
                      borderTopColor: colorDef.border,
                    }}
                  >
                    <div>
                      {/* Card Top Badges */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${typeConfig.bg} ${typeConfig.text}`}
                          >
                            <TypeIcon size={11} />
                            <span>{typeConfig.label}</span>
                          </span>

                          {card.pageNumber && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToPage(card.pageNumber!);
                                onClose();
                              }}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-light-primary dark:bg-white/10 text-sky-600 dark:text-sky-400 border border-light-200 dark:border-white/5 hover:border-sky-500/40 transition-colors"
                              title={`Jump to Page ${card.pageNumber}`}
                            >
                              p.{card.pageNumber}
                            </button>
                          )}
                        </div>

                        {/* Delete Action */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-rose-500 transition-opacity"
                          title="Delete card"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Title if present */}
                      {card.title && (
                        <h4 className="text-xs font-bold text-black/90 dark:text-white/95 mb-1.5">
                          {card.title}
                        </h4>
                      )}

                      {/* Quoted Text if linked to PDF selection */}
                      {card.quote && (
                        <div
                          className="mb-2.5 text-[11px] text-black/70 dark:text-white/70 italic border-l-2 pl-2.5 py-0.5 bg-light-primary/50 dark:bg-black/20 rounded-r-lg"
                          style={{ borderColor: colorDef.border }}
                        >
                          "{card.quote}"
                        </div>
                      )}

                      {/* Card Content / User Note */}
                      <p className="text-xs text-black/85 dark:text-white/85 leading-relaxed whitespace-pre-wrap">
                        {card.content || (
                          <span className="italic text-black/40 dark:text-white/40">
                            No written notes yet.
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 mt-3 border-t border-light-200 dark:border-white/5 flex items-center justify-between text-[10px] text-black/40 dark:text-white/40">
                      <span>{new Date(card.timestamp).toLocaleDateString()}</span>
                      {card.pageNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToPage(card.pageNumber!);
                            onClose();
                          }}
                          className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline font-medium"
                        >
                          <span>Open in Reader</span>
                          <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal for Creating Standalone Cards */}
        {isCreatingCard && (
          <div
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setIsCreatingCard(false)}
          >
            <div
              className="w-full max-w-lg p-6 rounded-2xl bg-light-primary dark:bg-[#111622] border border-light-200 dark:border-white/10 shadow-2xl space-y-4 text-black dark:text-white animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-light-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                    <Plus size={16} />
                  </div>
                  <h3 className="text-sm font-bold">Add Research Card</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingCard(false)}
                  className="p-1 rounded text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateNewCard} className="space-y-3">
                {/* Type Selection */}
                <div>
                  <label className="text-[11px] font-medium text-black/60 dark:text-white/60 block mb-1.5">
                    Card Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(CARD_TYPE_CONFIG) as CanvasCardType[])
                      .filter((t) => t !== 'margin_note')
                      .map((tKey) => {
                        const conf = CARD_TYPE_CONFIG[tKey];
                        const Icon = conf.icon;
                        const isSelected = newCardType === tKey;
                        return (
                          <button
                            key={tKey}
                            type="button"
                            onClick={() => setNewCardType(tKey)}
                            className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-colors ${
                              isSelected
                                ? `${conf.bg} ${conf.text} border-current shadow-xs`
                                : 'bg-light-secondary dark:bg-white/5 border-light-200 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10'
                            }`}
                          >
                            <Icon size={12} />
                            <span>{conf.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Page Number & Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-black/60 dark:text-white/60 block mb-1">
                      Cited Page
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={meta?.pageCount || 9999}
                      value={newCardPage}
                      onChange={(e) => setNewCardPage(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-black/60 dark:text-white/60 block mb-1">
                      Color Tag
                    </label>
                    <div className="flex items-center gap-1.5 h-8">
                      {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewCardColor(c)}
                          className={`w-5 h-5 rounded-full transition-transform ${
                            newCardColor === c ? 'scale-125 ring-2 ring-sky-500' : ''
                          }`}
                          style={{ backgroundColor: HIGHLIGHT_COLORS[c].preview }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[11px] font-medium text-black/60 dark:text-white/60 block mb-1">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="e.g. Methodology Limitation or Key Finding"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="text-[11px] font-medium text-black/60 dark:text-white/60 block mb-1">
                    Content & Observations
                  </label>
                  <textarea
                    rows={4}
                    value={newCardContent}
                    onChange={(e) => setNewCardContent(e.target.value)}
                    placeholder="Write your research insight, critique, hypothesis, or summary..."
                    className="w-full p-3 text-xs rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white focus:outline-none focus:border-sky-500 custom-scrollbar resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCard(false)}
                    className="px-4 py-2 rounded-xl text-xs text-black/60 dark:text-white/60 hover:bg-light-secondary dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    Save Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
