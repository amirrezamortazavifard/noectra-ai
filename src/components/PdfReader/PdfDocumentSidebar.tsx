import React, { useState } from 'react';
import {
  ListTree,
  Highlighter,
  Info,
  ChevronRight,
  ChevronDown,
  Trash2,
  ExternalLink,
  Search,
  BookOpen,
  StickyNote,
} from 'lucide-react';
import { OutlineItem, Highlight, PdfDocumentMeta, HIGHLIGHT_COLORS } from './types';

interface PdfDocumentSidebarProps {
  isOpen: boolean;
  outline: OutlineItem[];
  highlights: Highlight[];
  meta: PdfDocumentMeta | null;
  currentPage: number;
  onNavigateToPage: (page: number) => void;
  onSelectHighlight?: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
  onClose: () => void;
}

export const PdfDocumentSidebar: React.FC<PdfDocumentSidebarProps> = ({
  isOpen,
  outline,
  highlights,
  meta,
  currentPage,
  onNavigateToPage,
  onSelectHighlight,
  onDeleteHighlight,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'outline' | 'highlights' | 'info'>('outline');
  const [filterQuery, setFilterQuery] = useState('');
  const [notesOnly, setNotesOnly] = useState(false);

  if (!isOpen) return null;

  const notesCount = highlights.filter((h) => Boolean(h.note?.trim())).length;

  const filteredHighlights = highlights.filter((h) => {
    if (notesOnly && !h.note?.trim()) return false;
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchText = h.text.toLowerCase().includes(q);
      const matchNote = h.note?.toLowerCase().includes(q);
      if (!matchText && !matchNote) return false;
    }
    return true;
  });

  return (
    <aside className="w-80 h-full border-r border-light-200 dark:border-white/10 bg-light-primary/95 dark:bg-[#0c0f14]/95 backdrop-blur-xl flex flex-col z-20 transition-all select-none">
      {/* Top Tabs */}
      <div className="flex items-center border-b border-light-200 dark:border-white/10 p-2 gap-1 bg-light-secondary/60 dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setActiveTab('outline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'outline'
              ? 'bg-light-primary dark:bg-white/10 text-black dark:text-white shadow-sm border border-light-200 dark:border-transparent'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
          }`}
        >
          <ListTree size={14} />
          <span>Outline</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('highlights')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'highlights'
              ? 'bg-light-primary dark:bg-white/10 text-black dark:text-white shadow-sm border border-light-200 dark:border-transparent'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
          }`}
        >
          <StickyNote size={13} />
          <span>Notes</span>
          {highlights.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-600 dark:text-sky-400 font-mono">
              {highlights.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center justify-center p-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'info'
              ? 'bg-light-primary dark:bg-white/10 text-black dark:text-white shadow-sm border border-light-200 dark:border-transparent'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
          }`}
          title="Document Info"
        >
          <Info size={14} />
        </button>
      </div>

      {/* Search & Filter for Highlights and Notes */}
      {activeTab === 'highlights' && highlights.length > 0 && (
        <div className="p-2 border-b border-light-200 dark:border-white/10 space-y-1.5">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-black/40 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search notes & quotes..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-black dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setNotesOnly(false)}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                !notesOnly
                  ? 'bg-light-secondary dark:bg-white/15 text-black dark:text-white'
                  : 'text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white'
              }`}
            >
              All ({highlights.length})
            </button>
            <button
              type="button"
              onClick={() => setNotesOnly(true)}
              className={`px-2 py-0.5 rounded-md font-medium flex items-center gap-1 transition-colors ${
                notesOnly
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-black/50 dark:text-white/40 hover:text-black dark:hover:text-white'
              }`}
            >
              <StickyNote size={10} />
              <span>With Notes ({notesCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {/* Outline Tab */}
        {activeTab === 'outline' && (
          <div>
            {outline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-black/40 dark:text-white/40">
                <BookOpen size={28} className="mb-2 opacity-50" />
                <p className="text-xs font-medium">No Outline Detected</p>
                <p className="text-[11px] mt-1 max-w-[180px]">
                  This PDF does not contain embedded bookmarks or table of contents.
                </p>
              </div>
            ) : (
              <OutlineTree
                items={outline}
                currentPage={currentPage}
                onNavigate={onNavigateToPage}
              />
            )}
          </div>
        )}

        {/* Highlights & Notes Tab */}
        {activeTab === 'highlights' && (
          <div className="space-y-2.5">
            {filteredHighlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-black/40 dark:text-white/40">
                <StickyNote size={28} className="mb-2 opacity-50 text-amber-500" />
                <p className="text-xs font-medium">No Notes or Highlights Found</p>
                <p className="text-[11px] mt-1 max-w-[200px]">
                  {notesOnly
                    ? 'No highlights with attached margin notes yet. Select text and click "Note" to create one.'
                    : 'Select any text in the PDF document to highlight, annotate, or ask AI.'}
                </p>
              </div>
            ) : (
              filteredHighlights.map((hl) => {
                const colorInfo = HIGHLIGHT_COLORS[hl.color] || HIGHLIGHT_COLORS.yellow;
                return (
                  <div
                    key={hl.id}
                    onClick={() => {
                      onNavigateToPage(hl.pageNumber);
                      onSelectHighlight?.(hl.id);
                    }}
                    className="group relative p-2.5 rounded-xl bg-light-secondary/70 dark:bg-white/[0.03] hover:bg-light-200 dark:hover:bg-white/[0.07] border border-light-200 dark:border-white/5 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: colorInfo.preview }}
                        />
                        <span className="text-[10px] font-mono font-medium text-sky-600 dark:text-sky-400">
                          Page {hl.pageNumber}
                        </span>
                        {hl.note && (
                          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                            <StickyNote size={9} />
                            <span>Note</span>
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHighlight(hl.id);
                        }}
                        title="Delete highlight & note"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <p className="text-xs text-black/80 dark:text-white/80 line-clamp-2 italic leading-relaxed border-l-2 pl-2 border-light-300 dark:border-white/20">
                      "{hl.text}"
                    </p>

                    {/* Note Content Preview */}
                    {hl.note && (
                      <div className="mt-2 p-2 rounded-lg bg-light-primary/80 dark:bg-black/40 border border-light-200 dark:border-white/10 text-[11px] text-black/90 dark:text-white/90 leading-relaxed font-sans line-clamp-3">
                        {hl.note}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-3 p-1 text-xs">
            <div className="p-3 rounded-xl bg-light-secondary/70 dark:bg-white/[0.03] border border-light-200 dark:border-white/5 space-y-2">
              <div>
                <span className="text-[10px] text-black/50 dark:text-white/40 block">Filename</span>
                <span className="font-medium text-black/90 dark:text-white/90 break-words">
                  {meta?.name || 'Unknown'}
                </span>
              </div>
              {meta?.title && (
                <div>
                  <span className="text-[10px] text-black/50 dark:text-white/40 block">Title</span>
                  <span className="text-black/80 dark:text-white/80">{meta.title}</span>
                </div>
              )}
              {meta?.author && (
                <div>
                  <span className="text-[10px] text-black/50 dark:text-white/40 block">Author</span>
                  <span className="text-black/80 dark:text-white/80">{meta.author}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] text-black/50 dark:text-white/40 block">Total Pages</span>
                <span className="text-black/80 dark:text-white/80">{meta?.pageCount || 1} pages</span>
              </div>
              {meta?.size ? (
                <div>
                  <span className="text-[10px] text-black/50 dark:text-white/40 block">Size</span>
                  <span className="text-black/80 dark:text-white/80">
                    {(meta.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

interface OutlineTreeProps {
  items: OutlineItem[];
  currentPage: number;
  onNavigate: (page: number) => void;
  level?: number;
}

const OutlineTree: React.FC<OutlineTreeProps> = ({
  items,
  currentPage,
  onNavigate,
  level = 0,
}) => {
  return (
    <div className={`space-y-0.5 ${level > 0 ? 'ml-3 pl-2 border-l border-white/5' : ''}`}>
      {items.map((item, index) => {
        const hasChildren = item.items && item.items.length > 0;
        const isCurrent = item.pageNumber === currentPage;

        return (
          <div key={`${item.title}-${index}`}>
            <button
              type="button"
              onClick={() => onNavigate(item.pageNumber)}
              className={`w-full text-left flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-colors ${
                isCurrent
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium'
                  : 'text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
              }`}
            >
              <span className="truncate pr-2">{item.title}</span>
              {item.pageNumber > 0 && (
                <span className="text-[10px] font-mono text-black/40 dark:text-white/40 shrink-0">
                  p.{item.pageNumber}
                </span>
              )}
            </button>
            {hasChildren && item.items && (
              <OutlineTree
                items={item.items}
                currentPage={currentPage}
                onNavigate={onNavigate}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
