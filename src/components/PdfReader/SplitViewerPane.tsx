import React from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  PdfDocumentMeta,
  Highlight,
  SplitViewMode,
  SplitRatio,
  TextSelectionInfo,
  DictionaryLookupResult,
} from './types';
import { PdfViewer } from './PdfViewer';
import { EpubViewer } from '@/components/DocumentReader/EpubViewer';
import { MarkdownTextViewer } from '@/components/DocumentReader/MarkdownTextViewer';
import { ComicViewer } from '@/components/DocumentReader/ComicViewer';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  X,
  FolderOpen,
  Split,
  Upload,
} from 'lucide-react';

interface SplitViewerPaneProps {
  mode: SplitViewMode;
  docType: 'pdf' | 'epub' | 'cbz' | 'markdown';
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  epubData?: ArrayBuffer | null;
  cbzData?: ArrayBuffer | null;
  markdownContent?: string | null;
  meta: PdfDocumentMeta | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  rotation: number;
  syncScroll: boolean;
  splitRatio: SplitRatio;
  highlights: Highlight[];
  activeNoteId?: string | null;
  targetLanguage?: string;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleSync: () => void;
  onChangeRatio: (ratio: SplitRatio) => void;
  onOpenComparisonFile: () => void;
  onCloseSplit: () => void;
  onSelectNote?: (id: string | null) => void;
  onSelectionChange?: (sel: TextSelectionInfo | null) => void;
  onSaveDictionaryCard?: (res: DictionaryLookupResult) => void;
}

export const SplitViewerPane: React.FC<SplitViewerPaneProps> = ({
  mode,
  docType,
  pdfDoc,
  epubData,
  cbzData,
  markdownContent,
  meta,
  currentPage,
  totalPages,
  scale,
  rotation,
  syncScroll,
  splitRatio,
  highlights,
  activeNoteId,
  targetLanguage,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleSync,
  onChangeRatio,
  onOpenComparisonFile,
  onCloseSplit,
  onSelectNote,
  onSelectionChange,
  onSaveDictionaryCard,
}) => {
  const isSameDoc = mode === 'same_doc';

  return (
    <div className="flex-1 h-full flex flex-col border-l-2 border-sky-500/30 bg-light-primary dark:bg-[#07090e] overflow-hidden shadow-2xl relative select-none">
      {/* Split Pane Control Header */}
      <div className="h-11 px-3 border-b border-light-200 dark:border-white/10 bg-light-secondary/90 dark:bg-[#0b0e15]/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-20">
        {/* Left: Document Info Badge & File Switch */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-sky-500/15 text-sky-500 dark:text-sky-400">
            <Split size={14} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-black/90 dark:text-white truncate max-w-[140px] sm:max-w-[180px]">
                {isSameDoc ? 'Dual View' : meta?.title || meta?.name || 'Comparison Doc'}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono uppercase tracking-wider ${
                  isSameDoc
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                }`}
              >
                {isSameDoc ? 'Appendix / Ref' : 'External'}
              </span>
            </div>
          </div>

          {/* Quick Switch to Different File */}
          <button
            type="button"
            onClick={onOpenComparisonFile}
            title="Open a different document to compare"
            className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-light-primary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 border border-light-200 dark:border-white/10 text-[11px] text-black/70 dark:text-white/70 transition-colors"
          >
            <FolderOpen size={11} />
            <span>Open Other</span>
          </button>
        </div>

        {/* Center: Independent Navigation & Zoom */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Page Navigator */}
          <div className="flex items-center bg-light-primary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-xl p-0.5 text-xs font-mono">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="p-1 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-1.5 text-[11px] text-black/80 dark:text-white/90 font-semibold select-none">
              p.{currentPage} <span className="opacity-40 font-normal">/ {totalPages || 1}</span>
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className="p-1 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-light-primary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-xl p-0.5 text-xs font-mono">
            <button
              type="button"
              disabled={scale <= 0.5}
              onClick={onZoomOut}
              className="p-1 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              className="px-1.5 text-[10px] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              disabled={scale >= 3.0}
              onClick={onZoomIn}
              className="p-1 rounded-lg text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        {/* Right: Sync Lock, Ratio Pills & Close */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Synchronized Navigation Toggle */}
          <button
            type="button"
            onClick={onToggleSync}
            title={
              syncScroll
                ? 'Disable Synchronized Navigation (Currently Locked)'
                : 'Enable Synchronized Navigation (Lock Left & Right Scrolling Together)'
            }
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
              syncScroll
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs'
                : 'bg-light-primary dark:bg-white/5 border-light-200 dark:border-white/10 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            {syncScroll ? <Lock size={12} className="text-amber-500 animate-pulse" /> : <Unlock size={12} />}
            <span className="hidden lg:inline text-[10px] font-mono">
              {syncScroll ? 'Sync Locked' : 'Independent'}
            </span>
          </button>

          {/* Split Ratio Presets */}
          <div className="hidden xl:flex items-center bg-light-primary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-lg p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => onChangeRatio('50-50')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                splitRatio === '50-50'
                  ? 'bg-sky-500 text-white font-semibold shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              50:50
            </button>
            <button
              type="button"
              onClick={() => onChangeRatio('60-40')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                splitRatio === '60-40'
                  ? 'bg-sky-500 text-white font-semibold shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              60:40
            </button>
            <button
              type="button"
              onClick={() => onChangeRatio('40-60')}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                splitRatio === '40-60'
                  ? 'bg-sky-500 text-white font-semibold shadow-xs'
                  : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
            >
              40:60
            </button>
          </div>

          {/* Close Split View */}
          <button
            type="button"
            onClick={onCloseSplit}
            title="Exit Split-View (Return to Single Document View)"
            className="p-1.5 rounded-lg text-black/50 dark:text-white/50 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Split Viewer Content Canvas */}
      <div className="flex-1 relative overflow-hidden flex">
        {docType === 'pdf' && pdfDoc ? (
          <PdfViewer
            pdfDoc={pdfDoc}
            currentPage={currentPage}
            scale={scale}
            rotation={rotation}
            highlights={highlights}
            activeNoteId={activeNoteId}
            targetLanguage={targetLanguage}
            onSelectNote={onSelectNote}
            onSelectionChange={onSelectionChange || (() => {})}
            onPageChange={onPageChange}
            onSaveDictionaryCard={onSaveDictionaryCard}
          />
        ) : docType === 'epub' && epubData ? (
          <EpubViewer data={epubData} onSelectionChange={() => {}} />
        ) : docType === 'cbz' && cbzData ? (
          <ComicViewer data={cbzData} onPageChange={onPageChange} />
        ) : docType === 'markdown' && markdownContent ? (
          <MarkdownTextViewer content={markdownContent} onSelectionChange={() => {}} />
        ) : (
          /* Empty / Prompt to pick comparison document */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-light-secondary/30 dark:bg-white/[0.01]">
            <div
              onClick={onOpenComparisonFile}
              className="p-8 rounded-2xl border-2 border-dashed border-light-300 dark:border-white/10 hover:border-sky-500/50 bg-light-primary dark:bg-white/[0.02] cursor-pointer flex flex-col items-center justify-center space-y-2 transition-all hover:scale-102"
            >
              <div className="p-3 rounded-full bg-sky-500/10 text-sky-500 dark:text-sky-400">
                <Upload size={24} />
              </div>
              <p className="text-xs font-semibold text-black/90 dark:text-white">
                Select Comparison Document
              </p>
              <p className="text-[11px] text-black/50 dark:text-white/40 max-w-xs">
                Open a second paper, appendix draft, or translated document to compare side-by-side.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
