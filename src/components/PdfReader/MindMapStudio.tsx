import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MindMapNode,
  MindMapLink,
  Highlight,
  CanvasCard,
  OutlineItem,
  PdfDocumentMeta,
  HighlightColor,
  HIGHLIGHT_COLORS,
} from './types';
import {
  GitFork,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Filter,
  X,
  Compass,
  FileText,
  StickyNote,
  Bookmark,
  HelpCircle,
  Lightbulb,
  ExternalLink,
  Sparkles,
  Download,
  Share2,
  Copy,
  Check,
  ChevronRight,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';

interface MindMapStudioProps {
  isOpen: boolean;
  meta: PdfDocumentMeta | null;
  outline: OutlineItem[];
  highlights: Highlight[];
  cards: CanvasCard[];
  currentPage: number;
  onClose: () => void;
  onNavigateToPage: (page: number, highlightId?: string) => void;
}

type LayoutType = 'tree' | 'radial';
type FilterType = 'all' | 'chapter' | 'highlight' | 'note' | 'concept' | 'question';

const NODE_TYPE_STYLES: Record<
  string,
  { icon: React.FC<any>; bg: string; border: string; text: string; label: string }
> = {
  root: {
    icon: Layers,
    bg: 'bg-gradient-to-r from-sky-600 to-indigo-600',
    border: 'border-sky-400',
    text: 'text-white',
    label: 'Document Root',
  },
  chapter: {
    icon: Compass,
    bg: 'bg-blue-500/15 dark:bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Section / Chapter',
  },
  highlight: {
    icon: FileText,
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    border: 'border-amber-500/40',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'Highlight',
  },
  note: {
    icon: StickyNote,
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Margin Note',
  },
  margin_note: {
    icon: StickyNote,
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Margin Note',
  },
  concept: {
    icon: Bookmark,
    bg: 'bg-purple-500/15 dark:bg-purple-500/20',
    border: 'border-purple-500/40',
    text: 'text-purple-600 dark:text-purple-400',
    label: 'Core Concept',
  },
  thought: {
    icon: Lightbulb,
    bg: 'bg-indigo-500/15 dark:bg-indigo-500/20',
    border: 'border-indigo-500/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    label: 'Thought',
  },
  summary: {
    icon: FileText,
    bg: 'bg-teal-500/15 dark:bg-teal-500/20',
    border: 'border-teal-500/40',
    text: 'text-teal-600 dark:text-teal-400',
    label: 'Key Summary',
  },
  question: {
    icon: HelpCircle,
    bg: 'bg-rose-500/15 dark:bg-rose-500/20',
    border: 'border-rose-500/40',
    text: 'text-rose-600 dark:text-rose-400',
    label: 'Question',
  },
};

export const MindMapStudio: React.FC<MindMapStudioProps> = ({
  isOpen,
  meta,
  outline,
  highlights,
  cards,
  currentPage,
  onClose,
  onNavigateToPage,
}) => {
  const [layout, setLayout] = useState<LayoutType>('tree');
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 60, y: 150 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Auto-generate graph nodes and links from document metadata, outline, highlights & cards
  const { nodes, links } = useMemo(() => {
    const generatedNodes: MindMapNode[] = [];
    const generatedLinks: MindMapLink[] = [];

    // 1. Root Node
    const rootId = 'root-doc';
    const docTitle = meta?.title || meta?.name || 'Document Knowledge Graph';
    generatedNodes.push({
      id: rootId,
      label: docTitle,
      type: 'root',
      note: meta?.author ? `By ${meta.author} · ${meta.pageCount || 1} Pages` : undefined,
    });

    // 2. Chapter / Structural Nodes (From PDF Table of Contents or Page Intervals)
    const chapterMap: { [id: string]: { id: string; pageNumber: number; title: string } } = {};

    if (outline && outline.length > 0) {
      outline.forEach((item, idx) => {
        const chId = `chapter-${idx}`;
        chapterMap[chId] = { id: chId, pageNumber: item.pageNumber, title: item.title };
        generatedNodes.push({
          id: chId,
          label: item.title,
          type: 'chapter',
          pageNumber: item.pageNumber,
          parentId: rootId,
        });
        generatedLinks.push({
          id: `link-root-${chId}`,
          sourceId: rootId,
          targetId: chId,
          label: `p. ${item.pageNumber}`,
        });
      });
    } else {
      // Fallback section clusters for documents without outline
      const totalP = meta?.pageCount || 1;
      const step = Math.max(1, Math.ceil(totalP / 4));
      for (let p = 1; p <= totalP; p += step) {
        const chId = `section-${p}`;
        const label = `Section: pp. ${p}–${Math.min(totalP, p + step - 1)}`;
        chapterMap[chId] = { id: chId, pageNumber: p, title: label };
        generatedNodes.push({
          id: chId,
          label,
          type: 'chapter',
          pageNumber: p,
          parentId: rootId,
        });
        generatedLinks.push({
          id: `link-root-${chId}`,
          sourceId: rootId,
          targetId: chId,
          label: `p. ${p}`,
        });
      }
    }

    // Helper: Find closest chapter for a given pageNumber
    const findClosestChapterId = (page: number): string => {
      const chList = Object.values(chapterMap);
      if (!chList.length) return rootId;
      // Find the last chapter with pageNumber <= page
      const matching = chList
        .filter((c) => c.pageNumber <= page)
        .sort((a, b) => b.pageNumber - a.pageNumber);
      return matching[0]?.id || chList[0].id;
    };

    // 3. Highlight & Margin Note Nodes
    highlights.forEach((hl) => {
      const parentChapterId = findClosestChapterId(hl.pageNumber);
      const isNote = Boolean(hl.note?.trim());
      const nodeId = `hl-${hl.id}`;

      generatedNodes.push({
        id: nodeId,
        label: isNote ? hl.note!.slice(0, 48) : hl.text.slice(0, 48) + '...',
        type: isNote ? 'note' : 'highlight',
        pageNumber: hl.pageNumber,
        color: hl.color,
        quote: hl.text,
        note: hl.note,
        tags: hl.tags,
        parentId: parentChapterId,
        highlightId: hl.id,
      });

      generatedLinks.push({
        id: `link-${parentChapterId}-${nodeId}`,
        sourceId: parentChapterId,
        targetId: nodeId,
        label: `p. ${hl.pageNumber}`,
      });
    });

    // 4. Concept Cards
    cards.forEach((card) => {
      const page = card.pageNumber || 1;
      const parentChapterId = findClosestChapterId(page);
      const nodeId = `card-${card.id}`;

      generatedNodes.push({
        id: nodeId,
        label: card.title || card.content.slice(0, 48) + '...',
        type: card.type || 'concept',
        pageNumber: page,
        color: card.color,
        quote: card.quote,
        note: card.content,
        tags: card.tags,
        parentId: parentChapterId,
      });

      generatedLinks.push({
        id: `link-${parentChapterId}-${nodeId}`,
        sourceId: parentChapterId,
        targetId: nodeId,
        label: `p. ${page}`,
      });
    });

    return { nodes: generatedNodes, links: generatedLinks };
  }, [meta, outline, highlights, cards]);

  // Compute Layout Coordinates (Tree vs. Radial)
  const layoutNodes = useMemo(() => {
    if (!nodes.length) return [];

    const root = nodes.find((n) => n.type === 'root') || nodes[0];
    const chapters = nodes.filter((n) => n.type === 'chapter');
    const leafNodes = nodes.filter((n) => n.type !== 'root' && n.type !== 'chapter');

    const positioned: Array<MindMapNode & { x: number; y: number }> = [];

    if (layout === 'tree') {
      // Hierarchical Horizontal Tree Layout
      // Level 0: Root (left)
      const rootX = 100;
      const rootY = Math.max(300, (chapters.length * 140) / 2);
      positioned.push({ ...root, x: rootX, y: rootY });

      // Level 1: Chapters (center-left)
      const chapterSpacing = 160;
      const chapterX = 440;
      const startChapterY = Math.max(80, rootY - ((chapters.length - 1) * chapterSpacing) / 2);

      const chapterYMap: Record<string, number> = {};

      chapters.forEach((ch, idx) => {
        const chY = startChapterY + idx * chapterSpacing;
        chapterYMap[ch.id] = chY;
        positioned.push({ ...ch, x: chapterX, y: chY });
      });

      // Level 2: Leaves (right)
      const leafX = 840;
      const leafSpacing = 85;

      // Group leaves by parent chapter
      const chapterChildren: Record<string, MindMapNode[]> = {};
      leafNodes.forEach((leaf) => {
        const pId = leaf.parentId || chapters[0]?.id || root.id;
        if (!chapterChildren[pId]) chapterChildren[pId] = [];
        chapterChildren[pId].push(leaf);
      });

      let currentLeafY = 60;
      chapters.forEach((ch) => {
        const children = chapterChildren[ch.id] || [];
        const chY = chapterYMap[ch.id] || 300;
        let startLeafY = Math.max(currentLeafY, chY - ((children.length - 1) * leafSpacing) / 2);

        children.forEach((child, cIdx) => {
          const y = startLeafY + cIdx * leafSpacing;
          positioned.push({ ...child, x: leafX, y });
        });

        currentLeafY = startLeafY + children.length * leafSpacing + 40;
      });
    } else {
      // Radial / Cluster Layout
      const centerX = 600;
      const centerY = 450;
      positioned.push({ ...root, x: centerX, y: centerY });

      // Chapter Ring
      const chapterRadius = 260;
      const chapterAngleStep = (2 * Math.PI) / Math.max(1, chapters.length);

      const chapterPosMap: Record<string, { x: number; y: number; angle: number }> = {};

      chapters.forEach((ch, idx) => {
        const angle = idx * chapterAngleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * chapterRadius;
        const y = centerY + Math.sin(angle) * chapterRadius;
        chapterPosMap[ch.id] = { x, y, angle };
        positioned.push({ ...ch, x, y });
      });

      // Leaf Ring
      const leafRadius = 460;
      const leafAngleStep = (2 * Math.PI) / Math.max(1, leafNodes.length);

      leafNodes.forEach((leaf, idx) => {
        const angle = idx * leafAngleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * leafRadius;
        const y = centerY + Math.sin(angle) * leafRadius;
        positioned.push({ ...leaf, x, y });
      });
    }

    return positioned;
  }, [nodes, layout]);

  // Node position dictionary for rendering SVG connection curves
  const nodePositionMap = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    layoutNodes.forEach((n) => {
      map[n.id] = { x: n.x, y: n.y };
    });
    return map;
  }, [layoutNodes]);

  // Filtered nodes based on search & filter category
  const filteredNodes = useMemo(() => {
    return layoutNodes.filter((node) => {
      if (filterType !== 'all' && node.type !== filterType && node.type !== 'root') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = node.label.toLowerCase().includes(q);
        const matchNote = node.note?.toLowerCase().includes(q);
        const matchQuote = node.quote?.toLowerCase().includes(q);
        return matchLabel || matchNote || matchQuote;
      }
      return true;
    });
  }, [layoutNodes, filterType, searchQuery]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return layoutNodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, layoutNodes]);

  // Drag canvas handlers for smooth panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on empty canvas
    if ((e.target as HTMLElement).closest('.mindmap-node-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.35, z * zoomFactor)));
  };

  // Jump from Mind Map node to PDF reader page
  const handleJumpToDocument = (node: MindMapNode) => {
    if (node.pageNumber) {
      soundService.play('page_flip');
      onNavigateToPage(node.pageNumber, node.highlightId);
      onClose();
      toast.success(`📌 Jumped to Page ${node.pageNumber}: "${node.label.slice(0, 32)}..."`);
    } else {
      toast.info('This node is not linked to a specific page.');
    }
  };

  // Export Mind Map as Markdown Outline
  const handleExportMarkdown = () => {
    const lines: string[] = [`# ${meta?.title || meta?.name || 'Document Mind Map'}`, ''];

    const chapters = nodes.filter((n) => n.type === 'chapter');
    chapters.forEach((ch) => {
      lines.push(`## ${ch.label} (Page ${ch.pageNumber || 1})`);
      const leaves = nodes.filter((n) => n.parentId === ch.id);
      leaves.forEach((l) => {
        const typeLabel = l.type.toUpperCase();
        lines.push(`- **[${typeLabel} · p.${l.pageNumber || ''}]** ${l.label}`);
        if (l.quote) lines.push(`  > "${l.quote.trim()}"`);
        if (l.note) lines.push(`  *Note*: ${l.note.trim()}`);
      });
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    soundService.play('pop');
    toast.success('Mind Map outline copied to clipboard as Markdown!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full h-full flex flex-col bg-light-primary dark:bg-[#080b11] text-black dark:text-white select-none overflow-hidden">
        {/* Top Header Controls Island */}
        <header className="h-14 px-4 border-b border-light-200 dark:border-white/10 bg-light-primary/95 dark:bg-[#0c1018]/95 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0 z-30">
          {/* Left: Branding & Meta */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-500 dark:text-sky-400 border border-sky-500/30">
              <GitFork size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-black/90 dark:text-white truncate max-w-xs sm:max-w-md">
                  Visual Knowledge Graph & Mind Map
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[10px] font-mono font-semibold border border-sky-500/20">
                  {nodes.length} Concepts
                </span>
              </div>
              <p className="text-[11px] text-black/50 dark:text-white/40 truncate">
                {meta?.title || meta?.name || 'Document Analysis'}
              </p>
            </div>
          </div>

          {/* Center: Search & Filter Capsule */}
          <div className="hidden md:flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search concepts, quotes, or notes..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 text-xs text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-sky-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center bg-light-secondary/80 dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-xl p-0.5 text-[10px]">
              {(['all', 'chapter', 'highlight', 'note', 'concept'] as FilterType[]).map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFilterType(ft)}
                  className={`px-2 py-1 rounded-lg capitalize transition-colors ${
                    filterType === ft
                      ? 'bg-sky-500 text-white font-semibold shadow-xs'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Layout Switcher, Export, Zoom & Close */}
          <div className="flex items-center gap-2">
            {/* Layout Toggle (Tree vs. Radial) */}
            <div className="flex items-center bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLayout('tree')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  layout === 'tree'
                    ? 'bg-sky-500 text-white font-semibold shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
                title="Hierarchical Tree Layout"
              >
                <Layers size={13} />
                <span className="hidden sm:inline text-[11px]">Tree</span>
              </button>
              <button
                type="button"
                onClick={() => setLayout('radial')}
                className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  layout === 'radial'
                    ? 'bg-sky-500 text-white font-semibold shadow-xs'
                    : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                }`}
                title="Radial Cluster Layout"
              >
                <Compass size={13} />
                <span className="hidden sm:inline text-[11px]">Radial</span>
              </button>
            </div>

            {/* Export Markdown Outline */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              title="Copy Concept Tree as Markdown Outline"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-light-secondary dark:bg-white/5 hover:bg-light-200 dark:hover:bg-white/10 border border-light-200 dark:border-white/10 text-xs font-medium text-black/80 dark:text-white/80 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span className="hidden lg:inline text-[11px]">{copied ? 'Copied' : 'Export'}</span>
            </button>

            {/* Close Studio */}
            <button
              type="button"
              onClick={onClose}
              title="Exit Mind Map Studio"
              className="p-2 rounded-xl bg-light-secondary dark:bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 border border-light-200 dark:border-white/10 text-black/70 dark:text-white/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Main Interactive Canvas Area */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 relative overflow-hidden bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] dark:from-[#080b11] dark:via-[#090d16] dark:to-[#06080d] cursor-${
            isDragging ? 'grabbing' : 'grab'
          }`}
        >
          {/* Subtle Canvas Dot Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25 dark:opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* Transformed Canvas Container */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* SVG Connector Curves */}
            <svg
              className="absolute inset-0 overflow-visible pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {links.map((link) => {
                const source = nodePositionMap[link.sourceId];
                const target = nodePositionMap[link.targetId];
                if (!source || !target) return null;

                const isSelected =
                  selectedNodeId === link.sourceId || selectedNodeId === link.targetId;

                // Cubic Bezier curve for horizontal tree or radial
                let pathD = '';
                if (layout === 'tree') {
                  const dx = target.x - source.x;
                  const cp1x = source.x + dx * 0.45;
                  const cp2x = source.x + dx * 0.55;
                  pathD = `M ${source.x + 120} ${source.y + 24} C ${cp1x} ${source.y + 24}, ${cp2x} ${
                    target.y + 24
                  }, ${target.x} ${target.y + 24}`;
                } else {
                  pathD = `M ${source.x + 80} ${source.y + 20} Q ${(source.x + target.x) / 2} ${
                    (source.y + target.y) / 2
                  } ${target.x} ${target.y + 20}`;
                }

                return (
                  <g key={link.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isSelected ? '#38bdf8' : 'currentColor'}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      strokeDasharray={link.sourceId.startsWith('root') ? 'none' : '4 3'}
                      className={`transition-all ${
                        isSelected
                          ? 'text-sky-400 opacity-100'
                          : 'text-slate-400 dark:text-white/20 opacity-60'
                      }`}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Interactive Concept Nodes */}
            {filteredNodes.map((node) => {
              const config = NODE_TYPE_STYLES[node.type] || NODE_TYPE_STYLES.concept;
              const Icon = config.icon;
              const isSelected = selectedNodeId === node.id;
              const isRoot = node.type === 'root';
              const isChapter = node.type === 'chapter';

              const colorDef = node.color ? HIGHLIGHT_COLORS[node.color] : undefined;

              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    soundService.play('pop');
                    setSelectedNodeId(node.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (node.pageNumber) {
                      handleJumpToDocument(node);
                    }
                  }}
                  style={{
                    transform: `translate(${node.x}px, ${node.y}px)`,
                    borderColor: isSelected ? '#38bdf8' : colorDef?.border,
                  }}
                  className={`mindmap-node-card absolute pointer-events-auto cursor-pointer rounded-2xl p-3 border transition-all duration-150 backdrop-blur-xl ${
                    isRoot
                      ? 'w-72 bg-gradient-to-br from-sky-600/90 to-indigo-700/90 text-white shadow-xl shadow-sky-600/25 border-white/20 scale-105'
                      : isChapter
                      ? 'w-64 bg-light-primary/95 dark:bg-[#111624]/95 text-black dark:text-white shadow-lg border-blue-500/30'
                      : 'w-60 bg-light-primary/90 dark:bg-[#0f131d]/90 text-black dark:text-white shadow-md border-light-200 dark:border-white/10'
                  } ${
                    isSelected
                      ? 'ring-2 ring-sky-400 shadow-2xl scale-105 z-30'
                      : 'hover:scale-102 hover:shadow-xl z-10'
                  }`}
                >
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`p-1 rounded-md ${
                          isRoot ? 'bg-white/20 text-white' : config.bg + ' ' + config.text
                        }`}
                      >
                        <Icon size={12} />
                      </div>
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-60">
                        {config.label}
                      </span>
                    </div>

                    {node.pageNumber && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/10 dark:bg-white/10 text-black/70 dark:text-white/70">
                        p.{node.pageNumber}
                      </span>
                    )}
                  </div>

                  {/* Title / Label */}
                  <h3
                    className={`text-xs font-semibold leading-snug line-clamp-2 ${
                      isRoot ? 'text-white' : 'text-black/90 dark:text-white'
                    }`}
                  >
                    {node.label}
                  </h3>

                  {/* Quote or Note Snippet */}
                  {node.quote && (
                    <p className="text-[10px] text-black/60 dark:text-white/50 mt-1 line-clamp-2 italic border-l-2 border-sky-400 pl-1.5">
                      "{node.quote}"
                    </p>
                  )}

                  {/* Tags */}
                  {node.tags && node.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {node.tags.slice(0, 2).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-light-secondary dark:bg-white/5 text-black/50 dark:text-white/50"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Canvas Navigation & Zoom Controller */}
          <div className="absolute bottom-5 left-5 z-40 flex items-center bg-light-primary/95 dark:bg-[#111624]/95 backdrop-blur-xl border border-light-200 dark:border-white/10 rounded-2xl p-1 shadow-2xl space-x-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
              title="Zoom Out"
              className="p-1.5 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-2 text-[11px] font-mono font-medium text-black/80 dark:text-white/80 select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              title="Zoom In"
              className="p-1.5 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
            >
              <ZoomIn size={14} />
            </button>
            <div className="w-px h-4 bg-light-200 dark:border-white/10 mx-1" />
            <button
              type="button"
              onClick={() => {
                setZoom(1.0);
                setPan({ x: 60, y: 150 });
              }}
              title="Reset View"
              className="p-1.5 rounded-xl text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Node Inspector Drawer (Right Side) */}
          {selectedNode && (
            <div className="absolute top-5 right-5 w-80 max-h-[82vh] overflow-y-auto custom-scrollbar z-40 p-4 rounded-2xl bg-light-primary/95 dark:bg-[#111624]/95 backdrop-blur-2xl border border-light-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-right-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-sky-500 dark:text-sky-400">
                    Concept Inspector
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNodeId(null)}
                  className="p-1 rounded-lg text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-black/90 dark:text-white leading-tight">
                {selectedNode.label}
              </h3>

              {/* Page Number & Type Badges */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-semibold">
                  Type: {selectedNode.type}
                </span>
                {selectedNode.pageNumber && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                    Page {selectedNode.pageNumber}
                  </span>
                )}
              </div>

              {/* Original Quote Excerpt */}
              {selectedNode.quote && (
                <div className="p-2.5 rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-black/40 dark:text-white/40">
                    Excerpt Citation
                  </span>
                  <p className="text-xs text-black/80 dark:text-white/80 italic leading-relaxed">
                    "{selectedNode.quote}"
                  </p>
                </div>
              )}

              {/* Note Content */}
              {selectedNode.note && (
                <div className="p-2.5 rounded-xl bg-light-secondary dark:bg-white/5 border border-light-200 dark:border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono font-bold text-black/40 dark:text-white/40">
                    Research Note
                  </span>
                  <p className="text-xs text-black/90 dark:text-white whitespace-pre-wrap leading-relaxed">
                    {selectedNode.note}
                  </p>
                </div>
              )}

              {/* Primary Action: Jump to Document */}
              {selectedNode.pageNumber && (
                <button
                  type="button"
                  onClick={() => handleJumpToDocument(selectedNode)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition-all hover:scale-102 active:scale-98"
                >
                  <span>Jump to Document (Page {selectedNode.pageNumber})</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
