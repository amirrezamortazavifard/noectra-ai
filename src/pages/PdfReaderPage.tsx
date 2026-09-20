import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  Upload,
  BookOpen,
  Sparkles,
  Highlighter,
  Clock,
  Trash2,
  FolderOpen,
  Plus,
  Compass,
  Volume2,
  ScanLine,
  Gauge,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { soundService } from '@/lib/sound/soundService';

import {
  PdfDocumentMeta,
  OutlineItem,
  Highlight,
  HighlightColor,
  TextSelectionInfo,
  CanvasCard,
  DictionaryLookupResult,
  SplitViewMode,
  SplitRatio,
} from '@/components/PdfReader/types';
import { PdfToolbar } from '@/components/PdfReader/PdfToolbar';
import { PdfViewer } from '@/components/PdfReader/PdfViewer';
import { PdfDocumentSidebar } from '@/components/PdfReader/PdfDocumentSidebar';
import { PdfSelectionPopup } from '@/components/PdfReader/PdfSelectionPopup';
import { CanvasCardsStudio } from '@/components/PdfReader/CanvasCardsStudio';
import { RightStudioPanel, StudioTab } from '@/components/PdfReader/RightStudioPanel';
import { SplitViewerPane } from '@/components/PdfReader/SplitViewerPane';

// New Advanced Features: Multi-format viewers, TTS, Reading Ruler, Speed Reader, RAG
import { EpubViewer } from '@/components/DocumentReader/EpubViewer';
import { MarkdownTextViewer } from '@/components/DocumentReader/MarkdownTextViewer';
import { ComicViewer } from '@/components/DocumentReader/ComicViewer';
import { parseFb2Xml, parseMobiBuffer } from '@/components/DocumentReader/formatParsers';
import { DocumentTtsBar } from '@/components/DocumentReader/DocumentTtsBar';
import { ReadingRulerOverlay } from '@/components/DocumentReader/ReadingRulerOverlay';
import { RsvpSpeedReaderModal } from '@/components/DocumentReader/RsvpSpeedReaderModal';
import { indexDocument } from '@/lib/rag/ragEngine';
import { isDocumentIndexed } from '@/lib/rag/vectorStore';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type SupportedDocType = 'pdf' | 'epub' | 'cbz' | 'markdown';

