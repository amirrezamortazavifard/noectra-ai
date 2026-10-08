import * as pdfjsLib from 'pdfjs-dist';
import {
  HighlightRect,
  ParagraphTranslation,
  TranslationSegmentationMode,
} from '@/components/PdfReader/types';
import { cleanPdfTextFragment } from '@/lib/services/persianTextFormatter';

export interface ExtractedParagraph extends ParagraphTranslation {
  pageNumber: number;
  rects: HighlightRect[];
  anchorY: number; // 0 to 100 percentage
}

interface ItemBox {
  str: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
  hasEOL: boolean;
}

interface GroupedLine {
  text: string;
  rect: HighlightRect;
  fontSize: number;
  hasEOL: boolean;
  column: 'left' | 'right' | 'full';
}

/**
 * Split a paragraph into clean academic sentences while protecting abbreviations
 * such as e.g., i.e., et al., Fig. 1, Tab. 2, numbers, and references.
 */
export function splitIntoAcademicSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Protect common academic and Latin abbreviations
  const protectedText = text
    .replace(
      /\b(e\.g\.|i\.e\.|et al\.|Fig\.|Figs\.|Tab\.|Tabs\.|Ref\.|Refs\.|Dr\.|Prof\.|Vol\.|No\.|vs\.|approx\.|dept\.|univ\.|al\.)/gi,
      (match) => match.replace(/\./g, '__DOT__')
    )
    // Protect decimal numbers like 3.14 or versions like 2.1
    .replace(/(\d+)\.(\d+)/g, '$1__DOT__$2');

  // Split on sentence boundaries (. ! ?) followed by whitespace and a capital letter, quote, or bracket
  const chunks = protectedText.split(/(?<=[.?!])\s+(?=[A-Z0-9"“'\[])/);

  return chunks
    .map((s) => s.replace(/__DOT__/g, '.').trim())
    .filter((s) => s.length > 5);
}

/**
 * Extract visually and logically grouped text with column-aware layout detection
 * and optional sentence-by-sentence granularity.
 */
export async function extractParagraphsFromPage(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number,
  mode: TranslationSegmentationMode = 'paragraph'
): Promise<ExtractedParagraph[]> {
  try {
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0, rotation: 0 });

    if (!textContent || !textContent.items || textContent.items.length === 0) {
      return [];
    }

    const itemBoxes: ItemBox[] = [];

    for (const rawItem of textContent.items) {
      if (!('str' in rawItem) || !rawItem.str || !rawItem.str.trim()) {
        continue;
      }

      const item = rawItem as any;
      const [scaleX, skewY, skewX, scaleY, tx, ty] = item.transform;
      const itemW = item.width || 8;
      const itemH = item.height || Math.abs(scaleY) || 10;

      let left = 0;
      let top = 0;
      let width = 0;
      let height = 0;

      if (typeof viewport.convertToViewportRectangle === 'function') {
        const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle([
          tx,
          ty,
          tx + itemW,
          ty + itemH,
        ]);
        const minX = Math.min(vx1, vx2);
        const maxX = Math.max(vx1, vx2);
        const minY = Math.min(vy1, vy2);
        const maxY = Math.max(vy1, vy2);

        left = Math.max(0, Math.min(1, minX / viewport.width));
        top = Math.max(0, Math.min(1, minY / viewport.height));
        width = Math.max(0, Math.min(1, (maxX - minX) / viewport.width));
        height = Math.max(0, Math.min(1, (maxY - minY) / viewport.height));
      } else {
        left = Math.max(0, Math.min(1, tx / viewport.width));
        top = Math.max(0, Math.min(1, (viewport.height - (ty + itemH)) / viewport.height));
        width = Math.max(0, Math.min(1, itemW / viewport.width));
        height = Math.max(0, Math.min(1, itemH / viewport.height));
      }

      if (width <= 0 || height <= 0) continue;

      itemBoxes.push({
        str: item.str,
        left,
        top,
        width,
        height,
        fontSize: height,
        hasEOL: Boolean(item.hasEOL),
      });
    }

    if (itemBoxes.length === 0) return [];

    // Sort items primarily by top (baseline tolerance) and secondarily by left
    itemBoxes.sort((a, b) => {
      const yDiff = a.top - b.top;
      if (Math.abs(yDiff) > 0.005) {
        return yDiff;
      }
      return a.left - b.left;
    });

    // 1. Group items into physical lines WITH COLUMN GUTTER GUARD
    // In academic papers, column gutters are >= 0.035 (3.5% page width).
    // Word spacing is < 0.015. Two items across a gutter MUST NEVER be in the same line!
    const lines: GroupedLine[] = [];

    interface LineBuilder {
      text: string;
      left: number;
      top: number;
      right: number;
      bottom: number;
      fontSizeSum: number;
      count: number;
      hasEOL: boolean;
    }

    const activeLines: LineBuilder[] = [];

    const flushBuilder = (b: LineBuilder) => {
      const w = Math.max(0.01, b.right - b.left);
      const h = Math.max(0.005, b.bottom - b.top);
      const centerX = b.left + w / 2;

      let column: 'left' | 'right' | 'full' = 'full';
      if (w > 0.62 || (b.left < 0.28 && b.right > 0.72)) {
        column = 'full';
      } else if (centerX < 0.495) {
        column = 'left';
      } else if (centerX >= 0.495) {
        column = 'right';
      }

      lines.push({
        text: b.text.trim(),
        rect: {
          x: b.left,
          y: b.top,
          width: w,
          height: h,
        },
        fontSize: b.fontSizeSum / b.count,
        hasEOL: b.hasEOL,
        column,
      });
    };

    for (const item of itemBoxes) {
      // Find an active line on the same vertical baseline AND in the same column
      const matchedIdx = activeLines.findIndex(
        (l) =>
          Math.abs(item.top - l.top) < 0.007 &&
          item.left >= l.right - 0.01 &&
          item.left - l.right < 0.035 // Must not cross column gutter
      );

      if (matchedIdx !== -1) {
        const l = activeLines[matchedIdx];
        const needsSpace =
          !l.text.endsWith(' ') && !item.str.startsWith(' ') && item.left > l.right + 0.002;
        l.text += (needsSpace ? ' ' : '') + item.str;
        l.right = Math.max(l.right, item.left + item.width);
        l.bottom = Math.max(l.bottom, item.top + item.height);
        l.top = Math.min(l.top, item.top);
        l.fontSizeSum += item.fontSize;
        l.count += 1;
        l.hasEOL = l.hasEOL || item.hasEOL;
      } else {
        // Flush any active lines that are clearly above this item's baseline
        for (let i = activeLines.length - 1; i >= 0; i--) {
          if (activeLines[i].bottom < item.top - 0.012) {
            flushBuilder(activeLines[i]);
            activeLines.splice(i, 1);
          }
        }

        // Start new line builder
        activeLines.push({
          text: item.str,
          left: item.left,
          top: item.top,
          right: item.left + item.width,
          bottom: item.top + item.height,
          fontSizeSum: item.fontSize,
          count: 1,
          hasEOL: item.hasEOL,
        });
      }
    }

    // Flush all remaining active line builders
    for (const b of activeLines) {
      flushBuilder(b);
    }

    if (lines.length === 0) return [];

    // Filter edge noise (page numbers, headers at extreme margins < 2.5% or > 97.5%)
    const validLines = lines.filter((l) => {
      const isExtremeEdge = l.rect.y < 0.025 || l.rect.y > 0.975;
      if (isExtremeEdge && l.text.length < 8) return false;
      return l.text.length > 0;
    });

    if (validLines.length === 0) return [];

    // 2. TWO-COLUMN LAYOUT ANALYSIS & ACADEMIC READING ORDER RECONSTRUCTION
    // Check if page has multiple columns
    const leftCount = validLines.filter((l) => l.column === 'left').length;
    const rightCount = validLines.filter((l) => l.column === 'right').length;
    const isTwoColumnPage = leftCount >= 3 && rightCount >= 3;

    let orderedLines: GroupedLine[] = [];

    if (!isTwoColumnPage) {
      // Standard single-column flow: sort top-to-bottom
      orderedLines = [...validLines].sort((a, b) => a.rect.y - b.rect.y);
    } else {
      // Multi-column page: Slice page into vertical bands by full-width blocks (figures, titles, dividers)
      const fullWidthLines = validLines
        .filter((l) => l.column === 'full')
        .sort((a, b) => a.rect.y - b.rect.y);

      // Create vertical dividers from full-width blocks
      interface Band {
        minY: number;
        maxY: number;
        type: 'full' | 'two-column';
      }

      const bands: Band[] = [];
      let currentDivider: { minY: number; maxY: number } | null = null;

      for (const fl of fullWidthLines) {
        if (!currentDivider) {
          currentDivider = { minY: fl.rect.y, maxY: fl.rect.y + fl.rect.height };
        } else {
          if (fl.rect.y - currentDivider.maxY < 0.035) {
            currentDivider.maxY = Math.max(currentDivider.maxY, fl.rect.y + fl.rect.height);
          } else {
            bands.push({ ...currentDivider, type: 'full' });
            currentDivider = { minY: fl.rect.y, maxY: fl.rect.y + fl.rect.height };
          }
        }
      }
      if (currentDivider) {
        bands.push({ ...currentDivider, type: 'full' });
      }

      // Build complete vertical band sequence from 0.0 to 1.0
      const allBands: Band[] = [];
      let lastY = 0;

      for (const fb of bands) {
        if (fb.minY - lastY > 0.03) {
          allBands.push({ minY: lastY, maxY: fb.minY, type: 'two-column' });
        }
        allBands.push(fb);
        lastY = fb.maxY;
      }
      if (1.0 - lastY > 0.03) {
        allBands.push({ minY: lastY, maxY: 1.0, type: 'two-column' });
      }

      // If no full-width dividers were found, the whole page is two-column
      if (allBands.length === 0) {
        allBands.push({ minY: 0, maxY: 1.0, type: 'two-column' });
      }

      // Reorder lines band-by-band:
      // In two-column bands: Left column top-to-bottom, THEN Right column top-to-bottom!
      for (const band of allBands) {
        const bandLines = validLines.filter(
          (l) => l.rect.y >= band.minY - 0.015 && l.rect.y < band.maxY + 0.015
        );

        if (band.type === 'full') {
          bandLines.sort((a, b) => a.rect.y - b.rect.y);
          orderedLines.push(...bandLines);
        } else {
          const colLeft = bandLines
            .filter((l) => l.column === 'left')
            .sort((a, b) => a.rect.y - b.rect.y);
          const colRight = bandLines
            .filter((l) => l.column === 'right')
            .sort((a, b) => a.rect.y - b.rect.y);
          const colFull = bandLines
            .filter((l) => l.column === 'full')
            .sort((a, b) => a.rect.y - b.rect.y);

          // Left column first, right column second
          orderedLines.push(...colFull, ...colLeft, ...colRight);
        }
      }

      // Guard: include any lines that may have missed band ranges
      const orderedSet = new Set(orderedLines);
      const missing = validLines.filter((l) => !orderedSet.has(l));
      if (missing.length > 0) {
        missing.sort((a, b) => a.rect.y - b.rect.y);
        orderedLines.push(...missing);
      }
    }

    // 3. GROUP ORDERED LINES INTO COHERENT PARAGRAPHS
    const rawParagraphs: Array<{ lines: GroupedLine[]; text: string }> = [];
    let curLines: GroupedLine[] = [];

    const flushParagraph = () => {
      if (curLines.length === 0) return;

      // De-hyphenate words broken across line breaks
      let combined = '';
      for (let i = 0; i < curLines.length; i++) {
        const lineText = curLines[i].text;
        if (i === 0) {
          combined = lineText;
        } else {
          if (combined.endsWith('-')) {
            combined = combined.slice(0, -1) + lineText;
          } else {
            combined += ' ' + lineText;
          }
        }
      }

      combined = cleanPdfTextFragment(combined);

      if (combined.length >= 8) {
        rawParagraphs.push({
          lines: [...curLines],
          text: combined,
        });
      }
      curLines = [];
    };

    for (let i = 0; i < orderedLines.length; i++) {
      const line = orderedLines[i];

      if (curLines.length === 0) {
        curLines.push(line);
        continue;
      }

      const prevLine = curLines[curLines.length - 1];

      // If switching columns, definitely start new paragraph
      const columnChanged = line.column !== prevLine.column;
      const verticalGap = line.rect.y - (prevLine.rect.y + prevLine.rect.height);
      const isLargeVerticalGap = verticalGap > Math.max(prevLine.rect.height * 0.75, 0.015);
      const isFontSizeJump =
        line.fontSize > prevLine.fontSize * 1.3 || line.fontSize < prevLine.fontSize * 0.75;
      const prevEndsSentence = /[.?!:]\s*$/.test(prevLine.text.trim());
      const isHorizontalIndent =
        line.rect.x - prevLine.rect.x > 0.03 && prevLine.text.trim().endsWith('.');

      if (
        columnChanged ||
        isLargeVerticalGap ||
        isFontSizeJump ||
        (prevEndsSentence && (isHorizontalIndent || verticalGap > 0.008))
      ) {
        flushParagraph();
      }

      curLines.push(line);
    }
    flushParagraph();

    // 4. SEGMENTATION DISPATCH: 'paragraph' vs 'sentence'
    const finalResults: ExtractedParagraph[] = [];

    if (mode === 'sentence') {
      // Sentence-by-sentence mode: split each paragraph into distinct sentences
      let sentenceIndex = 1;

      for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
        const para = rawParagraphs[pIdx];
        const sentences = splitIntoAcademicSentences(para.text);

        if (sentences.length <= 1) {
          // Single sentence paragraph
          finalResults.push({
            id: `s-${sentenceIndex}`,
            index: sentenceIndex,
            original: para.text,
            translated: '',
            pageNumber,
            rects: para.lines.map((l) => l.rect),
            anchorY: Math.round(para.lines[0].rect.y * 100),
          });
          sentenceIndex++;
        } else {
          // Multiple sentences: distribute lines to each sentence based on word overlap
          for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
            const sentenceText = sentences[sIdx];
            const sWords = sentenceText
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(/\s+/)
              .filter((w) => w.length > 2);

            // Find matching lines that contain words of this sentence
            const matchedLines = para.lines.filter((l) => {
              const lText = l.text.toLowerCase();
              return sWords.some((w) => lText.includes(w));
            });

            const assignedRects =
              matchedLines.length > 0
                ? matchedLines.map((l) => l.rect)
                : [para.lines[Math.min(sIdx, para.lines.length - 1)].rect];

            finalResults.push({
              id: `s-${sentenceIndex}`,
              index: sentenceIndex,
              original: sentenceText,
              translated: '',
              pageNumber,
              rects: assignedRects,
              anchorY: Math.round(assignedRects[0].y * 100),
            });
            sentenceIndex++;
          }
        }
      }
    } else {
      // Paragraph-by-paragraph mode (default)
      for (let i = 0; i < rawParagraphs.length; i++) {
        const para = rawParagraphs[i];
        finalResults.push({
          id: `para-${i}`,
          index: i + 1,
          original: para.text,
          translated: '',
          pageNumber,
          rects: para.lines.map((l) => l.rect),
          anchorY: Math.round(para.lines[0].rect.y * 100),
        });
      }
    }

    // Fallback if empty
    if (finalResults.length === 0 && validLines.length > 0) {
      const allText = cleanPdfTextFragment(validLines.map((l) => l.text).join(' '));
      finalResults.push({
        id: `para-0`,
        index: 1,
        original: allText,
        translated: '',
        pageNumber,
        rects: validLines.map((l) => l.rect),
        anchorY: Math.round(validLines[0].rect.y * 100),
      });
    }

    return finalResults;
  } catch (err) {
    console.warn(`Failed to extract structured paragraphs from page ${pageNumber}:`, err);
    return [];
  }
}

