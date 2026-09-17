export interface DocumentChunk {
  id: string;
  documentId: string;
  pageNumber: number;
  sectionTitle?: string;
  text: string;
  charCount: number;
  tokenEstimate: number;
}

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

/**
 * Splits text into semantic chunks respecting sentence and paragraph boundaries.
 */
export function chunkDocumentText(
  documentId: string,
  pages: Array<{ pageNumber: number; text: string; sectionTitle?: string }>,
  options: ChunkOptions = {}
): DocumentChunk[] {
  const maxChars = options.maxChars || 600;
  const overlapChars = options.overlapChars || 120;
  const chunks: DocumentChunk[] = [];
  let chunkCounter = 0;

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    // If page is smaller than maxChars, keep it as single chunk
    if (pageText.length <= maxChars) {
      chunks.push({
        id: `${documentId}_p${page.pageNumber}_c${chunkCounter++}`,
        documentId,
        pageNumber: page.pageNumber,
        sectionTitle: page.sectionTitle,
        text: pageText,
        charCount: pageText.length,
        tokenEstimate: Math.ceil(pageText.length / 4),
      });
      continue;
    }

    // Split by paragraphs first, then sentences
    const paragraphs = pageText.split(/\n\s*\n/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const cleanPara = paragraph.trim();
      if (!cleanPara) continue;

      if ((currentChunk + ' ' + cleanPara).length <= maxChars) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
      } else {
        // Need to split the paragraph by sentences if it's too large
        const sentences = cleanPara.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [cleanPara];
        for (const sentence of sentences) {
          const cleanSentence = sentence.trim();
          if (!cleanSentence) continue;

          if ((currentChunk + ' ' + cleanSentence).length <= maxChars) {
            currentChunk = currentChunk ? `${currentChunk} ${cleanSentence}` : cleanSentence;
          } else {
            if (currentChunk.trim().length > 0) {
              chunks.push({
                id: `${documentId}_p${page.pageNumber}_c${chunkCounter++}`,
                documentId,
                pageNumber: page.pageNumber,
                sectionTitle: page.sectionTitle,
                text: currentChunk.trim(),
                charCount: currentChunk.trim().length,
                tokenEstimate: Math.ceil(currentChunk.trim().length / 4),
              });

              // Apply overlap
              const overlap = currentChunk.slice(-overlapChars);
              currentChunk = `${overlap} ${cleanSentence}`.trim();
            } else {
              currentChunk = cleanSentence;
            }
          }
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${documentId}_p${page.pageNumber}_c${chunkCounter++}`,
        documentId,
        pageNumber: page.pageNumber,
        sectionTitle: page.sectionTitle,
        text: currentChunk.trim(),
        charCount: currentChunk.trim().length,
        tokenEstimate: Math.ceil(currentChunk.trim().length / 4),
      });
    }
  }

  return chunks;
}