export default function PdfReaderPage() {
  // Document Type & Data State
  const [docType, setDocType] = useState<SupportedDocType>('pdf');
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [cbzData, setCbzData] = useState<ArrayBuffer | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);

  const [meta, setMeta] = useState<PdfDocumentMeta | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [rotation, setRotation] = useState<number>(0);
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  // Panels: Left outline sidebar & Unified Right Studio ('notes' | 'bilingual' | 'ai' | null)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [studioTab, setStudioTab] = useState<StudioTab | null>(null);

  // Reading & Focus Aids
  const [rulerActive, setRulerActive] = useState<boolean>(false);
  const [ttsActive, setTtsActive] = useState<boolean>(false);
  const [currentTtsText, setCurrentTtsText] = useState<string>('');
  const [speedReaderOpen, setSpeedReaderOpen] = useState<boolean>(false);
  const [speedReaderText, setSpeedReaderText] = useState<string>('');

  // RAG Indexing State
  const [isIndexed, setIsIndexed] = useState<boolean>(false);
  const [indexingProgress, setIndexingProgress] = useState<{ pct: number; status: string } | null>(null);

  // Selections & Highlights
  const [selection, setSelection] = useState<TextSelectionInfo | null>(null);
  const [activeExcerpt, setActiveExcerpt] = useState<string | null>(null);
  const [initialAiPrompt, setInitialAiPrompt] = useState<string | undefined>(undefined);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [cards, setCards] = useState<CanvasCard[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [canvasStudioOpen, setCanvasStudioOpen] = useState<boolean>(false);

  // Drag and drop & file inputs
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitFileInputRef = useRef<HTMLInputElement>(null);

  // Split-View & Document Comparison State
  const [splitMode, setSplitMode] = useState<SplitViewMode>('none');
  const [splitRatio, setSplitRatio] = useState<SplitRatio>('50-50');
  const [splitSyncScroll, setSplitSyncScroll] = useState<boolean>(false);
  const [splitCurrentPage, setSplitCurrentPage] = useState<number>(1);
  const [splitTotalPages, setSplitTotalPages] = useState<number>(1);
  const [splitScale, setSplitScale] = useState<number>(1.0);
  const [splitRotation, setSplitRotation] = useState<number>(0);

  // Comparison Document (for 'diff_doc' mode)
  const [splitDocType, setSplitDocType] = useState<SupportedDocType>('pdf');
  const [splitPdfDoc, setSplitPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [splitEpubData, setSplitEpubData] = useState<ArrayBuffer | null>(null);
  const [splitCbzData, setSplitCbzData] = useState<ArrayBuffer | null>(null);
  const [splitMarkdownContent, setSplitMarkdownContent] = useState<string | null>(null);
  const [splitMeta, setSplitMeta] = useState<PdfDocumentMeta | null>(null);

  // Check if document was already indexed for RAG
  useEffect(() => {
    if (meta?.id) {
      isDocumentIndexed(meta.id).then((indexed) => {
        setIsIndexed(indexed);
      });
    }
  }, [meta?.id]);

  // Load saved highlights, cards and progress when document changes
  useEffect(() => {
    if (meta?.id) {
      // 1. Load highlights
      const savedHl = localStorage.getItem(`pdf_hl_${meta.id}`);
      if (savedHl) {
        try {
          setHighlights(JSON.parse(savedHl));
        } catch {
          setHighlights([]);
        }
      } else {
        setHighlights([]);
      }

      // 2. Load canvas cards
      const savedCards = localStorage.getItem(`pdf_cards_${meta.id}`);
      if (savedCards) {
        try {
          setCards(JSON.parse(savedCards));
        } catch {
          setCards([]);
        }
      } else {
        setCards([]);
      }

      // 3. Load last read page and zoom
      const savedProg = localStorage.getItem(`pdf_prog_${meta.id}`);
      if (savedProg) {
        try {
          const { page, zoom } = JSON.parse(savedProg);
          if (page && page >= 1) setCurrentPage(page);
          if (zoom && zoom >= 0.5) setScale(zoom);
        } catch {}
      }
    }
  }, [meta?.id]);

  // Persist reading progress
  useEffect(() => {
    if (meta?.id && currentPage) {
      localStorage.setItem(
        `pdf_prog_${meta.id}`,
        JSON.stringify({ page: currentPage, zoom: scale })
      );
    }
  }, [currentPage, scale, meta?.id]);

  const saveHighlights = (newHighlights: Highlight[]) => {
    setHighlights(newHighlights);
    if (meta?.id) {
      localStorage.setItem(`pdf_hl_${meta.id}`, JSON.stringify(newHighlights));
    }
  };

  const saveCards = (newCards: CanvasCard[]) => {
    setCards(newCards);
    if (meta?.id) {
      localStorage.setItem(`pdf_cards_${meta.id}`, JSON.stringify(newCards));
    }
  };

  // Bilingual & Linguistic State
  const [targetLanguage, setTargetLanguage] = useState<string>('Persian');
  const [currentPageText, setCurrentPageText] = useState<string>('');

  // Extract text of current page for Bilingual Mode
  useEffect(() => {
    if (docType === 'pdf' && pdfDoc) {
      pdfDoc
        .getPage(currentPage)
        .then((page) => {
          page.getTextContent().then((tc) => {
            const str = tc.items.map((i: any) => ('str' in i ? i.str : '')).join(' ');
            setCurrentPageText(str);
          });
        })
        .catch(() => {});
    } else if (markdownContent) {
      setCurrentPageText(markdownContent.slice((currentPage - 1) * 2000, currentPage * 2000));
    }
  }, [docType, pdfDoc, currentPage, markdownContent]);

  // Save dictionary lookup term as concept card
  const handleSaveDictionaryCard = (res: DictionaryLookupResult) => {
    const newCard: CanvasCard = {
      id: Date.now().toString(),
      documentId: meta?.id || 'doc',
      pageNumber: currentPage,
      type: 'concept',
      title: res.term,
      content: `**${res.term}** (${res.partOfSpeech || 'term'} ${res.phonetic || ''})\n\n${res.definition}\n\n**Translation**: ${res.translation}\n\n*Context*: ${res.academicContext || ''}`,
      color: 'cyan',
      tags: ['vocabulary', res.partOfSpeech || 'concept'],
      timestamp: Date.now(),
    };
    saveCards([newCard, ...cards]);
  };

  // Run RAG indexing across PDF pages in background
  const indexPdfForRag = async (doc: pdfjsLib.PDFDocumentProxy, docId: string, title: string) => {
    try {
      const pages: Array<{ pageNumber: number; text: string }> = [];
      setIndexingProgress({ pct: 10, status: 'Extracting document text...' });

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        pages.push({ pageNumber: i, text: pageText });

        if (i % 5 === 0 || i === doc.numPages) {
          const pct = 10 + Math.round((i / doc.numPages) * 30);
          setIndexingProgress({ pct, status: `Extracted page ${i} of ${doc.numPages}` });
        }
      }

      await indexDocument(docId, title, pages, (pct, status) => {
        setIndexingProgress({ pct, status });
      });

      setIsIndexed(true);
      setIndexingProgress(null);
      toast.success('RAG Vector Index built successfully');
    } catch (err) {
      console.error('Failed to index PDF for RAG:', err);
      setIndexingProgress(null);
    }
  };

  // Run RAG indexing for text/markdown documents
  const indexTextForRag = async (text: string, docId: string, title: string) => {
    try {
      const pageSize = 2000;
      const pages: Array<{ pageNumber: number; text: string }> = [];
      let start = 0;
      let pageNum = 1;
      while (start < text.length) {
        pages.push({
          pageNumber: pageNum++,
          text: text.substring(start, start + pageSize),
        });
        start += pageSize;
      }

      setIndexingProgress({ pct: 20, status: 'Indexing document...' });
      await indexDocument(docId, title, pages, (pct, status) => {
        setIndexingProgress({ pct, status });
      });
      setIsIndexed(true);
      setIndexingProgress(null);
      toast.success('RAG Vector Index built');
    } catch (err) {
      console.error('Failed to index text for RAG:', err);
      setIndexingProgress(null);
    }
  };

  // Re-index action invoked from AI Panel
  const handleReindex = () => {
    if (!meta) return;
    if (docType === 'pdf' && pdfDoc) {
      indexPdfForRag(pdfDoc, meta.id, meta.title || meta.name);
    } else if (docType === 'markdown' && markdownContent) {
      indexTextForRag(markdownContent, meta.id, meta.title || meta.name);
    }
  };

  // Load PDF Document
  const loadPdfData = async (data: ArrayBuffer, fileName: string, fileSize: number) => {
    try {
      toast.loading('Opening PDF document...', { id: 'doc-load' });
      const loadingTask = pdfjsLib.getDocument({ data });
      const doc = await loadingTask.promise;

      setDocType('pdf');
      setPdfDoc(doc);
      setEpubData(null);
      setCbzData(null);
      setMarkdownContent(null);
      setTotalPages(doc.numPages);
      setCurrentPage(1);

      let docTitle = fileName;
      let docAuthor = '';

      try {
        const metadata = await doc.getMetadata();
        const info = metadata.info as any;
        if (info?.Title && info.Title.trim().length > 0) docTitle = info.Title;
        if (info?.Author) docAuthor = info.Author;
      } catch {}

      // Extract outlines
      let outlineItems: OutlineItem[] = [];
      try {
        const rawOutline = await doc.getOutline();
        if (rawOutline && rawOutline.length > 0) {
          outlineItems = await parseOutline(doc, rawOutline);
        }
      } catch {}
      setOutline(outlineItems);

      const docId = `${fileName}_${doc.numPages}_${fileSize}`;
      const docMeta: PdfDocumentMeta = {
        id: docId,
        name: fileName,
        title: docTitle,
        author: docAuthor,
        size: fileSize,
        pageCount: doc.numPages,
      };

      setMeta(docMeta);
      toast.success(`Loaded "${docTitle}" (${doc.numPages} pages)`, { id: 'doc-load' });

      // Automatically trigger background RAG indexing
      indexPdfForRag(doc, docId, docTitle);
    } catch (err: any) {
      console.error('Failed to parse PDF document:', err);
      toast.error('Failed to open PDF file', { id: 'doc-load' });
    }
  };

  // Load EPUB Document
  const loadEpubData = (data: ArrayBuffer, fileName: string, fileSize: number) => {
    try {
      setDocType('epub');
      setEpubData(data);
      setPdfDoc(null);
      setCbzData(null);
      setMarkdownContent(null);
      setCurrentPage(1);
      setTotalPages(1);

      const docMeta: PdfDocumentMeta = {
        id: `epub_${fileName}_${fileSize}`,
        name: fileName,
        title: fileName.replace(/\.epub$/i, ''),
        size: fileSize,
        pageCount: 1,
      };
      setMeta(docMeta);
      toast.success(`Loaded EPUB "${fileName}"`);
    } catch (err) {
      console.error('Error loading EPUB:', err);
      toast.error('Failed to load EPUB file');
    }
  };

  // Load CBZ Comic Archive
  const loadCbzData = (data: ArrayBuffer, fileName: string, fileSize: number) => {
    try {
      setDocType('cbz');
      setCbzData(data);
      setPdfDoc(null);
      setEpubData(null);
      setMarkdownContent(null);
      setCurrentPage(1);

      const docMeta: PdfDocumentMeta = {
        id: `cbz_${fileName}_${fileSize}`,
        name: fileName,
        title: fileName.replace(/\.cbz$/i, ''),
        size: fileSize,
        pageCount: 1,
      };
      setMeta(docMeta);
      toast.success(`Loaded Comic Archive "${fileName}"`);
    } catch (err) {
      console.error('Error loading CBZ:', err);
      toast.error('Failed to load CBZ file');
    }
  };

  // Load Markdown / Text / FB2 / MOBI
  const loadMarkdownData = (
    content: string,
    fileName: string,
    title: string,
    author: string,
    fileSize: number
  ) => {
    try {
      setDocType('markdown');
      setMarkdownContent(content);
      setPdfDoc(null);
      setEpubData(null);
      setCbzData(null);
      setCurrentPage(1);
      setTotalPages(1);

      const docId = `md_${fileName}_${fileSize}`;
      const docMeta: PdfDocumentMeta = {
        id: docId,
        name: fileName,
        title: title || fileName,
        author,
        size: fileSize,
        pageCount: 1,
      };
      setMeta(docMeta);
      toast.success(`Loaded "${docMeta.title}"`);

      // Trigger background RAG indexing
      indexTextForRag(content, docId, docMeta.title);
    } catch (err) {
      console.error('Error loading text file:', err);
      toast.error('Failed to load document');
    }
  };

  // Helper to parse PDF outlines recursively
  const parseOutline = async (doc: pdfjsLib.PDFDocumentProxy, items: any[]): Promise<OutlineItem[]> => {
    const result: OutlineItem[] = [];
    for (const item of items) {
      let pageNum = 1;
      if (item.dest) {
        try {
          let dest = item.dest;
          if (typeof dest === 'string') {
            dest = await doc.getDestination(dest);
          }
          if (Array.isArray(dest) && dest[0]) {
            const pageIndex = await doc.getPageIndex(dest[0]);
            pageNum = pageIndex + 1;
          }
        } catch {}
      }

      let subItems: OutlineItem[] | undefined;
      if (item.items && item.items.length > 0) {
        subItems = await parseOutline(doc, item.items);
      }

      result.push({
        title: item.title,
        pageNumber: pageNum,
        items: subItems,
      });
    }
    return result;
  };

  // Multi-format file dispatcher
  const processIncomingFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.pdf')) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) loadPdfData(buffer, file.name, file.size);
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.epub')) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) loadEpubData(buffer, file.name, file.size);
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.cbz')) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) loadCbzData(buffer, file.name, file.size);
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.fb2')) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          const parsed = parseFb2Xml(text);
          loadMarkdownData(parsed.markdownContent, file.name, parsed.title, parsed.author, file.size);
        }
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.mobi') || fileName.endsWith('.azw3')) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          const parsed = parseMobiBuffer(buffer, file.name);
          loadMarkdownData(parsed.markdownContent, file.name, parsed.title, parsed.author, file.size);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          loadMarkdownData(text, file.name, file.name, '', file.size);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error('Unsupported file format. Please drop PDF, EPUB, MOBI, AZW3, FB2, CBZ, TXT, or MD.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processIncomingFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processIncomingFile(file);
  };

  // Synchronized page change handlers for primary and split panes
  const handleMainPageChange = (newPage: number) => {
    if (newPage !== currentPage) {
      soundService.play('page_flip');
      if (splitMode !== 'none' && splitSyncScroll) {
        const delta = newPage - currentPage;
        const rightTotal = splitMode === 'same_doc' ? totalPages : splitTotalPages;
        setSplitCurrentPage((prev) => Math.min(rightTotal, Math.max(1, prev + delta)));
      }
      setCurrentPage(newPage);
    }
  };

  const handleSplitPageChange = (newPage: number) => {
    const rightTotal = splitMode === 'same_doc' ? totalPages : splitTotalPages;
    if (newPage >= 1 && newPage <= rightTotal && newPage !== splitCurrentPage) {
      soundService.play('page_flip');
      if (splitSyncScroll) {
        const delta = newPage - splitCurrentPage;
        setCurrentPage((prev) => Math.min(totalPages, Math.max(1, prev + delta)));
      }
      setSplitCurrentPage(newPage);
    }
  };

  const handleToggleSplit = (mode: SplitViewMode) => {
    setSplitMode(mode);
    if (mode === 'same_doc') {
      // In same document dual-view, default to next page if available
      setSplitCurrentPage((prev) => (prev === currentPage ? Math.min(totalPages, currentPage + 1) : prev));
      toast.success('Split View active: Dual-page mode');
    } else if (mode === 'diff_doc') {
      toast.info('Split View active: Document Comparison mode');
      if (!splitPdfDoc && !splitEpubData && !splitCbzData && !splitMarkdownContent) {
        setTimeout(() => splitFileInputRef.current?.click(), 100);
      }
    } else {
      toast.info('Split View closed');
    }
  };

  // Loader for comparison document in 'diff_doc' mode
  const processIncomingSplitFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.pdf')) {
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          try {
            toast.loading('Opening comparison PDF...', { id: 'split-load' });
            const loadingTask = pdfjsLib.getDocument({ data: buffer });
            const doc = await loadingTask.promise;
            setSplitDocType('pdf');
            setSplitPdfDoc(doc);
            setSplitEpubData(null);
            setSplitCbzData(null);
            setSplitMarkdownContent(null);
            setSplitTotalPages(doc.numPages);
            setSplitCurrentPage(1);

            let docTitle = file.name;
            try {
              const m = await doc.getMetadata();
              const info = m.info as any;
              if (info?.Title) docTitle = info.Title;
            } catch {}

            setSplitMeta({
              id: `split_${file.name}_${file.size}`,
              name: file.name,
              title: docTitle,
              size: file.size,
              pageCount: doc.numPages,
            });
            toast.success(`Loaded comparison document: ${docTitle}`, { id: 'split-load' });
          } catch (err) {
            toast.error('Failed to load comparison PDF', { id: 'split-load' });
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.epub')) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          setSplitDocType('epub');
          setSplitEpubData(buffer);
          setSplitPdfDoc(null);
          setSplitCbzData(null);
          setSplitMarkdownContent(null);
          setSplitTotalPages(1);
          setSplitCurrentPage(1);
          setSplitMeta({
            id: `split_epub_${file.name}`,
            name: file.name,
            title: file.name.replace(/\.epub$/i, ''),
            size: file.size,
            pageCount: 1,
          });
          toast.success(`Loaded comparison EPUB: ${file.name}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.cbz')) {
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          setSplitDocType('cbz');
          setSplitCbzData(buffer);
          setSplitPdfDoc(null);
          setSplitEpubData(null);
          setSplitMarkdownContent(null);
          setSplitTotalPages(1);
          setSplitCurrentPage(1);
          setSplitMeta({
            id: `split_cbz_${file.name}`,
            name: file.name,
            title: file.name.replace(/\.cbz$/i, ''),
            size: file.size,
            pageCount: 1,
          });
          toast.success(`Loaded comparison Comic: ${file.name}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setSplitDocType('markdown');
          setSplitMarkdownContent(text);
          setSplitPdfDoc(null);
          setSplitEpubData(null);
          setSplitCbzData(null);
          setSplitTotalPages(1);
          setSplitCurrentPage(1);
          setSplitMeta({
            id: `split_md_${file.name}`,
            name: file.name,
            title: file.name,
            size: file.size,
            pageCount: 1,
          });
          toast.success(`Loaded comparison document: ${file.name}`);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error('Unsupported comparison file format. Please choose PDF, EPUB, CBZ, TXT, or MD.');
    }
  };

  // Jump to citation source handler
  const handleJumpToCitation = async (pageNumber: number, quote?: string) => {
    if (pageNumber >= 1) {
      handleMainPageChange(pageNumber);
      toast.info(`📌 Navigated to Page ${pageNumber}`);

      // Smooth scroll viewer to center
      const pageEl = document.querySelector(`[data-page-number="${pageNumber}"]`);
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // TTS audio text determination
  const handleOpenTts = async () => {
    if (selection?.text) {
      setCurrentTtsText(selection.text);
      setTtsActive(true);
      return;
    }

    if (docType === 'pdf' && pdfDoc) {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        setCurrentTtsText(text);
        setTtsActive(true);
      } catch {
        toast.error('Could not extract text from current page for narration');
      }
    } else if (markdownContent) {
      setCurrentTtsText(markdownContent.substring(0, 3000));
      setTtsActive(true);
    } else {
      toast.info('Please select text to narrate');
    }
  };

  // Speed Reader determination
  const handleOpenSpeedReader = async (textOverride?: string) => {
    if (textOverride || selection?.text) {
      setSpeedReaderText(textOverride || selection!.text);
      setSpeedReaderOpen(true);
      return;
    }

    if (docType === 'pdf' && pdfDoc) {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        setSpeedReaderText(text);
        setSpeedReaderOpen(true);
      } catch {
        toast.error('Could not extract page text for speed reader');
      }
    } else if (markdownContent) {
      setSpeedReaderText(markdownContent.substring(0, 2500));
      setSpeedReaderOpen(true);
    } else {
      toast.info('Please select text to speed read');
    }
  };

  // Load Sample Paper
  const handleLoadSamplePdf = async () => {
    try {
      toast.loading('Generating sample academic paper...', { id: 'sample-pdf' });
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      // Page 1
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text('Next-Generation Neural Reasoning & Multimodal AI', 50, 70);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('Noectra AI Research Lab · Deep Learning & Cognitive Computing Series', 50, 95);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(50, 110, 545, 110);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('Abstract', 50, 135);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const abstractText =
        'Recent advancements in deep foundation models have precipitated substantial shifts in how synthetic agents synthesize unstructured multimodal corpora. In this treatise, we investigate novel transformer decoders coupled with state-space memory models (SSMs) to achieve linear algorithmic complexity over million-token contexts. Our empirical evaluations demonstrate a 34% reduction in inference latency alongside significant gains on benchmark reasoning tasks. Furthermore, we outline architectural frameworks for seamless local retrieval and automated citation verification.';
      doc.text(doc.splitTextToSize(abstractText, 495), 50, 155);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Introduction and Architectural Paradigms', 50, 245);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const introText =
        'The primary bottleneck in deploying massive foundational architectures stems from quadratic attention scaling over expansive horizons. While sparse attention formulations mitigate quadratic memory spikes, they often sacrifice global coherence across distant semantic anchors.\n\nTo resolve this tension, we propose a hybrid attention-gated neural router that dynamically switches between dense localized attention heads and continuous recurrent state-space transforms. This allows the model to retain fine-grained lexical nuances while sustaining macroscopic cognitive continuity.';
      doc.text(doc.splitTextToSize(introText, 495), 50, 265);

      // Page 2
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Empirical Findings & Benchmarks', 50, 60);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const benchText =
        'We benchmarked the hybrid architecture across multiple standard evaluations including GSM8K, HumanEval, and MMLU-Pro. Across all quantitative metrics, the model demonstrated superior cross-domain knowledge synthesis, surpassing conventional 70B parameter baselines by 4.2 points while consuming 40% fewer FLOPs during inference.\n\nKey takeaways:\n• Zero-shot transfer capabilities were enhanced in cross-lingual settings.\n• Mathematical problem solving showed an 18% higher pass@1 accuracy.\n• Retrieval latency over a 128k context window decreased from 1.4s to 380ms.';
      doc.text(doc.splitTextToSize(benchText, 495), 50, 85);

      const arrayBuffer = doc.output('arraybuffer');
      await loadPdfData(
        arrayBuffer,
        'Neural_Reasoning_Multimodal_AI_2026.pdf',
        arrayBuffer.byteLength
      );
      toast.success('Loaded sample research paper', { id: 'sample-pdf' });
    } catch (err) {
      console.error('Error generating sample PDF:', err);
      toast.error('Failed to generate sample PDF', { id: 'sample-pdf' });
    }
  };

  // Add Highlight action
  const handleHighlight = (color: HighlightColor) => {
    if (!selection) return;

    const newHl: Highlight = {
      id: Date.now().toString(),
      documentId: meta?.id || 'doc',
      pageNumber: currentPage,
      text: selection.text,
      color,
      rects: selection.rects,
      anchorY: selection.anchorY,
      timestamp: Date.now(),
    };

    saveHighlights([...highlights, newHl]);
    setSelection(null);
    toast.success('Highlight saved');
  };

  // Add Highlight & Open Margin Note
  const handleAddNote = (color: HighlightColor) => {
    if (!selection) return;

    const newId = Date.now().toString();
    const newHl: Highlight = {
      id: newId,
      documentId: meta?.id || 'doc',
      pageNumber: currentPage,
      text: selection.text,
      color,
      rects: selection.rects,
      anchorY: selection.anchorY,
      note: '',
      timestamp: Date.now(),
    };

    saveHighlights([...highlights, newHl]);
    setActiveNoteId(newId);
    setStudioTab('notes');
    setSelection(null);
    soundService.play('pop');
    toast.success('Margin note created in Studio');
  };

  const handleUpdateNote = (id: string, noteText: string) => {
    const updated = highlights.map((h) =>
      h.id === id ? { ...h, note: noteText, updatedAt: Date.now() } : h
    );
    saveHighlights(updated);
  };

  const handleDeleteHighlight = (id: string) => {
    saveHighlights(highlights.filter((h) => h.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    toast.success('Highlight removed');
  };

  const handleAskAi = (prompt?: string) => {
    if (selection?.text) {
      setActiveExcerpt(selection.text);
    }
    if (prompt) {
      setInitialAiPrompt(prompt);
    }
    setStudioTab('ai');
    setSelection(null);
  };

  const hasActiveDocument = Boolean(pdfDoc || epubData || cbzData || markdownContent);

  return (
    <div
      className="h-full flex flex-col bg-light-primary dark:bg-[#07090e] text-black dark:text-white overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Picker Supporting All Formats */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.epub,.mobi,.azw3,.fb2,.cbz,.txt,.md"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden Comparison File Picker */}
      <input
        type="file"
        ref={splitFileInputRef}
        accept=".pdf,.epub,.mobi,.azw3,.fb2,.cbz,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processIncomingSplitFile(file);
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-sky-600/30 backdrop-blur-md border-4 border-dashed border-sky-400 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <Upload size={48} className="text-white mb-2 animate-bounce" />
          <p className="text-lg font-semibold text-white">Drop document to open immediately</p>
          <p className="text-xs text-white/70 mt-1">Supports PDF, EPUB, MOBI, AZW3, FB2, CBZ, TXT, MD</p>
        </div>
      )}

      {/* Top Toolbar */}
      <PdfToolbar
        meta={meta}
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        sidebarOpen={sidebarOpen}
        activeStudioTab={studioTab}
        notesCount={highlights.filter((h) => h.pageNumber === currentPage).length}
        cardsCount={highlights.filter((h) => Boolean(h.note?.trim())).length + cards.length}
        rulerActive={rulerActive}
        ttsActive={ttsActive}
        splitMode={splitMode}
        onToggleSplit={handleToggleSplit}
        onPageChange={handleMainPageChange}
        onZoomIn={() => setScale((s) => Math.min(3.0, s + 0.15))}
        onZoomOut={() => setScale((s) => Math.max(0.5, s - 0.15))}
        onResetZoom={() => setScale(1.15)}
        onFitWidth={() => setScale(1.4)}
        onRotate={() => setRotation((r) => (r + 90) % 360)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onToggleStudioTab={(tab) => setStudioTab((cur) => (cur === tab ? null : tab))}
        onToggleRuler={() => setRulerActive((r) => !r)}
        onToggleTts={handleOpenTts}
        onOpenSpeedReader={() => handleOpenSpeedReader()}
        onToggleCanvasCards={() => setCanvasStudioOpen((v) => !v)}
        onOpenFile={() => fileInputRef.current?.click()}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Document Sidebar */}
        {hasActiveDocument && (
          <PdfDocumentSidebar
            isOpen={sidebarOpen}
            outline={outline}
            highlights={highlights}
            meta={meta}
            currentPage={currentPage}
            onNavigateToPage={handleMainPageChange}
            onSelectHighlight={(id) => {
              setActiveNoteId(id);
              if (id) setStudioTab('notes');
            }}
            onDeleteHighlight={handleDeleteHighlight}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Viewers or Empty State */}
        {hasActiveDocument ? (
          <>
            <div className="flex-1 relative flex overflow-hidden">
              {/* Primary Viewer Pane */}
              <div
                className={`h-full relative flex flex-col overflow-hidden transition-all duration-150 ${
                  splitMode !== 'none'
                    ? splitRatio === '50-50'
                      ? 'w-1/2 border-r border-light-200 dark:border-white/10'
                      : splitRatio === '60-40'
                      ? 'w-[60%] border-r border-light-200 dark:border-white/10'
                      : 'w-[40%] border-r border-light-200 dark:border-white/10'
                    : 'flex-1'
                }`}
              >
                {/* 1. PDF Viewer */}
                {docType === 'pdf' && pdfDoc && (
                  <PdfViewer
                    pdfDoc={pdfDoc}
                    currentPage={currentPage}
                    scale={scale}
                    rotation={rotation}
                    highlights={highlights}
                    activeNoteId={activeNoteId}
                    targetLanguage={targetLanguage}
                    onSelectNote={(id) => {
                      setActiveNoteId(id);
                      if (id) setStudioTab('notes');
                    }}
                    onUpdateNote={handleUpdateNote}
                    onHighlightDelete={handleDeleteHighlight}
                    onSaveDictionaryCard={handleSaveDictionaryCard}
                    onAskAiAboutExcerpt={(quote, note) => {
                      setActiveExcerpt(quote);
                      setInitialAiPrompt(
                        note
                          ? `Please analyze this quote and my research thoughts:\nQuote: "${quote}"\nMy Note: "${note}"`
                          : undefined
                      );
                      setStudioTab('ai');
                    }}
                    onSelectionChange={(sel) => setSelection(sel)}
                    onPageChange={handleMainPageChange}
                  />
                )}

                {/* 2. EPUB Viewer */}
                {docType === 'epub' && epubData && (
                  <EpubViewer
                    data={epubData}
                    onTocLoaded={(toc) => setOutline(toc)}
                    onSelectionChange={(text) => {
                      setSelection({
                        text,
                        pageNumber: 1,
                        clientRect: { top: 120, left: 180, bottom: 140, right: 300, width: 120, height: 20 },
                      });
                    }}
                  />
                )}

                {/* 3. CBZ Comic Viewer */}
                {docType === 'cbz' && cbzData && (
                  <ComicViewer
                    data={cbzData}
                    onPageChange={(p, t) => {
                      handleMainPageChange(p);
                      setTotalPages(t);
                    }}
                  />
                )}

                {/* 4. Markdown / Text / FB2 / MOBI Viewer */}
                {docType === 'markdown' && markdownContent && (
                  <MarkdownTextViewer
                    content={markdownContent}
                    onTocLoaded={(toc) => setOutline(toc)}
                    onSelectionChange={(sel) => setSelection(sel)}
                  />
                )}

                {/* Floating Selection Popup */}
                {selection && (
                  <PdfSelectionPopup
                    selection={selection}
                    onHighlight={handleHighlight}
                    onAddNote={handleAddNote}
                    onAskAi={handleAskAi}
                    onReadAloud={(text) => {
                      setCurrentTtsText(text);
                      setTtsActive(true);
                      setSelection(null);
                    }}
                    onSpeedRead={(text) => {
                      setSpeedReaderText(text);
                      setSpeedReaderOpen(true);
                      setSelection(null);
                    }}
                    onDismiss={() => setSelection(null)}
                  />
                )}
              </div>

              {/* Secondary Split-View Comparison Pane */}
              {splitMode !== 'none' && (
                <div
                  className={`h-full flex flex-col overflow-hidden transition-all duration-150 ${
                    splitRatio === '50-50'
                      ? 'w-1/2'
                      : splitRatio === '60-40'
                      ? 'w-[40%]'
                      : 'w-[60%]'
                  }`}
                >
                  <SplitViewerPane
                    mode={splitMode}
                    docType={splitMode === 'same_doc' ? docType : splitDocType}
                    pdfDoc={splitMode === 'same_doc' ? pdfDoc : splitPdfDoc}
                    epubData={splitMode === 'same_doc' ? epubData : splitEpubData}
                    cbzData={splitMode === 'same_doc' ? cbzData : splitCbzData}
                    markdownContent={splitMode === 'same_doc' ? markdownContent : splitMarkdownContent}
                    meta={splitMode === 'same_doc' ? meta : splitMeta}
                    currentPage={splitCurrentPage}
                    totalPages={splitMode === 'same_doc' ? totalPages : splitTotalPages}
                    scale={splitScale}
                    rotation={splitRotation}
                    syncScroll={splitSyncScroll}
                    splitRatio={splitRatio}
                    highlights={highlights}
                    activeNoteId={activeNoteId}
                    targetLanguage={targetLanguage}
                    onPageChange={handleSplitPageChange}
                    onZoomIn={() => setSplitScale((s) => Math.min(3.0, s + 0.15))}
                    onZoomOut={() => setSplitScale((s) => Math.max(0.5, s - 0.15))}
                    onResetZoom={() => setSplitScale(1.0)}
                    onToggleSync={() => setSplitSyncScroll((v) => !v)}
                    onChangeRatio={(r) => setSplitRatio(r)}
                    onOpenComparisonFile={() => splitFileInputRef.current?.click()}
                    onCloseSplit={() => setSplitMode('none')}
                    onSelectNote={(id) => {
                      setActiveNoteId(id);
                      if (id) setStudioTab('notes');
                    }}
                    onSaveDictionaryCard={handleSaveDictionaryCard}
                  />
                </div>
              )}
            </div>

            {/* Unified Right Research Studio (Notes | Bilingual | AI Assistant) */}
            <RightStudioPanel
              isOpen={Boolean(studioTab)}
              activeTab={studioTab || 'notes'}
              onTabChange={(tab) => setStudioTab(tab)}
              onClose={() => setStudioTab(null)}
              meta={meta}
              currentPage={currentPage}
              totalPages={totalPages}
              highlights={highlights}
              activeNoteId={activeNoteId}
              onSelectNote={(id) => setActiveNoteId(id)}
              onUpdateNote={handleUpdateNote}
              onHighlightDelete={handleDeleteHighlight}
              onAskAiAboutExcerpt={(quote, note) => {
                setActiveExcerpt(quote);
                setInitialAiPrompt(
                  note
                    ? `Please analyze this quote and my research thoughts:\nQuote: "${quote}"\nMy Note: "${note}"`
                    : undefined
                );
                setStudioTab('ai');
              }}
              pageText={currentPageText}
              targetLanguage={targetLanguage}
              onTargetLanguageChange={(lang) => setTargetLanguage(lang)}
              activeExcerpt={activeExcerpt}
              onClearExcerpt={() => setActiveExcerpt(null)}
              initialPrompt={initialAiPrompt}
              onJumpToCitation={handleJumpToCitation}
              isIndexed={isIndexed}
              indexingProgress={indexingProgress}
              onReindex={handleReindex}
            />
          </>
        ) : (
          /* Empty / Landing State Inspired by Readest & Modern Research Studios */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-light-primary via-light-secondary to-light-200 dark:from-[#0c0f15] dark:via-[#090b10] dark:to-[#06080c] text-black dark:text-white">
            <div className="max-w-md w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Logo / Badge */}
              <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-sky-500/20 via-blue-500/10 to-transparent border border-sky-500/30 shadow-xl shadow-sky-500/10">
                <Layers size={44} className="text-sky-500 dark:text-sky-400" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-black/90 dark:text-white tracking-tight">
                  Universal Document & Research Studio
                </h2>
                <p className="text-xs text-black/60 dark:text-white/50 mt-1.5 leading-relaxed">
                  Deep reading studio with vector RAG search, clickable citations, text-to-speech narration,
                  focus aids, and multi-format support.
                </p>
              </div>

              {/* Upload Dropzone Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group p-8 rounded-2xl border-2 border-dashed border-light-300 dark:border-white/10 hover:border-sky-500/50 bg-light-secondary/60 dark:bg-white/[0.02] hover:bg-sky-500/5 dark:hover:bg-sky-500/[0.04] transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 shadow-sm"
              >
                <div className="p-3 rounded-full bg-light-200 dark:bg-white/5 group-hover:bg-sky-500/20 text-black/60 dark:text-white/60 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
                  <FolderOpen size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-black/90 dark:text-white/90 group-hover:text-sky-600 dark:group-hover:text-white">
                    Choose a document or drag it here
                  </p>
                  <p className="text-[11px] text-black/40 dark:text-white/40 mt-1 font-mono">
                    PDF · EPUB · MOBI · AZW3 · FB2 · CBZ · TXT · MD
                  </p>
                </div>
              </div>

              {/* Quick Sample Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadSamplePdf}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
                >
                  <Sparkles size={14} className="text-amber-300 animate-pulse" />
                  <span>Open Sample Research Paper</span>
                </button>
              </div>

              {/* Key Features Preview */}
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-light-200 dark:border-white/5 text-[10px] text-black/60 dark:text-white/50">
                <div className="flex flex-col items-center p-2 rounded-lg bg-light-secondary/50 dark:bg-white/[0.01]">
                  <Sparkles size={16} className="text-sky-500 dark:text-sky-400 mb-1" />
                  <span>RAG Vector Search</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-light-secondary/50 dark:bg-white/[0.01]">
                  <Volume2 size={16} className="text-emerald-500 dark:text-emerald-400 mb-1" />
                  <span>TTS Narration</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-light-secondary/50 dark:bg-white/[0.01]">
                  <ScanLine size={16} className="text-amber-500 dark:text-amber-400 mb-1" />
                  <span>Reading Ruler</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-light-secondary/50 dark:bg-white/[0.01]">
                  <Gauge size={16} className="text-rose-500 dark:text-rose-400 mb-1" />
                  <span>RSVP Speed Read</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reading Ruler Overlay */}
      <ReadingRulerOverlay
        enabled={rulerActive}
        onClose={() => setRulerActive(false)}
      />

      {/* Text-to-Speech Audio Bar */}
      <DocumentTtsBar
        isOpen={ttsActive}
        textToRead={currentTtsText}
        documentTitle={meta?.title || meta?.name}
        onClose={() => setTtsActive(false)}
      />

      {/* RSVP Speed Reader Modal */}
      <RsvpSpeedReaderModal
        isOpen={speedReaderOpen}
        text={speedReaderText}
        documentTitle={meta?.title || meta?.name}
        onClose={() => setSpeedReaderOpen(false)}
      />

      {/* Research Canvas & Cards Studio Modal */}
      <CanvasCardsStudio
        isOpen={canvasStudioOpen}
        meta={meta}
        highlights={highlights}
        cards={cards}
        currentPage={currentPage}
        onClose={() => setCanvasStudioOpen(false)}
        onNavigateToPage={(page) => {
          if (page !== currentPage) soundService.play('page_flip');
          setCurrentPage(page);
        }}
        onSaveCards={saveCards}
        onUpdateHighlightNote={handleUpdateNote}
        onDeleteHighlight={handleDeleteHighlight}
      />
    </div>
  );
}
