import React, { useState } from 'react';
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
  Bookmark,
  Expand,
  Minimize,
  Volume2,
  ScanLine,
  Gauge,
} from 'lucide-react';
import { PdfDocumentMeta } from './types';

interface PdfToolbarProps {
  meta: PdfDocumentMeta | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  rulerActive?: boolean;
  ttsActive?: boolean;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth: () => void;
  onRotate: () => void;
  onToggleSidebar: () => void;
  onToggleAiPanel: () => void;
  onToggleRuler?: () => void;
  onToggleTts?: () => void;
  onOpenSpeedReader?: () => void;
  onOpenFile: () => void;
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  meta,
  currentPage,
  totalPages,
  scale,
  sidebarOpen,
  aiPanelOpen,
  rulerActive,
  ttsActive,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onRotate,
  onToggleSidebar,
  onToggleAiPanel,
  onToggleRuler,
  onToggleTts,
  onOpenSpeedReader,
  onOpenFile,
}) => {
  const [pageInput, setPageInput] = useState<string>(currentPage.toString());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  React.useEffect(() => {
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

  return (
    <header className="h-14 border-b border-light-200 dark:border-white/10 bg-light-primary/80 dark:bg-[#0c0f14]/90 backdrop-blur-md px-4 flex items-center justify-between select-none z-30 transition-all">
      {/* Left Section: Sidebar Toggle & Doc Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide Outline & Highlights' : 'Show Outline & Highlights'}
          className="p-2 rounded-xl text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <h1
              className="text-xs sm:text-sm font-semibold text-black/90 dark:text-white/90 truncate max-w-[140px] sm:max-w-[260px] md:max-w-[340px]"
              title={meta?.title || meta?.name || 'PDF Document'}
            >
              {meta?.title || meta?.name || 'Untitled Document'}
            </h1>
            {meta?.author && (
              <p className="text-[10px] text-black/50 dark:text-white/40 truncate max-w-[200px]">
                {meta.author}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Center Section: Navigation & Zoom */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Page Switcher */}
        <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            title="Previous Page (Left Arrow)"
            className="p-1.5 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <form onSubmit={handlePageSubmit} className="flex items-center px-1.5">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageSubmit}
              className="w-8 text-center text-xs font-mono font-medium bg-transparent text-black dark:text-white focus:outline-none focus:bg-light-200 dark:focus:bg-white/10 rounded"
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
            className="p-1.5 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden md:flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-xl p-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out"
            className="p-1.5 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ZoomOut size={16} />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className="px-2 py-1 text-[11px] font-mono text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            disabled={scale >= 3.0}
            title="Zoom In"
            className="p-1.5 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* View Tools: Fit Width & Rotate */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={onFitWidth}
            title="Fit to Width"
            className="p-1.5 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
          >
            <Maximize2 size={16} />
          </button>

          <button
            type="button"
            onClick={onRotate}
            title="Rotate Clockwise (90°)"
            className="p-1.5 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
          >
            <RotateCw size={16} />
          </button>

          <div className="w-px h-4 bg-light-200 dark:bg-white/10 mx-0.5" />

          {/* Reading Ruler Toggle */}
          {onToggleRuler && (
            <button
              type="button"
              onClick={onToggleRuler}
              title={rulerActive ? 'Disable Reading Ruler' : 'Enable Reading Ruler (Focus Guide)'}
              className={`p-1.5 rounded-lg transition-colors ${
                rulerActive
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
              }`}
            >
              <ScanLine size={16} />
            </button>
          )}

          {/* TTS Audio Narration Toggle */}
          {onToggleTts && (
            <button
              type="button"
              onClick={onToggleTts}
              title={ttsActive ? 'Close TTS Narration' : 'Start Text-to-Speech (TTS) Narration'}
              className={`p-1.5 rounded-lg transition-colors ${
                ttsActive
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'
              }`}
            >
              <Volume2 size={16} />
            </button>
          )}

          {/* Speed Reader RSVP */}
          {onOpenSpeedReader && (
            <button
              type="button"
              onClick={onOpenSpeedReader}
              title="Open RSVP Speed Reader"
              className="p-1.5 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors"
            >
              <Gauge size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Right Section: Open File & AI Assistant Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFile}
          title="Open Local PDF File"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-light-secondary dark:bg-white/10 hover:bg-light-200 dark:hover:bg-white/15 text-black/80 dark:text-white/90 text-xs font-medium border border-light-200 dark:border-white/10 transition-all hover:scale-105"
        >
          <FolderOpen size={15} />
          <span className="hidden sm:inline">Open PDF</span>
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          className="hidden sm:flex p-2 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
        >
          {isFullscreen ? <Minimize size={16} /> : <Expand size={16} />}
        </button>

        {/* AI Assistant Toggle Button */}
        <button
          type="button"
          onClick={onToggleAiPanel}
          title={aiPanelOpen ? 'Close AI Assistant' : 'Open AI Document Assistant'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            aiPanelOpen
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-sky-400'
              : 'bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black/80 dark:text-white/80 hover:bg-light-200 dark:hover:bg-white/10'
          }`}
        >
          <Sparkles
            size={14}
            className={aiPanelOpen ? 'text-amber-300 animate-pulse' : 'text-sky-500 dark:text-sky-400'}
          />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      </div>
    </header>
  );
};
