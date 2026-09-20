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
import { StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';
import { lookupAcademicTerm, TranslationEngine } from '@/lib/services/bilingualService';
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
  const [dictionaryState, setDictionaryState] = useState<DictionaryPopupState | null>(null);
  const [dictionaryEngine, setDictionaryEngine] = useState<TranslationEngine>(
    () => (localStorage.getItem('pdf_translation_engine') as TranslationEngine) || 'ai'
  );

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

    const engine = (localStorage.getItem('pdf_translation_engine') as TranslationEngine) || dictionaryEngine;
    setDictionaryEngine(engine);
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

    executeLookup(text, contextSentence, engine);
  };

  const executeLookup = async (
    text: string,
    contextSentence: string,
    engine: TranslationEngine
  ) => {
    setDictionaryState((prev) => (prev ? { ...prev, loading: true } : null));
    try {
      const result = await lookupAcademicTerm(
        text,
        contextSentence,
        undefined,
        targetLanguage || 'Persian',
        engine
      );
      setDictionaryState((prev) => (prev ? { ...prev, result, loading: false } : null));
    } catch {
      setDictionaryState((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const pageHighlights = highlights.filter((h) => h.pageNumber === currentPage);

  // Sort highlights by vertical position
  const sortedHighlights = [...pageHighlights].sort((a, b) => {
    const yA = a.anchorY !== undefined ? a.anchorY : (a.rects?.[0]?.y ?? 0) * 100;
    const yB = b.anchorY !== undefined ? b.anchorY : (b.rects?.[0]?.y ?? 0) * 100;
    return yA - yB;
  });

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-auto bg-[#eaedf2] dark:bg-[#07090e] p-6 custom-scrollbar select-text transition-colors flex justify-center"
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <div className="relative inline-block my-auto">
        {/* PDF Page Container */}
        <div
          ref={pageContainerRef}
          className="relative shadow-2xl shadow-black/15 dark:shadow-2xl dark:shadow-black/90 rounded-md bg-white border border-light-200 dark:border-white/10 transition-all select-text"
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
                          hl.note ? '· (Click to view margin note in Studio)' : '· (Click to add margin note in Studio)'
                        }`}
                      />
                    ))}
                </React.Fragment>
              );
            })}
          </div>

          {/* Floating Margin Callout Pins on Canvas Right Edge */}
          <div className="absolute -right-7 top-0 bottom-0 w-6 pointer-events-none select-none">
            {sortedHighlights.map((hl) => {
              const colorDef = HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow;
              const anchorY = hl.anchorY !== undefined ? hl.anchorY : (hl.rects?.[0]?.y ?? 0) * 100;
              const isSelected = activeNoteId === hl.id;
              const hasNote = Boolean(hl.note?.trim());

              return (
                <button
                  key={hl.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundService.play('pop');
                    onSelectNote?.(hl.id);
                  }}
                  title={
                    hasNote
                      ? `Note: ${hl.note?.slice(0, 60)}... (Click to view in Studio)`
                      : `Highlight: "${hl.text.slice(0, 60)}..." (Click to add Note in Studio)`
                  }
                  style={{
                    top: `${Math.min(97, Math.max(2, anchorY))}%`,
                    backgroundColor: isSelected ? colorDef.border : colorDef.preview,
                  }}
                  className={`pointer-events-auto absolute -translate-y-1/2 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md transition-all hover:scale-125 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-sky-400 ring-offset-1 z-20 scale-110'
                      : 'opacity-85 hover:opacity-100 z-10'
                  }`}
                >
                  <StickyNote size={12} className="drop-shadow-xs" />
                </button>
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
      </div>

      {/* Inline Smart Academic Dictionary Popup */}
      {dictionaryState && (
        <InlineDictionaryPopup
          state={dictionaryState}
          currentEngine={dictionaryEngine}
          onSwitchEngine={(newEngine) => {
            setDictionaryEngine(newEngine);
            localStorage.setItem('pdf_translation_engine', newEngine);
            if (dictionaryState) {
              executeLookup(dictionaryState.term, dictionaryState.contextSentence, newEngine);
            }
          }}
          onClose={() => setDictionaryState(null)}
          onSaveToCards={onSaveDictionaryCard}
          onAddToMarginNote={(noteText) => {
            if (activeNoteId) {
              const currentNote = highlights.find((h) => h.id === activeNoteId)?.note || '';
              onUpdateNote?.(
                activeNoteId,
                currentNote ? `${currentNote}\n\n${noteText}` : noteText
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
