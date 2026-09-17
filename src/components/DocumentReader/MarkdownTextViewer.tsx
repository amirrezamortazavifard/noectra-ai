import React, { useEffect, useRef, useState } from 'react';
import Markdown from 'markdown-to-jsx';
import { OutlineItem, TextSelectionInfo } from '@/components/PdfReader/types';
import { ZoomIn, ZoomOut, AlignLeft } from 'lucide-react';

interface MarkdownTextViewerProps {
  content: string;
  onTocLoaded?: (items: OutlineItem[]) => void;
  onSelectionChange?: (selection: TextSelectionInfo | null) => void;
}

export const MarkdownTextViewer: React.FC<MarkdownTextViewerProps> = ({
  content,
  onTocLoaded,
  onSelectionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>(16);

  // Extract headings into TOC
  useEffect(() => {
    if (!content) return;

    const lines = content.split('\n');
    const outline: OutlineItem[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const title = match[2].trim();
        outline.push({
          title,
          pageNumber: Math.max(1, Math.ceil((index + 1) / 40)), // Estimated page
        });
      }
    });

    if (outline.length > 0) {
      onTocLoaded?.(outline);
    }
  }, [content, onTocLoaded]);

  // Handle Text Selection for AI Popup & Highlights
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      onSelectionChange?.(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      onSelectionChange?.(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    onSelectionChange?.({
      text,
      pageNumber: 1,
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

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full overflow-y-auto bg-light-primary dark:bg-[#090d14] px-6 sm:px-12 md:px-20 py-10 select-text"
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Floating Font Controls */}
      <div className="fixed top-20 right-8 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#0f131a]/90 backdrop-blur-xl border border-white/10 shadow-xl text-white text-xs select-none">
        <button
          type="button"
          onClick={() => setFontSize((s) => Math.max(12, s - 2))}
          title="Decrease Font Size"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <span className="font-mono text-[11px] px-1">{fontSize}px</span>
        <button
          type="button"
          onClick={() => setFontSize((s) => Math.min(26, s + 2))}
          title="Increase Font Size"
          className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ZoomIn size={13} />
        </button>
      </div>

      {/* Main Document Content */}
      <div className="max-w-3xl mx-auto text-black/90 dark:text-white/90 leading-relaxed font-sans space-y-4">
        <Markdown
          options={{
            overrides: {
              h1: {
                props: {
                  className:
                    'text-2xl sm:text-3xl font-bold text-black dark:text-white mt-8 mb-4 border-b border-light-200 dark:border-white/10 pb-2',
                },
              },
              h2: {
                props: {
                  className:
                    'text-xl sm:text-2xl font-semibold text-black dark:text-white mt-6 mb-3',
                },
              },
              h3: {
                props: {
                  className:
                    'text-lg sm:text-xl font-medium text-black dark:text-white mt-4 mb-2',
                },
              },
              p: {
                props: {
                  className: 'text-black/80 dark:text-white/80 leading-7 my-3',
                },
              },
              pre: {
                props: {
                  className:
                    'bg-[#0f131a] text-sky-300 font-mono text-xs sm:text-sm p-4 rounded-2xl border border-white/10 overflow-x-auto my-4',
                },
              },
              code: {
                props: {
                  className:
                    'bg-sky-500/10 text-sky-400 font-mono text-xs px-1.5 py-0.5 rounded border border-sky-500/20',
                },
              },
              blockquote: {
                props: {
                  className:
                    'border-l-4 border-sky-500/60 pl-4 italic text-black/70 dark:text-white/70 my-3',
                },
              },
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    </div>
  );
};
