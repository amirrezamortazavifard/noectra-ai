export type HighlightColor = 'yellow' | 'green' | 'cyan' | 'rose' | 'purple';

export interface HighlightRect {
  x: number; // percentage of page width
  y: number; // percentage of page height
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  documentId: string;
  pageNumber: number;
  text: string;
  color: HighlightColor;
  rects?: HighlightRect[];
  anchorY?: number; // percentage from top of page (0 to 100)
  timestamp: number;
  note?: string;
  tags?: string[];
  updatedAt?: number;
}

export type CanvasCardType = 'margin_note' | 'thought' | 'concept' | 'summary' | 'question';

export interface CanvasCard {
  id: string;
  documentId: string;
  pageNumber?: number;
  highlightId?: string;
  type: CanvasCardType;
  title?: string;
  content: string;
  quote?: string;
  color: HighlightColor;
  tags?: string[];
  anchorY?: number;
  timestamp: number;
  updatedAt?: number;
}

export interface OutlineItem {
  title: string;
  pageNumber: number;
  items?: OutlineItem[];
}

export interface PdfDocumentMeta {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  title?: string;
  author?: string;
}

export interface TextSelectionInfo {
  text: string;
  pageNumber: number;
  rects?: HighlightRect[];
  anchorY?: number;
  clientRect: {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
  };
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  excerpt?: string;
  pageNumber?: number;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ParagraphTranslation {
  id: string;
  index: number;
  original: string;
  translated: string;
}

export interface DictionaryLookupResult {
  term: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  translation: string;
  academicContext?: string;
  example?: string;
}

export interface DictionaryPopupState {
  term: string;
  contextSentence: string;
  clientRect: {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
  };
  result?: DictionaryLookupResult;
  loading: boolean;
}

export const HIGHLIGHT_COLORS: Record<
  HighlightColor,
  { name: string; bg: string; border: string; preview: string; text: string }
> = {
  yellow: {
    name: 'Amber Glow',
    bg: 'rgba(250, 204, 21, 0.35)',
    border: 'rgb(234, 179, 8)',
    preview: '#facc15',
    text: 'text-amber-300',
  },
  green: {
    name: 'Emerald Sea',
    bg: 'rgba(52, 211, 153, 0.35)',
    border: 'rgb(16, 185, 129)',
    preview: '#34d399',
    text: 'text-emerald-300',
  },
  cyan: {
    name: 'Sky Azure',
    bg: 'rgba(56, 189, 248, 0.35)',
    border: 'rgb(14, 165, 233)',
    preview: '#38bdf8',
    text: 'text-sky-300',
  },
  rose: {
    name: 'Coral Rose',
    bg: 'rgba(251, 113, 133, 0.35)',
    border: 'rgb(244, 63, 94)',
    preview: '#fb7185',
    text: 'text-rose-300',
  },
  purple: {
    name: 'Electric Violet',
    bg: 'rgba(192, 132, 252, 0.35)',
    border: 'rgb(168, 85, 247)',
    preview: '#c084fc',
    text: 'text-purple-300',
  },
};

export type SplitViewMode = 'none' | 'same_doc' | 'diff_doc';
export type SplitRatio = '50-50' | '60-40' | '40-60';

export interface SplitViewState {
  mode: SplitViewMode;
  splitPage: number;
  splitScale: number;
  syncScroll: boolean;
  splitRatio: SplitRatio;
  secondaryMeta?: PdfDocumentMeta | null;
}