/**
 * Text/Markdown fallback paragraph and sentence extractor
 */
export function extractParagraphsFromText(
  text: string,
  pageNumber: number = 1,
  mode: TranslationSegmentationMode = 'paragraph'
): ExtractedParagraph[] {
  if (!text || !text.trim()) return [];

  const rawChunks = text
    .split(/\n\s*\n+/)
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter((c) => c.length > 15);

  if (mode === 'sentence') {
    const sentences = splitIntoAcademicSentences(text.trim());
    return sentences.map((sentence, idx) => ({
      id: `s-${idx + 1}`,
      index: idx + 1,
      original: sentence,
      translated: '',
      pageNumber,
      rects: [
        {
          x: 0.05,
          y: Math.min(0.9, 0.05 + idx * 0.06),
          width: 0.9,
          height: 0.05,
        },
      ],
      anchorY: Math.round(Math.min(95, 5 + idx * 6)),
    }));
  }

  return rawChunks.map((chunk, idx) => ({
    id: `para-${idx}`,
    index: idx + 1,
    original: chunk,
    translated: '',
    pageNumber,
    rects: [
      {
        x: 0.05,
        y: Math.min(0.9, 0.05 + idx * 0.15),
        width: 0.9,
        height: 0.12,
      },
    ],
    anchorY: Math.round(Math.min(90, 5 + idx * 15)),
  }));
}
