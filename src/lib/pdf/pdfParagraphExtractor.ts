import * as pdfjsLib from 'pdfjs-dist';
import { HighlightRect, ParagraphTranslation } from '@/components/PdfReader/types';
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
}

/**
 * Extract visually and logically grouped paragraphs with accurate bounding rects
 * from a pdfjs PDFPageProxy.
 */
export async function extractParagraphsFromPage(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number
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

    // Sort items top-to-bottom, left-to-right with baseline tolerance
    itemBoxes.sort((a, b) => {
      const yDiff = a.top - b.top;
      if (Math.abs(yDiff) > 0.006) {
        return yDiff;
      }
      return a.left - b.left;
    });

    // 1. Group items into physical lines
    const lines: GroupedLine[] = [];
    let currentLine: {
      text: string;
      left: number;
      top: number;
      right: number;
      bottom: number;
      fontSizeSum: number;
      count: number;
      hasEOL: boolean;
    } | null = null;

    for (const item of itemBoxes) {
      if (!currentLine) {
        currentLine = {
          text: item.str,
          left: item.left,
          top: item.top,
          right: item.left + item.width,
          bottom: item.top + item.height,
          fontSizeSum: item.fontSize,
          count: 1,
          hasEOL: item.hasEOL,
        };
        continue;
      }

      const isSameLine = Math.abs(item.top - currentLine.top) < 0.007;

      if (isSameLine) {
        // Append to current line with space if separated
        const needsSpace =
          !currentLine.text.endsWith(' ') &&
          !item.str.startsWith(' ') &&
          item.left > currentLine.right + 0.002;

        currentLine.text += (needsSpace ? ' ' : '') + item.str;
        currentLine.right = Math.max(currentLine.right, item.left + item.width);
        currentLine.bottom = Math.max(currentLine.bottom, item.top + item.height);
        currentLine.top = Math.min(currentLine.top, item.top);
        currentLine.fontSizeSum += item.fontSize;
        currentLine.count += 1;
        currentLine.hasEOL = currentLine.hasEOL || item.hasEOL;
      } else {
        // Push finished line
        lines.push({
          text: currentLine.text.trim(),
          rect: {
            x: currentLine.left,
            y: currentLine.top,
            width: Math.max(0.01, currentLine.right - currentLine.left),
            height: Math.max(0.005, currentLine.bottom - currentLine.top),
          },
          fontSize: currentLine.fontSizeSum / currentLine.count,
          hasEOL: currentLine.hasEOL,
        });

        currentLine = {
          text: item.str,
          left: item.left,
          top: item.top,
          right: item.left + item.width,
          bottom: item.top + item.height,
          fontSizeSum: item.fontSize,
          count: 1,
          hasEOL: item.hasEOL,
        };
      }
    }

    if (currentLine) {
      lines.push({
        text: currentLine.text.trim(),
        rect: {
          x: currentLine.left,
          y: currentLine.top,
          width: Math.max(0.01, currentLine.right - currentLine.left),
          height: Math.max(0.005, currentLine.bottom - currentLine.top),
        },
        fontSize: currentLine.fontSizeSum / currentLine.count,
        hasEOL: currentLine.hasEOL,
      });
    }

    if (lines.length === 0) return [];

    // Filter out edge noise (isolated page numbers, running headers at top 2% or bottom 2% with < 5 chars)
    const validLines = lines.filter((l) => {
      const isExtremeEdge = l.rect.y < 0.025 || l.rect.y > 0.975;
      if (isExtremeEdge && l.text.length < 8) return false;
      return l.text.length > 0;
    });

    if (validLines.length === 0) return [];

    // 2. Group lines into coherent Paragraphs
    const paragraphs: ExtractedParagraph[] = [];
    let curLines: GroupedLine[] = [];

    const flushParagraph = () => {
      if (curLines.length === 0) return;

      // De-hyphenate words broken across lines
      let combinedText = '';
      for (let i = 0; i < curLines.length; i++) {
        const lineText = curLines[i].text;
        if (i === 0) {
          combinedText = lineText;
        } else {
          if (combinedText.endsWith('-')) {
            // Check if hyphenated word continuation
            combinedText = combinedText.slice(0, -1) + lineText;
          } else {
            combinedText += ' ' + lineText;
          }
        }
      }

      combinedText = cleanPdfTextFragment(combinedText);

      // Only add meaningful content
      if (combinedText.length >= 10) {
        const rects = curLines.map((l) => l.rect);
        const anchorY = Math.round(rects[0].y * 100);

        paragraphs.push({
          id: `para-${paragraphs.length}`,
          index: paragraphs.length + 1,
          original: combinedText,
          translated: '',
          pageNumber,
          rects,
          anchorY,
        });
      }

      curLines = [];
    };

    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];

      if (curLines.length === 0) {
        curLines.push(line);
        continue;
      }

      const prevLine = curLines[curLines.length - 1];
      const verticalGap = line.rect.y - (prevLine.rect.y + prevLine.rect.height);
      const isLargeVerticalGap = verticalGap > Math.max(prevLine.rect.height * 0.75, 0.015);
      const isFontSizeJump =
        line.fontSize > prevLine.fontSize * 1.3 || line.fontSize < prevLine.fontSize * 0.75;
      const isHorizontalIndent =
        line.rect.x - prevLine.rect.x > 0.035 && prevLine.text.trim().endsWith('.');
      const prevEndsSentence = /[.?!:]\s*$/.test(prevLine.text.trim());
      const isColumnJump = Math.abs(line.rect.x - prevLine.rect.x) > 0.25 && line.rect.y < prevLine.rect.y;

      // Condition to start a new paragraph
      if (
        isLargeVerticalGap ||
        isFontSizeJump ||
        isColumnJump ||
        (prevEndsSentence && (isHorizontalIndent || verticalGap > 0.008))
      ) {
        flushParagraph();
      }

      curLines.push(line);
    }

    flushParagraph();

    // Fallback if clustering resulted in empty set
    if (paragraphs.length === 0 && validLines.length > 0) {
      const allText = cleanPdfTextFragment(validLines.map((l) => l.text).join(' '));
      paragraphs.push({
        id: `para-0`,
        index: 1,
        original: allText,
        translated: '',
        pageNumber,
        rects: validLines.map((l) => l.rect),
        anchorY: Math.round(validLines[0].rect.y * 100),
      });
    }

    return paragraphs;
  } catch (err) {
    console.warn(`Failed to extract structured paragraphs from page ${pageNumber}:`, err);
    return [];
  }
}

/**
 * Text/Markdown fallback paragraph extractor
 */
export function extractParagraphsFromText(
  text: string,
  pageNumber: number = 1
): ExtractedParagraph[] {
  if (!text || !text.trim()) return [];

  // Split by double line breaks or chunk by sentence groups if unformatted
  const rawChunks = text
    .split(/\n\s*\n+/)
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter((c) => c.length > 20);

  if (rawChunks.length === 0 && text.trim().length > 0) {
    return [
      {
        id: `para-0`,
        index: 1,
        original: text.trim(),
        translated: '',
        pageNumber,
        rects: [{ x: 0.05, y: 0.1, width: 0.9, height: 0.8 }],
        anchorY: 10,
      },
    ];
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
