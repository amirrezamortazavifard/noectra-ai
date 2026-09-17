import { chunkDocumentText, DocumentChunk } from './documentChunker';
import {
  saveDocumentIndex,
  getDocumentIndex,
  isDocumentIndexed,
  DocumentVectorIndex,
  StoredChunk,
} from './vectorStore';

// Common stop words to prune noise
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could',
  'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
  // Persian common stop words
  'از', 'به', 'با', 'در', 'برای', 'که', 'این', 'آن', 'است', 'شد', 'بود', 'شدند',
  'و', 'یا', 'اما', 'تا', 'یک', 'را', 'بر', 'هم', 'نیز', 'هر', 'چه', 'می', 'بر روی'
]);

/**
 * Tokenizes text into lowercase normalized terms.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

/**
 * Calculates term frequencies for a list of tokens.
 */
function getTermFrequencies(tokens: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
}

/**
 * Builds and persists a full BM25 / Vector Index for a document.
 */
export async function indexDocument(
  documentId: string,
  title: string,
  pages: Array<{ pageNumber: number; text: string; sectionTitle?: string }>,
  onProgress?: (progress: number, status: string) => void
): Promise<DocumentVectorIndex> {
  onProgress?.(10, 'Chunking document text...');
  const rawChunks = chunkDocumentText(documentId, pages);

  onProgress?.(40, `Processing ${rawChunks.length} chunks...`);
  const storedChunks: StoredChunk[] = [];
  const docFreqMap: Record<string, number> = {};
  let totalWords = 0;

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const tokens = tokenize(chunk.text);
    const terms = getTermFrequencies(tokens);

    totalWords += tokens.length;

    // Track unique terms in chunk for IDF
    for (const term of Object.keys(terms)) {
      docFreqMap[term] = (docFreqMap[term] || 0) + 1;
    }

    storedChunks.push({
      ...chunk,
      terms,
    });

    if (i % 20 === 0 || i === rawChunks.length - 1) {
      const pct = 40 + Math.round((i / rawChunks.length) * 40);
      onProgress?.(pct, `Indexed chunk ${i + 1} of ${rawChunks.length}`);
    }
  }

  const N = storedChunks.length;
  const idfMap: Record<string, number> = {};
  for (const [term, df] of Object.entries(docFreqMap)) {
    // Standard Robertson-Spärck Jones IDF
    idfMap[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  const avgChunkLength = N > 0 ? totalWords / N : 1;

  const vectorIndex: DocumentVectorIndex = {
    meta: {
      documentId,
      title,
      pageCount: pages.length,
      chunkCount: storedChunks.length,
      indexedAt: Date.now(),
    },
    chunks: storedChunks,
    idfMap,
    avgChunkLength,
  };

  onProgress?.(90, 'Saving index to local storage...');
  await saveDocumentIndex(vectorIndex);
  onProgress?.(100, `Ready (${storedChunks.length} chunks indexed)`);

  return vectorIndex;
}

export interface RagSearchResult {
  chunk: StoredChunk;
  score: number;
  highlightExcerpt: string;
}

/**
 * Searches the indexed document using the BM25 probabilistic relevance algorithm.
 */
export async function searchDocument(
  documentId: string,
  query: string,
  topK = 5
): Promise<RagSearchResult[]> {
  const index = await getDocumentIndex(documentId);
  if (!index || index.chunks.length === 0) {
    return [];
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const k1 = 1.5;
  const b = 0.75;
  const { chunks, idfMap, avgChunkLength } = index;

  const results: Array<{ chunk: StoredChunk; score: number }> = [];

  for (const chunk of chunks) {
    let score = 0;
    const chunkWordCount = Object.values(chunk.terms).reduce((a, b) => a + b, 0);

    for (const token of queryTokens) {
      const tf = chunk.terms[token] || 0;
      if (tf > 0) {
        const idf = idfMap[token] || 0.5;
        // BM25 term weighting formula
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (chunkWordCount / (avgChunkLength || 1)));
        score += idf * (numerator / denominator);
      }
    }

    if (score > 0) {
      results.push({ chunk, score });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK).map(({ chunk, score }) => {
    // Generate snippet preview highlighting matching terms
    let excerpt = chunk.text;
    if (excerpt.length > 280) {
      excerpt = excerpt.substring(0, 280) + '...';
    }
    return {
      chunk,
      score: Math.round(score * 100) / 100,
      highlightExcerpt: excerpt,
    };
  });
}

/**
 * Formats top-k retrieved RAG chunks into structured grounding prompt context.
 */
export function formatRagContextForPrompt(results: RagSearchResult[]): string {
  if (!results.length) return '';

  let context = `\n\n[VERIFIED DOCUMENT EXCERPTS FROM KNOWLEDGE BASE]:\n`;
  for (const { chunk } of results) {
    context += `\n--- SOURCE: PAGE ${chunk.pageNumber} (${chunk.sectionTitle || 'Content Chunk'}) ---\n`;
    context += `"${chunk.text}"\n`;
  }
  context += `\n[INSTRUCTION]: Answer the user question based on the document excerpts above. Provide citations in the exact format [[Page:X | "short quote"]] whenever referencing facts.\n`;

  return context;
}
