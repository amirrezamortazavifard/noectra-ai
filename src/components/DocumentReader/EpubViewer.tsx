import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import ePub, { Book, Rendition } from 'epubjs';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { OutlineItem } from '@/components/PdfReader/types';

interface EpubViewerProps {
  data: ArrayBuffer;
  onTocLoaded?: (items: OutlineItem[]) => void;
  onSelectionChange?: (text: string) => void;
}

export const EpubViewer: React.FC<EpubViewerProps> = ({
  data,
  onTocLoaded,
  onSelectionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);

  const [fontSize, setFontSize] = useState<number>(100); // percentage
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    let isDestroyed = false;

    try {
      // Initialize ePub
      const book = ePub(data);
      bookRef.current = book;

      const rendition = book.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated',
      });
      renditionRef.current = rendition;

      // Dark luxury styling injection
      rendition.themes.default({
        body: {
          background: 'transparent !important',
          color: '#e2e8f0 !important',
          'font-family': 'system-ui, -apple-system, sans-serif !important',
          'line-height': '1.75 !important',
          padding: '24px 32px !important',
        },
        p: {
          'margin-bottom': '1.25em !important',
        },
        'h1, h2, h3, h4': {
          color: '#ffffff !important',
          'font-weight': '600 !important',
        },
        a: {
          color: '#38bdf8 !important',
        },
      });

      rendition.display().then(() => {
        if (!isDestroyed) setIsReady(true);
      });

      // Handle location changes
      rendition.on('relocated', (location: any) => {
        if (location && location.start) {
          setCurrentLocation(location.start.cfi);
          if (location.start.displayed?.page) {
            setCurrentPage(location.start.displayed.page);
            setTotalPages(location.start.displayed.total || 1);
          }
        }
      });

      // Handle text selection
      rendition.on('selected', (_cfiRange: string, contents: any) => {
        const selection = contents.window.getSelection();
        if (selection) {
          const selectedText = selection.toString().trim();
          if (selectedText) {
            onSelectionChange?.(selectedText);
          }
        }
      });

      // Extract TOC
      book.loaded.navigation.then((nav: any) => {
        if (nav && nav.toc) {
          const mappedToc: OutlineItem[] = nav.toc.map((item: any, idx: number) => ({
            title: item.label || `Chapter ${idx + 1}`,
            pageNumber: idx + 1,
          }));
          onTocLoaded?.(mappedToc);
        }
      });
    } catch (err) {
      console.error('Failed to load EPUB:', err);
    }

    return () => {
      isDestroyed = true;
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch {}
      }
      if (bookRef.current) {
        try {
          bookRef.current.destroy();
        } catch {}
      }
    };
  }, [data]);

  // Adjust font size
  useEffect(() => {
    if (renditionRef.current && isReady) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize, isReady]);

  const handleNext = () => {
    renditionRef.current?.next();
  };

  const handlePrev = () => {
    renditionRef.current?.prev();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-light-primary dark:bg-[#090d14] overflow-hidden select-text">
      {/* Floating EPUB Nav Controls */}
      <div className="absolute top-4 right-8 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#0f131a]/90 backdrop-blur-xl border border-white/10 shadow-xl text-white text-xs">
        <button
          type="button"
          onClick={() => setFontSize((s) => Math.max(70, s - 10))}
          title="Decrease Font Size"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[11px] font-mono px-1">{fontSize}%</span>
        <button
          type="button"
          onClick={() => setFontSize((s) => Math.min(180, s + 10))}
          title="Increase Font Size"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ZoomIn size={14} />
        </button>

        <div className="w-px h-3.5 bg-white/15 mx-1" />

        <button
          type="button"
          onClick={handlePrev}
          title="Previous Page"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={handleNext}
          title="Next Page"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* EPUB Render Container */}
      <div
        ref={containerRef}
        className="flex-1 w-full max-w-4xl mx-auto h-full overflow-hidden"
      />
    </div>
  );
};
