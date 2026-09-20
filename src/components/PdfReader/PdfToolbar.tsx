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
} from 'lucide-react';
import { PdfDocumentMeta, SplitViewMode } from './types';

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
}) => {
  const [pageInput, setPageInput] = useState<string>(currentPage.toString());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [focusToolsOpen, setFocusToolsOpen] = useState<boolean>(false);
  const focusToolsRef = useRef<HTMLDivElement>(null);
  const [splitMenuOpen, setSplitMenuOpen] = useState<boolean>(false);
  const splitMenuRef = useRef<HTMLDivElement>(null);

  // Close focus tools & split menu dropdowns when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (focusToolsRef.current && !focusToolsRef.current.contains(target)) {
        setFocusToolsOpen(false);
      }
      if (splitMenuRef.current && !splitMenuRef.current.contains(target)) {
        setSplitMenuOpen(false);
      }
    };
    if (focusToolsOpen || splitMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [focusToolsOpen, splitMenuOpen]);

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

      {/* ================= ISLAND 3: FOCUS AIDS & STUDIO INSPECTOR ================= */}
      <div className="flex items-center gap-2">
        {/* Focus Tools Popover Menu */}
        <div className="relative" ref={focusToolsRef}>
          <button
            type="button"
            onClick={() => setFocusToolsOpen((v) => !v)}
            title="Reading Aids & Optics Tools"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              focusToolsOpen || hasActiveFocusTool
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'bg-light-secondary dark:bg-white/5 border-light-200 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden lg:inline text-[11px]">Focus Tools</span>
            {hasActiveFocusTool && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
            <ChevronDown size={12} className={`transition-transform ${focusToolsOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Popover Dropdown */}
          {focusToolsOpen && (
            <div className="absolute right-0 mt-2 w-56 p-1.5 rounded-2xl bg-light-primary/95 dark:bg-[#11151f]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                Reading Aids
              </div>

              {/* Reading Ruler */}
              {onToggleRuler && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleRuler();
                    setFocusToolsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
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
                    setFocusToolsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
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
                    setFocusToolsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Gauge size={14} className="text-rose-500" />
                    <span>Speed Reader</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-60">RSVP</span>
                </button>
              )}

              <div className="border-t border-light-200 dark:border-white/10 my-1" />

              <div className="px-2 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                Viewport Optics
              </div>

              {/* Fit Width */}
              <button
                type="button"
                onClick={() => {
                  onFitWidth();
                  setFocusToolsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
              >
                <Maximize2 size={14} />
                <span>Fit to Width</span>
              </button>

              {/* Rotate Page */}
              <button
                type="button"
                onClick={() => {
                  onRotate();
                  setFocusToolsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
              >
                <RotateCw size={14} />
                <span>Rotate Clockwise</span>
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={() => {
                  toggleFullscreen();
                  setFocusToolsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5 transition-colors"
              >
                {isFullscreen ? <Minimize size={14} /> : <Expand size={14} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Split-View Document Comparison Dropdown */}
        {onToggleSplit && (
          <div className="relative" ref={splitMenuRef}>
            <button
              type="button"
              onClick={() => setSplitMenuOpen((v) => !v)}
              title="Split View & Document Comparison"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                splitMode !== 'none'
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'bg-light-secondary dark:bg-white/5 border-light-200 dark:border-white/10 text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10'
              }`}
            >
              <Columns size={14} />
              <span className="hidden lg:inline text-[11px]">
                {splitMode !== 'none' ? 'Split Active' : 'Split View'}
              </span>
              {splitMode !== 'none' && (
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              )}
              <ChevronDown size={12} className={`transition-transform ${splitMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Split Menu Dropdown */}
            {splitMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 p-1.5 rounded-2xl bg-light-primary/95 dark:bg-[#11151f]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-black/40 dark:text-white/40 uppercase tracking-wider">
                  Split & Comparison
                </div>

                {/* Option 1: Dual View of Same Document */}
                <button
                  type="button"
                  onClick={() => {
                    onToggleSplit('same_doc');
                    setSplitMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    splitMode === 'same_doc'
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>Dual Page (Same Doc)</span>
                    {splitMode === 'same_doc' && <span className="text-[10px] font-mono">Active</span>}
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
                    setSplitMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    splitMode === 'diff_doc'
                      ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                      : 'text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span>Compare Another File</span>
                    {splitMode === 'diff_doc' && <span className="text-[10px] font-mono">Active</span>}
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
                        setSplitMenuOpen(false);
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

        {/* Canvas Cards Studio Modal Button */}
        {onToggleCanvasCards && (
          <button
            type="button"
            onClick={onToggleCanvasCards}
            title="Open Research Canvas & Concept Cards Studio"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 text-xs font-medium transition-all"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline text-[11px]">Cards</span>
            {cardsCount !== undefined && cardsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-300 font-mono font-semibold">
                {cardsCount}
              </span>
            )}
          </button>
        )}

        {/* Studio Inspector Segmented Controller */}
        <div className="flex items-center bg-light-secondary/80 dark:bg-white/[0.04] border border-light-200 dark:border-white/10 rounded-2xl p-0.5 shadow-xs">
          {/* Notes Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick('notes')}
            title={isNotesActive ? 'Close Notes (Enter Zen Mode)' : 'Open Notes Inspector'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isNotesActive
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 font-semibold'
                : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
            }`}
          >
            <StickyNote size={14} />
            <span className="hidden sm:inline text-[11px]">Notes</span>
            {notesCount !== undefined && notesCount > 0 && (
              <span
                className={`text-[10px] px-1 rounded-full font-mono ${
                  isNotesActive ? 'bg-white/25 text-white' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                {notesCount}
              </span>
            )}
          </button>

          {/* Bilingual Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick('bilingual')}
            title={isBilingualActive ? 'Close Bilingual (Enter Zen Mode)' : 'Open Bilingual Parallel Reader'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isBilingualActive
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 font-semibold'
                : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
            }`}
          >
            <Languages size={14} />
            <span className="hidden sm:inline text-[11px]">Bilingual</span>
          </button>

          {/* AI Assistant Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick('ai')}
            title={isAiActive ? 'Close AI Assistant (Enter Zen Mode)' : 'Open AI Document Assistant'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isAiActive
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25 font-semibold'
                : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
            }`}
          >
            <Sparkles size={14} className={isAiActive ? 'text-amber-300 animate-pulse' : ''} />
            <span className="hidden sm:inline text-[11px]">AI Chat</span>
          </button>
        </div>

        {/* Open Local File */}
        <button
          type="button"
          onClick={onOpenFile}
          title="Open Document File (PDF, EPUB, MOBI, TXT...)"
          className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-light-secondary dark:bg-white/10 hover:bg-light-200 dark:hover:bg-white/15 text-black/80 dark:text-white/90 text-xs font-medium border border-light-200 dark:border-white/10 transition-all flex items-center gap-1.5"
        >
          <FolderOpen size={14} />
          <span className="hidden md:inline text-[11px]">Open</span>
        </button>
      </div>
    </header>
  );
};
