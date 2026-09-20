import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  PageViewMode,
} from './types';
import { StickyNote, Loader2 } from 'lucide-react';
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
  scrollMode?: PageViewMode; // 'continuous' (default) | 'single'
  onSelectionChange: (selection: TextSelectionInfo | null) => void;
  onPageChange: (page: number) => void;
  onHighlightDelete?: (id: string) => void;
  onUpdateNote?: (id: string, note: string, color?: HighlightColor) => void;
  onSelectNote?: (id: string | null) => void;
  onAskAiAboutExcerpt?: (quote: string, note?: string) => void;
  onSaveDictionaryCard?: (result: DictionaryLookupResult) => void;
}

interface PdfPageItemProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
  rotation: number;
  highlights: Highlight[];
  activeNoteId?: string | null;
  isVisible: boolean;
  defaultSize: { width: number; height: number };
  onSelectNote?: (id: string | null) => void;
}

// Individual virtualized Page Item for smooth continuous multi-page rendering
const PdfPageItem: React.FC<PdfPageItemProps> = React.memo(
  ({
    pageNumber,
    pdfDoc,
    scale,
    rotation,
    highlights,
    activeNoteId,
    isVisible,
    defaultSize,
    onSelectNote,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const [pageSize, setPageSize] = useState<{ width: number; height: number }>(defaultSize);
    const [isRendering, setIsRendering] = useState(false);

    useEffect(() => {
      setPageSize(defaultSize);
    }, [defaultSize.width, defaultSize.height]);

    useEffect(() => {
      if (!isVisible) {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }
        setIsRendering(false);
        return;
      }

      let isCancelled = false;

      const renderPage = async () => {
        try {
          setIsRendering(true);
          if (renderTaskRef.current) {
            try {
              renderTaskRef.current.cancel();
            } catch {}
            renderTaskRef.current = null;
          }

          const page = await pdfDoc.getPage(pageNumber);
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

          // Render Text Layer for text selection & highlighting
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
            console.error(`Error rendering PDF page ${pageNumber}:`, err);
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
          } catch {}
          renderTaskRef.current = null;
        }
      };
    }, [isVisible, pageNumber, pdfDoc, scale, rotation]);

    const pageHighlights = useMemo(
      () => highlights.filter((h) => h.pageNumber === pageNumber),
      [highlights, pageNumber]
    );

    const sortedHighlights = useMemo(() => {
      return [...pageHighlights].sort((a, b) => {
        const yA = a.anchorY !== undefined ? a.anchorY : (a.rects?.[0]?.y ?? 0) * 100;
        const yB = b.anchorY !== undefined ? b.anchorY : (b.rects?.[0]?.y ?? 0) * 100;
        return yA - yB;
      });
    }, [pageHighlights]);

    return (
      <div
        data-page-number={pageNumber}
        className="pdf-page-wrapper relative my-3 shadow-2xl shadow-black/15 dark:shadow-2xl dark:shadow-black/90 rounded-md bg-white border border-light-200 dark:border-white/10 transition-all select-text shrink-0"
        style={{
          width: `${pageSize.width}px`,
          height: `${pageSize.height}px`,
        }}
      >
        {isVisible ? (
          <>
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
                            hl.note
                              ? '· (Click to view margin note in Studio)'
                              : '· (Click to add margin note in Studio)'
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

            {/* Subtle Page Number Badge at bottom right of page */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/40 text-white/70 text-[10px] font-mono pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
              p. {pageNumber}
            </div>

            {/* Rendering Spinner */}
            {isRendering && (
              <div className="absolute top-4 right-4 z-20 pointer-events-none bg-white/90 dark:bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-black/80 dark:text-white/80 border border-light-200 dark:border-white/10 flex items-center gap-1.5 shadow-lg">
                <Loader2 size={12} className="animate-spin text-sky-500" />
                <span>Page {pageNumber}...</span>
              </div>
            )}
          </>
        ) : (
          /* Offscreen Lightweight Placeholder for Ultra-Fast Scrolling */
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/60 dark:bg-[#121622]/60 text-black/30 dark:text-white/30 font-mono text-xs select-none">
            <div className="p-3 rounded-full bg-light-secondary dark:bg-white/5 mb-2">
              <Loader2 size={18} className="animate-spin opacity-40 text-sky-500" />
            </div>
            <span>Page {pageNumber}</span>
          </div>
        )}
      </div>
    );
  }
);

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDoc,
  currentPage,
  scale,
  rotation,
  highlights,
  activeNoteId,
  targetLanguage = 'Persian',
  scrollMode = 'continuous',
  onSelectionChange,
  onPageChange,
  onHighlightDelete,
  onUpdateNote,
  onSelectNote,
  onAskAiAboutExcerpt,
  onSaveDictionaryCard,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef<boolean>(false);

  const [dictionaryState, setDictionaryState] = useState<DictionaryPopupState | null>(null);
  const [dictionaryEngine, setDictionaryEngine] = useState<TranslationEngine>(
    () => (localStorage.getItem('pdf_translation_engine') as TranslationEngine) || 'ai'
  );

  const totalPages = pdfDoc?.numPages || 1;

  // Base page size estimated from first page
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({
    width: Math.floor(595 * scale),
    height: Math.floor(842 * scale),
  });

  // Track initial page size from page 1
  useEffect(() => {
    if (!pdfDoc) return;
    pdfDoc.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale, rotation });
      setBaseSize({ width: viewport.width, height: viewport.height });
    });
  }, [pdfDoc, scale, rotation]);

  // Set of visible page numbers currently inside or near the viewport
  const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set([currentPage]));

  // IntersectionObserver: Watches continuous page wrappers for virtualization & current page sync
  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;

    if (scrollMode === 'single') {
      setVisiblePages(new Set([currentPage]));
      return;
    }

    const container = containerRef.current;
    const pageWrappers = container.querySelectorAll<HTMLElement>('.pdf-page-wrapper');
    if (!pageWrappers.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const pageNum = Number(entry.target.getAttribute('data-page-number'));
            if (pageNum) {
              if (entry.isIntersecting) {
                next.add(pageNum);
              } else {
                next.delete(pageNum);
              }
            }
          });
          return next;
        });

        // Determine the most active/topmost visible page to sync currentPage
        if (!isProgrammaticScroll.current) {
          const containerRect = container.getBoundingClientRect();
          let closestPage = currentPage;
          let minTopDistance = Infinity;

          pageWrappers.forEach((el) => {
            const rect = el.getBoundingClientRect();
            // A page is considered active when its top is near container top or it occupies the upper reading zone
            const dist = Math.abs(rect.top - containerRect.top);
            if (rect.bottom > containerRect.top + 80 && dist < minTopDistance) {
              minTopDistance = dist;
              closestPage = Number(el.getAttribute('data-page-number'));
            }
          });

          if (closestPage && closestPage !== currentPage) {
            onPageChange(closestPage);
          }
        }
      },
      {
        root: container,
        rootMargin: '450px 0px 450px 0px',
        threshold: [0, 0.1, 0.5, 0.8],
      }
    );

    pageWrappers.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [scrollMode, totalPages, scale, rotation, pdfDoc, onPageChange, currentPage]);

  // Programmatic Scroll Sync: When currentPage changes externally (buttons, outline, citations, mind map)
  useEffect(() => {
    if (!containerRef.current || scrollMode !== 'continuous') return;

    const targetEl = containerRef.current.querySelector<HTMLElement>(
      `[data-page-number="${currentPage}"]`
    );
    if (!targetEl) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    // If target page is out of current reading frame, smoothly scroll to it
    const isOutOfView =
      targetRect.bottom < containerRect.top + 60 || targetRect.top > containerRect.bottom - 60;

    if (isOutOfView) {
      isProgrammaticScroll.current = true;
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentPage, scrollMode]);

  // Text selection handler across multiple pages with accurate relative coordinates
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

    // Identify which page container enclosed this selection
    let node: Node | null = range.startContainer;
    let pageWrapper: HTMLElement | null = null;
    while (node && node !== containerRef.current) {
      if (node instanceof HTMLElement && node.hasAttribute('data-page-number')) {
        pageWrapper = node;
        break;
      }
      node = node.parentNode;
    }

    const pageNum = pageWrapper
      ? Number(pageWrapper.getAttribute('data-page-number'))
      : currentPage;

    let relativeRects: HighlightRect[] = [];
    let anchorY = 10;

    if (pageWrapper) {
      const pageRect = pageWrapper.getBoundingClientRect();
      const rawRects = Array.from(range.getClientRects());
      relativeRects = rawRects
        .map((r) => ({
          x: Math.max(0, Math.min(1, (r.left - pageRect.left) / pageRect.width)),
          y: Math.max(0, Math.min(1, (r.top - pageRect.top) / pageRect.height)),
          width: Math.max(0, Math.min(1, r.width / pageRect.width)),
          height: Math.max(0, Math.min(1, r.height / pageRect.height)),
        }))
        .filter((r) => r.width > 0.001 && r.height > 0.001);

      if (relativeRects.length > 0) {
        anchorY = Math.round(relativeRects[0].y * 100);
      } else {
        anchorY = Math.round(((rect.top - pageRect.top) / pageRect.height) * 100);
      }
    }

    onSelectionChange({
      text,
      pageNumber: pageNum,
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

  // Double-click dictionary lookup
  const handleDoubleClick = async () => {
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

    const engine =
      (localStorage.getItem('pdf_translation_engine') as TranslationEngine) || dictionaryEngine;
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

  // Generate page numbers array
  const pageNumbers = useMemo(() => {
    if (scrollMode === 'single') {
      return [currentPage];
    }
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [scrollMode, totalPages, currentPage]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-y-auto overflow-x-auto bg-[#eaedf2] dark:bg-[#07090e] p-6 custom-scrollbar select-text transition-colors flex flex-col items-center"
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Continuous Page Stack or Single Page */}
      <div className="flex flex-col items-center min-h-full my-auto pb-12">
        {pdfDoc &&
          pageNumbers.map((pNum) => (
            <PdfPageItem
              key={`page-${pNum}`}
              pageNumber={pNum}
              pdfDoc={pdfDoc}
              scale={scale}
              rotation={rotation}
              highlights={highlights}
              activeNoteId={activeNoteId}
              isVisible={visiblePages.has(pNum)}
              defaultSize={baseSize}
              onSelectNote={onSelectNote}
            />
          ))}
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
