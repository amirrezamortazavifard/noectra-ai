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
  right: number;
  bottom: number;
  fontSize: number;
  hasEOL: boolean;
}

interface GroupedLine {
  text: string;
  rect: HighlightRect;
  fontSize: number;
  hasEOL: boolean;
  column: string;
}

export interface ColumnZone {
  xStart: number;
  xEnd: number;
}

/**
 * Detect text columns using Harumi-inspired X-density histogram projection.
 * Discretizes horizontal space into fine buckets and locates unoccupied gaps (gutters).
 * Uses density-weighted thresholding to prevent single stray characters (like page numbers
 * in footers) from fragmenting or destroying real column gutters.
 */
export function detectTextColumns(
  items: ItemBox[],
  minGapRatio: number = 0.020 // 2.0% of page width (~12-15 pt)
): ColumnZone[] {
  if (items.length === 0) return [{ xStart: 0, xEnd: 1.0 }];

  // Exclude single running headers/footers (e.g. standalone page number at bottom center)
  const contentItems = items.filter((it) => {
    const isFooterNoise = it.top > 0.93 && it.str.trim().length <= 6;
    const isHeaderNoise = it.top < 0.04 && it.str.trim().length <= 6;
    return !isFooterNoise && !isHeaderNoise;
  });

  const BUCKET_SIZE = 0.005; // 0.5% page width (~3 pt per bucket)
  const numBuckets = Math.ceil(1.0 / BUCKET_SIZE) + 1;
  const bucketCounts = new Int32Array(numBuckets);

  for (const item of contentItems) {
    const lo = Math.max(0, Math.floor(item.left / BUCKET_SIZE));
    const hi = Math.min(numBuckets - 1, Math.ceil(item.right / BUCKET_SIZE));
    for (let b = lo; b <= hi; b++) {
      bucketCounts[b]++;
    }
  }

  const maxDensity = Math.max(...bucketCounts);
  if (maxDensity < 3) return [{ xStart: 0, xEnd: 1.0 }];

  // A bucket is considered empty/gutter if its density is negligible (0 or noise <= 3% of peak)
  const gapThreshold = Math.max(0, Math.min(1, Math.floor(maxDensity * 0.03)));
  const minGapBuckets = Math.ceil(minGapRatio / BUCKET_SIZE);

  // Collect empty/gutter bucket spans
  const rawGaps: Array<{ start: number; end: number }> = [];
  let gapStart: number | null = null;

  for (let i = 0; i < numBuckets; i++) {
    if (bucketCounts[i] <= gapThreshold) {
      if (gapStart === null) gapStart = i;
    } else {
      if (gapStart !== null) {
        if (i - gapStart >= minGapBuckets) {
          rawGaps.push({ start: gapStart, end: i });
        }
        gapStart = null;
      }
    }
  }
  if (gapStart !== null && numBuckets - gapStart >= minGapBuckets) {
    rawGaps.push({ start: gapStart, end: numBuckets });
  }

  // Filter true gaps: must be in content area and have substantial items on both sides
  const trueGaps = rawGaps.filter((g) => {
    const gapLeft = g.start * BUCKET_SIZE;
    const gapRight = g.end * BUCKET_SIZE;
    if (gapLeft < 0.15 || gapRight > 0.85) return false;

    const leftCount = contentItems.filter((it) => it.right <= gapLeft + 0.010).length;
    const rightCount = contentItems.filter((it) => it.left >= gapRight - 0.010).length;
    return leftCount >= 4 && rightCount >= 4;
  });

  if (trueGaps.length === 0) {
    return [{ xStart: 0, xEnd: 1.0 }];
  }

  // Build column zones
  const zones: ColumnZone[] = [];
  let colStart = 0;

  for (const gap of trueGaps) {
    const gapLeft = gap.start * BUCKET_SIZE;
    const gapRight = gap.end * BUCKET_SIZE;
    if (gapLeft > colStart) {
      zones.push({
        xStart: colStart,
        xEnd: gapLeft,
      });
    }
    colStart = gapRight;
  }

  if (colStart < 1.0) {
    zones.push({
      xStart: colStart,
      xEnd: 1.0,
    });
  }

  return zones;
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
      /\b(e\.g\.|i\.e\.|et al\.|Fig\.|Figs\.|Tab\.|Tabs\.|Ref\.|Refs\.|Dr\.|Prof\.|Vol\.|No\.|vs\.|approx\.|dept\.|univ\.|al\.|Eq\.|Eqs\.|Sec\.|cf\.|ca\.)/gi,
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
 * Groups a collection of ItemBoxes strictly within a single column into physical lines.
 * Because all items in the array already belong to the same column partition,
 * items from another column can NEVER be joined horizontally.
 */
function groupItemsIntoLines(
  items: ItemBox[],
  columnType: string
): GroupedLine[] {
  if (items.length === 0) return [];

  // Sort items primarily by top (baseline) and secondarily by left
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.top - b.top;
    if (Math.abs(yDiff) > 0.005) {
      return yDiff;
    }
    return a.left - b.left;
  });

  const lines: GroupedLine[] = [];
  interface TempLine {
    text: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
    fontSizeSum: number;
    count: number;
    hasEOL: boolean;
  }

  const activeLines: TempLine[] = [];

  const flushLine = (b: TempLine) => {
    const text = b.text.trim();
    if (!text) return;
    const w = Math.max(0.01, b.right - b.left);
    const h = Math.max(0.005, b.bottom - b.top);
    lines.push({
      text,
      rect: {
        x: b.left,
        y: b.top,
        width: w,
        height: h,
      },
      fontSize: b.fontSizeSum / b.count,
      hasEOL: b.hasEOL,
      column: columnType,
    });
  };

  for (const item of sorted) {
    // Find active line with matching vertical baseline
    const matchedIdx = activeLines.findIndex(
      (l) =>
        Math.abs(item.top - l.top) < 0.007 &&
        item.left >= l.right - 0.015 &&
        item.left - l.right < 0.038 // Inter-word gap inside the same column
    );

    if (matchedIdx !== -1) {
      const l = activeLines[matchedIdx];
      const needsSpace =
        !l.text.endsWith(' ') && !item.str.startsWith(' ') && item.left > l.right + 0.001;
      l.text += (needsSpace ? ' ' : '') + item.str;
      l.right = Math.max(l.right, item.right);
      l.bottom = Math.max(l.bottom, item.bottom);
      l.top = Math.min(l.top, item.top);
      l.fontSizeSum += item.fontSize;
      l.count += 1;
      l.hasEOL = l.hasEOL || item.hasEOL;
    } else {
      // Flush lines that are completely above this item's baseline
      for (let i = activeLines.length - 1; i >= 0; i--) {
        if (activeLines[i].bottom < item.top - 0.010) {
          flushLine(activeLines[i]);
          activeLines.splice(i, 1);
        }
      }

      activeLines.push({
        text: item.str,
        left: item.left,
        top: item.top,
        right: item.right,
        bottom: item.bottom,
        fontSizeSum: item.fontSize,
        count: 1,
        hasEOL: item.hasEOL,
      });
    }
  }

  for (const b of activeLines) {
    flushLine(b);
  }

  // Sort lines top-to-bottom
  return lines.sort((a, b) => a.rect.y - b.rect.y);
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
        right: left + width,
        bottom: top + height,
        fontSize: height,
        hasEOL: Boolean(item.hasEOL),
      });
    }

    if (itemBoxes.length === 0) return [];

    // Filter out extreme page margin noise (running headers/footers)
    const validItems = itemBoxes.filter((item) => {
      const isExtremeEdge = item.top < 0.025 || item.top > 0.975;
      if (isExtremeEdge && item.str.length < 5) return false;
      return true;
    });

    if (validItems.length === 0) return [];

    // 1. IDENTIFY GENUINE FULL-WIDTH HORIZONTAL DIVIDERS (Figures, Tables, Titles, Captions)
    // A baseline is ONLY full-width if:
    // a) A single wide element exists (width >= 0.52), OR
    // b) The elements span >= 55% of the page AND there is NO interior column gutter gap
    //    between consecutive words in the middle zone [0.30, 0.70].
    interface FullWidthRegion {
      minY: number;
      maxY: number;
    }

    const baselineMap = new Map<number, ItemBox[]>();
    for (const item of validItems) {
      const key = Math.round(item.top * 160); // Group into baseline bins (~0.6% page height)
      if (!baselineMap.has(key)) baselineMap.set(key, []);
      baselineMap.get(key)!.push(item);
    }

    const fullWidthRegions: FullWidthRegion[] = [];
    for (const [, binItems] of baselineMap.entries()) {
      const sortedBin = [...binItems].sort((a, b) => a.left - b.left);
      const minLeft = sortedBin[0].left;
      const maxRight = Math.max(...sortedBin.map((i) => i.right));
      const minY = Math.min(...sortedBin.map((i) => i.top));
      const maxY = Math.max(...sortedBin.map((i) => i.bottom));
      const spanWidth = maxRight - minLeft;

      // Check for interior column gutter gap between consecutive items in the middle 40% of the page
      let hasInteriorGutter = false;
      for (let j = 0; j < sortedBin.length - 1; j++) {
        const gap = sortedBin[j + 1].left - sortedBin[j].right;
        const gapCenter = (sortedBin[j].right + sortedBin[j + 1].left) / 2;
        // In academic papers, column gutters are typically >= 2.5% page width
        if (gap >= 0.025 && gapCenter >= 0.30 && gapCenter <= 0.70) {
          hasInteriorGutter = true;
          break;
        }
      }

      const hasWideItem = sortedBin.some((i) => i.width >= 0.52);
      const isContinuousFullSpan =
        spanWidth >= 0.55 && minLeft < 0.32 && maxRight > 0.68 && !hasInteriorGutter;

      if (hasWideItem || isContinuousFullSpan) {
        fullWidthRegions.push({ minY, maxY });
      }
    }

    // Merge vertically overlapping or contiguous full-width divider regions
    fullWidthRegions.sort((a, b) => a.minY - b.minY);
    const mergedDividers: FullWidthRegion[] = [];
    for (const r of fullWidthRegions) {
      if (mergedDividers.length === 0) {
        mergedDividers.push({ ...r });
      } else {
        const last = mergedDividers[mergedDividers.length - 1];
        if (r.minY - last.maxY < 0.020) {
          last.maxY = Math.max(last.maxY, r.maxY);
        } else {
          mergedDividers.push({ ...r });
        }
      }
    }

    // 2. SLICE THE PAGE INTO VERTICAL BANDS (Full-Width Bands & Content Bands)
    interface LayoutBand {
      minY: number;
      maxY: number;
      type: 'full-width' | 'content';
    }

    const pageBands: LayoutBand[] = [];
    let curY = 0.0;

    for (const div of mergedDividers) {
      if (div.minY - curY > 0.035) {
        pageBands.push({ minY: curY, maxY: div.minY, type: 'content' });
      }
      pageBands.push({ minY: div.minY, maxY: div.maxY, type: 'full-width' });
      curY = div.maxY;
    }
    if (1.0 - curY > 0.035) {
      pageBands.push({ minY: curY, maxY: 1.0, type: 'content' });
    }
    if (pageBands.length === 0) {
      pageBands.push({ minY: 0.0, maxY: 1.0, type: 'content' });
    }

    // 3. PROCESS EACH BAND WITH HARUMI X-DENSITY COLUMN DETECTION & READING ORDER
    const orderedLines: GroupedLine[] = [];

    for (const band of pageBands) {
      const bandItems = validItems.filter(
        (item) => item.top >= band.minY - 0.005 && item.bottom <= band.maxY + 0.005
      );

      if (bandItems.length === 0) continue;

      if (band.type === 'full-width') {
        // Full width band: group into lines and read top-to-bottom
        const fullLines = groupItemsIntoLines(bandItems, 'full');
        orderedLines.push(...fullLines);
        continue;
      }

      // Content band: run Harumi-style X-density column detection
      const columnZones = detectTextColumns(bandItems, 0.020);

      if (columnZones.length > 1) {
        // Multi-column layout detected!
        // Group items into their respective column zones
        const spanningItems: ItemBox[] = [];
        const columnItemBuckets: ItemBox[][] = columnZones.map(() => []);

        for (const item of bandItems) {
          const itemCenter = item.left + item.width / 2;
          // Find matching column zone
          const matchingZoneIdx = columnZones.findIndex(
            (z) => itemCenter >= z.xStart - 0.008 && itemCenter <= z.xEnd + 0.008
          );

          if (matchingZoneIdx !== -1) {
            columnItemBuckets[matchingZoneIdx].push(item);
          } else {
            // Check if item spans across multiple columns (e.g. subheader)
            if (item.width >= 0.40) {
              spanningItems.push(item);
            } else {
              // Assign to closest zone by center distance
              let bestIdx = 0;
              let bestDist = Infinity;
              columnZones.forEach((z, idx) => {
                const zoneCenter = (z.xStart + z.xEnd) / 2;
                const dist = Math.abs(itemCenter - zoneCenter);
                if (dist < bestDist) {
                  bestDist = dist;
                  bestIdx = idx;
                }
              });
              columnItemBuckets[bestIdx].push(item);
            }
          }
        }

        // 1. Spanning header lines within this band (if any)
        if (spanningItems.length > 0) {
          const spanLines = groupItemsIntoLines(spanningItems, 'full');
          orderedLines.push(...spanLines);
        }

        // 2. STRICT COLUMN READING ORDER:
        // Read Column 0 from top to bottom completely, then Column 1, then Column 2, etc.
        for (let colIdx = 0; colIdx < columnZones.length; colIdx++) {
          const itemsInCol = columnItemBuckets[colIdx];
          if (itemsInCol.length === 0) continue;
          const colLines = groupItemsIntoLines(itemsInCol, `col-${colIdx}`);
          orderedLines.push(...colLines);
        }
      } else {
        // Single column flow: group all items and read top to bottom
        const singleLines = groupItemsIntoLines(bandItems, 'full');
        orderedLines.push(...singleLines);
      }
    }

    if (orderedLines.length === 0) return [];

    // 4. ASSEMBLE ORDERED LINES INTO COHERENT PARAGRAPHS
    const rawParagraphs: Array<{ lines: GroupedLine[]; text: string }> = [];
    let curLines: GroupedLine[] = [];

    const flushParagraph = () => {
      if (curLines.length === 0) return;

      // De-hyphenate words broken across line breaks (e.g. "for-" + "mats" -> "formats")
      let combined = '';
      for (let i = 0; i < curLines.length; i++) {
        const lineText = curLines[i].text;
        if (i === 0) {
          combined = lineText;
        } else {
          if (combined.endsWith('-') && /^[a-z]/.test(lineText)) {
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

      // Definite paragraph breaks:
      // 1. Column changed (switched from left to right or full)
      const columnChanged = line.column !== prevLine.column;
      // 2. Noticeable vertical line gap
      const verticalGap = line.rect.y - (prevLine.rect.y + prevLine.rect.height);
      const isLargeVerticalGap = verticalGap > Math.max(prevLine.rect.height * 0.75, 0.015);
      // 3. Font size transition (e.g. section title to body)
      const isFontSizeJump =
        line.fontSize > prevLine.fontSize * 1.3 || line.fontSize < prevLine.fontSize * 0.75;
      // 4. Sentence ending with indentation or paragraph margin
      const prevEndsSentence = /[.?!:]\s*$/.test(prevLine.text.trim());
      const isHorizontalIndent =
        line.rect.x - prevLine.rect.x > 0.015 && prevEndsSentence;

      if (
        columnChanged ||
        isLargeVerticalGap ||
        isFontSizeJump ||
        (prevEndsSentence && (isHorizontalIndent || verticalGap > 0.007))
      ) {
        flushParagraph();
      }

      curLines.push(line);
    }
    flushParagraph();

    // 5. SEGMENTATION DISPATCH: 'paragraph' vs 'sentence'
    const finalResults: ExtractedParagraph[] = [];

    if (mode === 'sentence') {
      // Sentence-by-sentence mode: slice each paragraph into individual sentences
      // and map each sentence to its exact character-span bounding rects
      let sentenceIndex = 1;

      for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
        const para = rawParagraphs[pIdx];
        const sentences = splitIntoAcademicSentences(para.text);

        if (sentences.length <= 1) {
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
          // Pre-calculate line character spans within paragraph text
          let searchIdx = 0;
          const lineCharSpans: Array<{ start: number; end: number; line: GroupedLine }> = [];
          for (const l of para.lines) {
            const clean = l.text.trim();
            const foundAt = para.text.indexOf(clean, searchIdx);
            if (foundAt !== -1) {
              lineCharSpans.push({ start: foundAt, end: foundAt + clean.length, line: l });
              searchIdx = foundAt + clean.length;
            } else {
              lineCharSpans.push({ start: searchIdx, end: searchIdx + clean.length, line: l });
              searchIdx += clean.length;
            }
          }

          let sentSearchIdx = 0;
          for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
            const sentenceText = sentences[sIdx];
            const sStart = para.text.indexOf(sentenceText, sentSearchIdx);
            const sEnd = sStart !== -1 ? sStart + sentenceText.length : sentSearchIdx + sentenceText.length;
            if (sStart !== -1) {
              sentSearchIdx = sStart + sentenceText.length;
            }

            // Find overlapping lines and compute precise sub-rects
            const sentenceRects: HighlightRect[] = [];
            for (const span of lineCharSpans) {
              const overlapStart = Math.max(sStart, span.start);
              const overlapEnd = Math.min(sEnd, span.end);
              if (overlapStart < overlapEnd) {
                const spanLen = Math.max(1, span.end - span.start);
                const fracStart = Math.max(0, (overlapStart - span.start) / spanLen);
                const fracEnd = Math.min(1, (overlapEnd - span.start) / spanLen);

                const subX = span.line.rect.x + span.line.rect.width * fracStart;
                const subW = Math.max(0.01, span.line.rect.width * (fracEnd - fracStart));

                sentenceRects.push({
                  x: subX,
                  y: span.line.rect.y,
                  width: subW,
                  height: span.line.rect.height,
                });
              }
            }

            const assignedRects =
              sentenceRects.length > 0
                ? sentenceRects
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
    if (finalResults.length === 0 && orderedLines.length > 0) {
      const allText = cleanPdfTextFragment(orderedLines.map((l) => l.text).join(' '));
      finalResults.push({
        id: `para-0`,
        index: 1,
        original: allText,
        translated: '',
        pageNumber,
        rects: orderedLines.map((l) => l.rect),
        anchorY: Math.round(orderedLines[0].rect.y * 100),
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
