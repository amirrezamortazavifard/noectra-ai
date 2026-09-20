import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import {
  Highlight,
  HighlightColor,
  HIGHLIGHT_COLORS,
  HighlightRect,
  TextSelectionInfo,
  DictionaryPopupState,
  DictionaryLookupResult,
} from './types';
import {
  StickyNote,
  Sparkles,
  Trash2,
  X,
  Plus,
  MessageSquare,
  Lightbulb,
  Loader2,
  Quote,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { summarizeNote, extractConcept } from '@/lib/services/aiNoteService';
import { lookupAcademicTerm } from '@/lib/services/bilingualService';
import { InlineDictionaryPopup } from './InlineDictionaryPopup';

interface PdfViewerProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  currentPage: number;
  scale: number;
  rotation: number;
  highlights: Highlight[];
  activeNoteId?: string | null;
  targetLanguage?: string;
  onSelectionChange: (selection: TextSelectionInfo | null) => void;
  onPageChange: (page: number) => void;
  onHighlightDelete?: (id: string) => void;
  onUpdateNote?: (id: string, note: string, color?: HighlightColor) => void;
  onSelectNote?: (id: string | null) => void;
  onAskAiAboutExcerpt?: (quote: string, note?: string) => void;
  onSaveDictionaryCard?: (result: DictionaryLookupResult) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDoc,
  currentPage,
  scale,
  rotation,
  highlights,
  activeNoteId,
  targetLanguage = 'Persian',
  onSelectionChange,
  onPageChange,
  onHighlightDelete,
  onUpdateNote,
  onSelectNote,
  onAskAiAboutExcerpt,
  onSaveDictionaryCard,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 800,
  });
  const [isRendering, setIsRendering] = useState(false);
  const [editingNoteText, setEditingNoteText] = useState<{ [id: string]: string }>({});
  const [isAiProcessing, setIsAiProcessing] = useState<{ [id: string]: boolean }>({});
  const [expandAllNotes, setExpandAllNotes] = useState(false);
  const [dictionaryState, setDictionaryState] = useState<DictionaryPopupState | null>(null);

  // Sync editing text whenever highlights or active note change
  useEffect(() => {
    const textMap: { [id: string]: string } = {};
    for (const h of highlights) {
      textMap[h.id] = h.note || '';
    }
    setEditingNoteText(textMap);
  }, [highlights]);

  // Render Page to Canvas + TextLayer
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        setIsRendering(true);
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // ignore cancel error
          }
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        setPageSize({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform || undefined,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (isCancelled) return;

        // Render Text Layer
        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${Math.floor(viewport.width)}px`;
          textLayerRef.current.style.height = `${Math.floor(viewport.height)}px`;
          textLayerRef.current.style.setProperty('--scale-factor', `${scale}`);

          const textContent = await page.getTextContent();
          if (isCancelled) return;

          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport,
          });

          await textLayer.render();
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  // Listen to native mouseup for text selections with relative normalized rects
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      onSelectionChange(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      onSelectionChange(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      onSelectionChange(null);
      return;
    }

    const container = pageContainerRef.current;
    let relativeRects: HighlightRect[] = [];
    let anchorY = 10;

    if (container) {
      const containerRect = container.getBoundingClientRect();
      const rawRects = Array.from(range.getClientRects());
      relativeRects = rawRects
        .map((r) => ({
          x: Math.max(0, Math.min(1, (r.left - containerRect.left) / containerRect.width)),
          y: Math.max(0, Math.min(1, (r.top - containerRect.top) / containerRect.height)),
          width: Math.max(0, Math.min(1, r.width / containerRect.width)),
          height: Math.max(0, Math.min(1, r.height / containerRect.height)),
        }))
        .filter((r) => r.width > 0.001 && r.height > 0.001);

      if (relativeRects.length > 0) {
        anchorY = Math.round(relativeRects[0].y * 100);
      } else {
        anchorY = Math.round(((rect.top - containerRect.top) / containerRect.height) * 100);
      }
    }

    onSelectionChange({
      text,
      pageNumber: currentPage,
      rects: relativeRects,
      anchorY,
      clientRect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  // Double-click handler to trigger academic dictionary lookup
  const handleDoubleClick = async (e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const text = sel.toString().trim();
    if (!text || text.split(/\s+/).length > 4) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    let contextSentence = text;
    try {
      const nodeText = range.startContainer.textContent || '';
      const start = Math.max(0, range.startOffset - 100);
      const end = Math.min(nodeText.length, range.endOffset + 100);
      contextSentence = nodeText.substring(start, end).trim();
    } catch {}

    setDictionaryState({
      term: text,
      contextSentence,
      clientRect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
      loading: true,
    });

    try {
      const result = await lookupAcademicTerm(
        text,
        contextSentence,
        undefined,
        targetLanguage || 'Persian'
      );
      setDictionaryState((prev) => (prev ? { ...prev, result, loading: false } : null));
    } catch {
      setDictionaryState((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const handleNoteChange = (id: string, text: string) => {
    setEditingNoteText((prev) => ({ ...prev, [id]: text }));
    onUpdateNote?.(id, text);
  };

  const handleSummarizeNote = async (hl: Highlight) => {
    try {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: true }));
      soundService.play('dispatch');
      toast.loading('AI is generating note summary...', { id: `ai-note-${hl.id}` });
      const summary = await summarizeNote(hl.text, editingNoteText[hl.id] || hl.note);
      const updated = editingNoteText[hl.id]
        ? `${editingNoteText[hl.id]}\n\n⚡ **Summary**: ${summary}`
        : `⚡ **Summary**: ${summary}`;
      handleNoteChange(hl.id, updated);
      toast.success('Summary added to margin note', { id: `ai-note-${hl.id}` });
    } catch (err: any) {
      toast.error('Failed to generate summary with AI', { id: `ai-note-${hl.id}` });
    } finally {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: false }));
    }
  };

  const handleExtractConcept = async (hl: Highlight) => {
    try {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: true }));
      soundService.play('dispatch');
      toast.loading('AI is extracting key concept...', { id: `ai-concept-${hl.id}` });
      const concept = await extractConcept(hl.text);
      const updated = editingNoteText[hl.id]
        ? `${editingNoteText[hl.id]}\n\n💡 ${concept}`
        : `💡 ${concept}`;
      handleNoteChange(hl.id, updated);
      toast.success('Concept extracted into margin note', { id: `ai-concept-${hl.id}` });
    } catch (err: any) {
      toast.error('Failed to extract concept', { id: `ai-concept-${hl.id}` });
    } finally {
      setIsAiProcessing((prev) => ({ ...prev, [hl.id]: false }));
    }
  };

  const pageHighlights = highlights.filter((h) => h.pageNumber === currentPage);

  // Sort highlights by their vertical position
  const sortedHighlights = [...pageHighlights].sort((a, b) => {
    const yA = a.anchorY !== undefined ? a.anchorY : (a.rects?.[0]?.y ?? 0) * 100;
    const yB = b.anchorY !== undefined ? b.anchorY : (b.rects?.[0]?.y ?? 0) * 100;
    return yA - yB;
  });

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-auto bg-[#e8ecf2] dark:bg-[#07090e] p-6 custom-scrollbar select-text transition-colors"
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-start justify-center gap-6 relative min-w-fit mx-auto">
        {/* PDF Page Container */}
        <div
          ref={pageContainerRef}
          className="relative shadow-xl shadow-black/10 dark:shadow-2xl dark:shadow-black/80 rounded-md bg-white border border-light-200 dark:border-white/10 transition-all shrink-0 select-text"
          style={{
            width: `${pageSize.width}px`,
            height: `${pageSize.height}px`,
          }}
        >
          {/* Canvas for PDF visual rendering */}
          <canvas ref={canvasRef} className="block rounded-md" />

          {/* Text Layer for text selection */}
          <div
            ref={textLayerRef}
            className="textLayer absolute inset-0 rounded-md select-text"
            style={{
              mixBlendMode: 'multiply',
            }}
          />

          {/* Highlights Layer directly on PDF Canvas */}
          <div className="absolute inset-0 pointer-events-none rounded-md overflow-hidden">
            {pageHighlights.map((hl) => {
              const colorDef = HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow;
              const isSelected = activeNoteId === hl.id;

              return (
                <React.Fragment key={hl.id}>
                  {hl.rects &&
                    hl.rects.map((r, rIdx) => (
                      <div
                        key={`${hl.id}-${rIdx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          soundService.play('pop');
                          onSelectNote?.(hl.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${r.x * 100}%`,
                          top: `${r.y * 100}%`,
                          width: `${r.width * 100}%`,
                          height: `${r.height * 100}%`,
                          backgroundColor: colorDef.bg,
                          mixBlendMode: 'multiply',
                          borderBottom: `2px solid ${colorDef.border}`,
                          borderRadius: '2px',
                          outline: isSelected ? `2px solid ${colorDef.border}` : 'none',
                          boxShadow: isSelected ? `0 0 12px ${colorDef.border}` : 'none',
                        }}
                        className="pointer-events-auto cursor-pointer transition-all hover:opacity-90"
                        title={`Highlight: "${hl.text.slice(0, 60)}..." ${
                          hl.note ? '· (Click to view margin note)' : '· (Click to add margin note)'
                        }`}
                      />
                    ))}
                </React.Fragment>
              );
            })}
          </div>

          {/* Loading Spinner Indicator */}
          {isRendering && (
            <div className="absolute top-4 right-4 z-20 pointer-events-none bg-white/90 dark:bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-black/80 dark:text-white/80 border border-light-200 dark:border-white/10 flex items-center gap-1.5 shadow-lg">
              <div className="w-2.5 h-2.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span>Rendering...</span>
            </div>
          )}
        </div>

        {/* Right Margin Gutter for Anchored Margin Notes */}
        <div
          className="w-72 sm:w-80 shrink-0 relative flex flex-col transition-all select-none"
          style={{ minHeight: `${pageSize.height}px` }}
        >
          {/* Gutter Header */}
          <div className="sticky top-0 z-20 bg-light-primary/95 dark:bg-[#0c0f14]/95 backdrop-blur-md p-2.5 rounded-xl border border-light-200 dark:border-white/10 mb-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-amber-500/15 text-amber-500 dark:text-amber-400">
                <StickyNote size={14} />
              </div>
              <span className="text-xs font-semibold text-black/90 dark:text-white/90">
                Margin Notes
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-light-secondary dark:bg-white/10 text-black/60 dark:text-white/60 font-mono">
                {pageHighlights.filter((h) => Boolean(h.note?.trim())).length}
              </span>
            </div>

            {pageHighlights.length > 0 && (
              <button
                type="button"
                onClick={() => setExpandAllNotes((v) => !v)}
                className="text-[11px] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-light-secondary dark:hover:bg-white/5 transition-colors"
                title={expandAllNotes ? 'Collapse note cards' : 'Expand all note cards'}
              >
                {expandAllNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{expandAllNotes ? 'Collapse' : 'Expand'}</span>
              </button>
            )}
          </div>

          {/* List of Margin Notes or Empty State */}
          {sortedHighlights.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-light-300 dark:border-white/10 text-center text-black/40 dark:text-white/40 bg-light-secondary/40 dark:bg-white/[0.01]">
              <StickyNote size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium text-black/70 dark:text-white/70">
                No Margin Notes on Page {currentPage}
              </p>
              <p className="text-[11px] mt-1 leading-relaxed text-black/50 dark:text-white/40">
                Select any text on this page and choose <span className="font-semibold text-amber-500">"Note"</span> to anchor observations, summaries, and critique directly in the margin.
              </p>
            </div>
          ) : (
            <div className="space-y-3 relative">
              {sortedHighlights.map((hl) => {
                const colorDef = HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow;
                const isExpanded = expandAllNotes || activeNoteId === hl.id;
                const hasNoteText = Boolean(editingNoteText[hl.id]?.trim());

                return (
                  <div
                    key={hl.id}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? 'bg-white dark:bg-[#0f131a] shadow-xl shadow-black/10 dark:shadow-black/60 ring-1'
                        : 'bg-white/80 dark:bg-[#0c0f14]/80 hover:bg-white dark:hover:bg-[#111622] hover:border-light-300 dark:hover:border-white/20'
                    }`}
                    style={{
                      borderColor: isExpanded ? colorDef.border : undefined,
                    }}
                  >
                    {/* Note Card Header */}
                    <div
                      className="flex items-center justify-between p-2.5 cursor-pointer"
                      onClick={() => onSelectNote?.(isExpanded ? null : hl.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: colorDef.preview }}
                        />
                        <span className="text-[11px] font-mono font-medium text-black/60 dark:text-white/60 truncate">
                          Line Callout · p.{hl.pageNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Delete Highlight & Note */}
                        {onHighlightDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              soundService.play('pop');
                              onHighlightDelete(hl.id);
                            }}
                            title="Delete note and highlight"
                            className="p-1 rounded hover:bg-rose-500/20 text-black/40 dark:text-white/40 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectNote?.(isExpanded ? null : hl.id)}
                          className="p-1 rounded hover:bg-light-200 dark:hover:bg-white/10 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Quoted Text Preview */}
                    <div className="px-2.5 pb-2">
                      <div
                        className="text-[11px] text-black/70 dark:text-white/70 italic line-clamp-2 pl-2 border-l-2 py-0.5"
                        style={{ borderColor: colorDef.border }}
                        title={hl.text}
                      >
                        "{hl.text}"
                      </div>
                    </div>

                    {/* Collapsed Note Snippet */}
                    {!isExpanded && hasNoteText && (
                      <div
                        className="px-2.5 pb-2.5 cursor-pointer"
                        onClick={() => onSelectNote?.(hl.id)}
                      >
                        <p className="text-xs text-black/90 dark:text-white/90 line-clamp-2 bg-light-secondary/60 dark:bg-white/[0.02] p-2 rounded-lg border border-light-200 dark:border-white/5 font-sans leading-relaxed">
                          {editingNoteText[hl.id]}
                        </p>
                      </div>
                    )}

                    {!isExpanded && !hasNoteText && (
                      <div
                        className="px-2.5 pb-2.5 cursor-pointer"
                        onClick={() => onSelectNote?.(hl.id)}
                      >
                        <button
                          type="button"
                          className="w-full py-1 px-2 rounded-lg bg-light-secondary/60 dark:bg-white/[0.02] hover:bg-light-secondary dark:hover:bg-white/5 text-[11px] text-black/50 dark:text-white/40 flex items-center justify-center gap-1 border border-dashed border-light-300 dark:border-white/10 transition-colors"
                        >
                          <Plus size={11} />
                          <span>Add note to highlight...</span>
                        </button>
                      </div>
                    )}

                    {/* Expanded Note Editor & AI Toolkit */}
                    {isExpanded && (
                      <div className="p-2.5 pt-0 space-y-2 border-t border-light-200 dark:border-white/5 mt-1">
                        {/* Textarea */}
                        <div className="relative mt-2">
                          <textarea
                            rows={3}
                            value={editingNoteText[hl.id] || ''}
                            onChange={(e) => handleNoteChange(hl.id, e.target.value)}
                            placeholder="Write margin note, analysis, synthesis or questions..."
                            className="w-full p-2 text-xs rounded-lg bg-light-secondary/80 dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/30 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 font-sans resize-y custom-scrollbar"
                            autoFocus
                          />
                        </div>

                        {/* AI Quick Actions Bar */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <button
                            type="button"
                            disabled={isAiProcessing[hl.id]}
                            onClick={() => handleSummarizeNote(hl)}
                            title="AI Summarize: Distill quote and thoughts into a punchy takeaway"
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium border border-amber-500/20 transition-colors disabled:opacity-50"
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
                            title="AI Concept: Extract core definition or scientific methodology"
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-medium border border-sky-500/20 transition-colors disabled:opacity-50"
                          >
                            <Lightbulb size={11} />
                            <span>Key Concept</span>
                          </button>

                          {onAskAiAboutExcerpt && (
                            <button
                              type="button"
                              onClick={() =>
                                onAskAiAboutExcerpt(hl.text, editingNoteText[hl.id])
                              }
                              title="Ask AI Assistant about this quote and note"
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-medium border border-purple-500/20 transition-colors ml-auto"
                            >
                              <MessageSquare size={11} />
                              <span>Ask AI</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inline Smart Academic Dictionary Popup */}
      {dictionaryState && (
        <InlineDictionaryPopup
          state={dictionaryState}
          onClose={() => setDictionaryState(null)}
          onSaveToCards={onSaveDictionaryCard}
          onAddToMarginNote={(noteText) => {
            if (activeNoteId) {
              handleNoteChange(
                activeNoteId,
                (editingNoteText[activeNoteId] || '') + '\n\n' + noteText
              );
            } else {
              toast.info('Select or create a margin note to attach definition');
            }
          }}
        />
      )}
    </div>
  );
};
