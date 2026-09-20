import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  FileText,
  Expand,
  Minimize,
  Volume2,
  ScanLine,
  Gauge,
  LayoutGrid,
  Languages,
  StickyNote,
  SlidersHorizontal,
  ChevronDown,
  Columns,
  GitFork,
  ScrollText,
  Wrench,
} from 'lucide-react';
import { PdfDocumentMeta, SplitViewMode, PageViewMode } from './types';

export type StudioTab = 'notes' | 'bilingual' | 'ai';

interface PdfToolbarProps {
  meta: PdfDocumentMeta | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  sidebarOpen: boolean;
  activeStudioTab?: StudioTab | null;
  aiPanelOpen?: boolean;
  bilingualActive?: boolean;
  rulerActive?: boolean;
  ttsActive?: boolean;
  cardsCount?: number;
  notesCount?: number;
  splitMode?: SplitViewMode;
  pageViewMode?: PageViewMode;
  mindMapNodesCount?: number;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth: () => void;
  onRotate: () => void;
  onToggleSidebar: () => void;
  onToggleStudioTab?: (tab: StudioTab) => void;
  onToggleAiPanel?: () => void;
  onToggleBilingual?: () => void;
  onToggleRuler?: () => void;
  onToggleTts?: () => void;
  onOpenSpeedReader?: () => void;
  onToggleCanvasCards?: () => void;
  onOpenFile: () => void;
  onToggleSplit?: (mode: SplitViewMode) => void;
  onTogglePageViewMode?: () => void;
  onOpenMindMap?: () => void;
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  meta,
  currentPage,
  totalPages,
  scale,
  sidebarOpen,
  activeStudioTab,
  aiPanelOpen,
  bilingualActive,
  rulerActive,
  ttsActive,
  cardsCount,
  notesCount,
  splitMode = 'none',
  pageViewMode = 'continuous',
  mindMapNodesCount,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onRotate,
  onToggleSidebar,
  onToggleStudioTab,
  onToggleAiPanel,
  onToggleBilingual,
  onToggleRuler,
  onToggleTts,
  onOpenSpeedReader,
  onToggleCanvasCards,
  onOpenFile,
  onToggleSplit,
  onTogglePageViewMode,
  onOpenMindMap,
}) => {
  const [pageInput, setPageInput] = useState<string>(currentPage.toString());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'focus' | 'split' | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setToolsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setToolsOpen(false);
      setActiveSubmenu(null);
    }, 220);
  };

  // Close tools dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolsRef.current && !toolsRef.current.contains(target)) {
        setToolsOpen(false);
        setActiveSubmenu(null);
      }
    };
    if (toolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [toolsOpen]);

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Determine active tab state
  const isNotesActive = activeStudioTab === 'notes';
  const isBilingualActive = activeStudioTab === 'bilingual' || Boolean(bilingualActive);
  const isAiActive = activeStudioTab === 'ai' || Boolean(aiPanelOpen);

  const handleTabClick = (tab: StudioTab) => {
    if (onToggleStudioTab) {
      onToggleStudioTab(tab);
    } else {
      if (tab === 'bilingual' && onToggleBilingual) onToggleBilingual();
      if (tab === 'ai' && onToggleAiPanel) onToggleAiPanel();
    }
  };

  const hasActiveFocusTool = rulerActive || ttsActive;
  const hasActiveStudioTool =
    rulerActive ||
    ttsActive ||
    splitMode !== 'none' ||
    isNotesActive ||
    isBilingualActive ||
    isAiActive ||
    (cardsCount !== undefined && cardsCount > 0) ||
    (mindMapNodesCount !== undefined && mindMapNodesCount > 0);

  return (
    <header className="h-14 border-b border-light-200 dark:border-white/10 bg-light-primary/90 dark:bg-[#090c12]/90 backdrop-blur-xl px-4 flex items-center justify-between select-none z-30 transition-all">
      {/* ================= ISLAND 1: IDENTITY & OUTLINE ================= */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide Document Outline' : 'Show Document Outline'}
          className={`p-2 rounded-xl transition-all ${
            sidebarOpen
              ? 'bg-light-secondary dark:bg-white/10 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-secondary dark:hover:bg-white/5'
          }`}
        >
          {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 shrink-0">
            <FileText size={15} />
          </div>
          <div className="min-w-0">
            <h1
              className="text-xs sm:text-sm font-semibold text-black/90 dark:text-white/95 truncate max-w-[130px] sm:max-w-[220px] md:max-w-[320px] tracking-tight"
              title={meta?.title || meta?.name || 'Document'}
            >
              {meta?.title || meta?.name || 'Untitled Document'}
            </h1>
            {meta?.author && (
              <p className="text-[10px] text-black/50 dark:text-white/40 truncate max-w-[180px]">
                {meta.author}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ================= ISLAND 2: NAVIGATION & OPTICS CAPSULE ================= */}
      <div className="flex items-center bg-light-secondary/80 dark:bg-white/[0.04] border border-light-200 dark:border-white/10 rounded-2xl p-0.5 shadow-xs">
        {/* Page Stepper */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            title="Previous Page (Left Arrow)"
            className="p-1.5 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={15} />
          </button>

          <form onSubmit={handlePageSubmit} className="flex items-center px-1.5">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageSubmit}
              className="w-7 text-center text-xs font-mono font-semibold bg-transparent text-black dark:text-white focus:outline-none focus:bg-light-200 dark:focus:bg-white/10 rounded"
            />
            <span className="text-[11px] text-black/40 dark:text-white/40 font-mono select-none">
              / {totalPages || 1}
            </span>
          </form>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            title="Next Page (Right Arrow)"
            className="p-1.5 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="w-px h-4 bg-light-200 dark:border-white/10 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onZoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out"
            className="p-1.5 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition-colors"
          >
            <ZoomOut size={15} />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom (100%)"
            className="px-2 py-0.5 text-[11px] font-mono font-medium text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            disabled={scale >= 3.0}
            title="Zoom In"
            className="p-1.5 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-25 disabled:pointer-events-none transition-colors"
          >
            <ZoomIn size={15} />
          </button>
        </div>
      </div>

      {/* ================= ISLAND 3: CONSOLIDATED TOOLS & OPEN ================= */}
      <div className="flex items-center gap-2">
        {/* Consolidated Studio Tools Menu (Hover & Click activated with Cascading Submenus) */}
        <div
          className="relative"
          ref={toolsRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            onClick={() => setToolsOpen((v) => !v)}
            title="Studio Tools, Focus Aids, Knowledge Graph & Inspectors"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              toolsOpen || hasActiveStudioTool
                ? 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'bg-light-secondary dark:bg-white/5 border-light-200 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10'
            }`}
          >
            <Wrench size={14} />
            <span className="text-[11px] font-semibold">Tools</span>
            {hasActiveStudioTool && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            )}
            <ChevronDown
              size={12}
              className={`transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Master Tools Cascading Dropdown */}
          {toolsOpen && (
            <div
              className="absolute right-0 mt-2 w-64 p-1.5 rounded-2xl bg-light-primary/95 dark:bg-[#11151f]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Category 1: Reading Studio & Optics */}
              <div className="px-2.5 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                Reading Studio & Optics
              </div>

              {/* Submenu 1: Focus & Optics ⯈ */}
              <div
                className="relative"
                onMouseEnter={() => setActiveSubmenu('focus')}
              >
                <button
                  type="button"
                  onClick={() => setActiveSubmenu(activeSubmenu === 'focus' ? null : 'focus')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    activeSubmenu === 'focus' || hasActiveFocusTool
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-amber-500" />
                    <span>Focus & Optics</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasActiveFocusTool && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    <ChevronRight size={13} className="opacity-60" />
                  </div>
                </button>

                {/* Focus Tools Flyout Submenu */}
                {activeSubmenu === 'focus' && (
                  <div
                    className="absolute right-full top-0 mr-1.5 w-60 p-1.5 rounded-2xl bg-light-primary/95 dark:bg-[#11151f]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1"
                    onMouseEnter={() => setActiveSubmenu('focus')}
                  >
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      Focus Aids
                    </div>

                    {/* Reading Ruler */}
                    {onToggleRuler && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleRuler();
                          setToolsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                          rulerActive
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <ScanLine size={14} className="text-amber-500" />
                          <span>Reading Ruler</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-60">
                          {rulerActive ? 'Active' : 'Off'}
                        </span>
                      </button>
                    )}

                    {/* Text to Speech */}
                    {onToggleTts && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleTts();
                          setToolsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                          ttsActive
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                            : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Volume2 size={14} className="text-sky-500" />
                          <span>TTS Narration</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-60">
                          {ttsActive ? 'Playing' : 'Off'}
                        </span>
                      </button>
                    )}

                    {/* RSVP Speed Reader */}
                    {onOpenSpeedReader && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenSpeedReader();
                          setToolsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Gauge size={14} className="text-rose-500" />
                          <span>Speed Reader</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-60">RSVP</span>
                      </button>
                    )}

                    <div className="border-t border-light-200 dark:border-white/10 my-1" />

                    <div className="px-2.5 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                      Viewport Optics
                    </div>

                    {/* Continuous Scroll Toggle */}
                    {onTogglePageViewMode && (
                      <button
                        type="button"
                        onClick={() => {
                          onTogglePageViewMode();
                          setToolsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ScrollText
                            size={14}
                            className={pageViewMode === 'continuous' ? 'text-sky-500' : 'text-slate-400'}
                          />
                          <span>
                            {pageViewMode === 'continuous' ? 'Continuous Scroll' : 'Single Page'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                          {pageViewMode === 'continuous' ? 'Active' : 'Single'}
                        </span>
                      </button>
                    )}

                    {/* Fit Width */}
                    <button
                      type="button"
                      onClick={() => {
                        onFitWidth();
                        setToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
                    >
                      <Maximize2 size={14} />
                      <span>Fit to Width</span>
                    </button>

                    {/* Rotate Clockwise */}
                    <button
                      type="button"
                      onClick={() => {
                        onRotate();
                        setToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
                    >
                      <RotateCw size={14} />
                      <span>Rotate Clockwise</span>
                    </button>

                    {/* Fullscreen */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleFullscreen();
                        setToolsOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
                    >
                      {isFullscreen ? <Minimize size={14} /> : <Expand size={14} />}
                      <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Submenu 2: Split & Compare ⯈ */}
              {onToggleSplit && (
                <div
                  className="relative"
                  onMouseEnter={() => setActiveSubmenu('split')}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubmenu(activeSubmenu === 'split' ? null : 'split')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeSubmenu === 'split' || splitMode !== 'none'
                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                        : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Columns size={14} className="text-sky-500" />
                      <span>Split & Compare</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {splitMode !== 'none' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      )}
                      <ChevronRight size={13} className="opacity-60" />
                    </div>
                  </button>

                  {/* Split View Flyout Submenu */}
                  {activeSubmenu === 'split' && (
                    <div
                      className="absolute right-full top-0 mr-1.5 w-64 p-1.5 rounded-2xl bg-light-primary/95 dark:bg-[#11151f]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1"
                      onMouseEnter={() => setActiveSubmenu('split')}
                    >
                      <div className="px-2.5 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                        Document Comparison
                      </div>

                      {/* Option 1: Dual View of Same Document */}
                      <button
                        type="button"
                        onClick={() => {
                          onToggleSplit('same_doc');
                          setToolsOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                          splitMode === 'same_doc'
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                            : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="font-semibold flex items-center justify-between">
                          <span>Dual Page (Same Doc)</span>
                          {splitMode === 'same_doc' && (
                            <span className="text-[10px] font-mono">Active</span>
                          )}
                        </div>
                        <p className="text-[10px] text-black/50 dark:text-white/40 mt-0.5 leading-snug">
                          Compare results with appendix or figures side-by-side.
                        </p>
                      </button>

                      {/* Option 2: Compare with Another Document */}
                      <button
                        type="button"
                        onClick={() => {
                          onToggleSplit('diff_doc');
                          setToolsOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                          splitMode === 'diff_doc'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                            : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="font-semibold flex items-center justify-between">
                          <span>Compare Another File</span>
                          {splitMode === 'diff_doc' && (
                            <span className="text-[10px] font-mono">Active</span>
                          )}
                        </div>
                        <p className="text-[10px] text-black/50 dark:text-white/40 mt-0.5 leading-snug">
                          Open a second PDF, EPUB, or draft side-by-side.
                        </p>
                      </button>

                      {splitMode !== 'none' && (
                        <>
                          <div className="border-t border-light-200 dark:border-white/10 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              onToggleSplit('none');
                              setToolsOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            Exit Split View
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Direct Action 1: Mind Map & Concept Tree */}
              {onOpenMindMap && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMindMap();
                    setToolsOpen(false);
                  }}
                  onMouseEnter={() => setActiveSubmenu(null)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GitFork size={14} className="text-sky-500" />
                    <span>Mind Map & Concepts</span>
                  </div>
                  {mindMapNodesCount !== undefined && mindMapNodesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-600 dark:text-sky-300 font-mono font-semibold">
                      {mindMapNodesCount}
                    </span>
                  )}
                </button>
              )}

              {/* Direct Action 2: Canvas Cards Studio */}
              {onToggleCanvasCards && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleCanvasCards();
                    setToolsOpen(false);
                  }}
                  onMouseEnter={() => setActiveSubmenu(null)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={14} className="text-purple-500" />
                    <span>Concept Cards</span>
                  </div>
                  {cardsCount !== undefined && cardsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 font-mono font-semibold">
                      {cardsCount}
                    </span>
                  )}
                </button>
              )}

              <div className="border-t border-light-200 dark:border-white/10 my-1" />

              {/* Category 2: Studio Inspectors & Copilot */}
              <div className="px-2.5 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                Inspectors & AI Copilot
              </div>

              {/* Notes Inspector */}
              <button
                type="button"
                onClick={() => {
                  handleTabClick('notes');
                  setToolsOpen(false);
                }}
                onMouseEnter={() => setActiveSubmenu(null)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isNotesActive
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <StickyNote size={14} className="text-amber-500" />
                  <span>Margin Notes</span>
                </div>
                <div className="flex items-center gap-1">
                  {notesCount !== undefined && notesCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      {notesCount}
                    </span>
                  )}
                  {isNotesActive && <span className="text-[10px] font-mono text-amber-500">Active</span>}
                </div>
              </button>

              {/* Bilingual Reader */}
              <button
                type="button"
                onClick={() => {
                  handleTabClick('bilingual');
                  setToolsOpen(false);
                }}
                onMouseEnter={() => setActiveSubmenu(null)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isBilingualActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Languages size={14} className="text-emerald-500" />
                  <span>Bilingual Reader</span>
                </div>
                {isBilingualActive && (
                  <span className="text-[10px] font-mono text-emerald-500">Active</span>
                )}
              </button>

              {/* AI Research Chat Copilot */}
              <button
                type="button"
                onClick={() => {
                  handleTabClick('ai');
                  setToolsOpen(false);
                }}
                onMouseEnter={() => setActiveSubmenu(null)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isAiActive
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold'
                    : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-500" />
                  <span>AI Document Copilot</span>
                </div>
                {isAiActive && <span className="text-[10px] font-mono text-purple-500">Active</span>}
              </button>
            </div>
          )}
        </div>

        {/* Open Local File Button */}
        <button
          type="button"
          onClick={onOpenFile}
          title="Open Document File (PDF, EPUB, MOBI, TXT...)"
          className="px-3 py-1.5 rounded-xl bg-light-secondary dark:bg-white/10 hover:bg-light-200 dark:hover:bg-white/15 text-black/80 dark:text-white/90 text-xs font-medium border border-light-200 dark:border-white/10 transition-all flex items-center gap-1.5 shadow-xs"
        >
          <FolderOpen size={14} />
          <span className="text-[11px] font-medium">Open</span>
        </button>
      </div>
    </header>
  );
};
