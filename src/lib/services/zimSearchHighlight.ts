/**
 * Utilities for highlighting typeahead prefix and substring matches across
 * English, Persian, and Arabic titles.
 */

export interface HighlightSplit {
  before: string;
  match: string;
  after: string;
}

const CHAR_EQUIV_MAP: Record<string, string> = {
  '\u0643': '\u06A9', // Arabic Kaf -> Persian Kaf
  '\u064A': '\u06CC', // Arabic Yeh -> Persian Yeh
  '\u0649': '\u06CC', // Alef Maksura -> Persian Yeh
  '\u0623': '\u0627', // Alef with Hamza Above -> Alef
  '\u0625': '\u0627', // Alef with Hamza Below -> Alef
  '\u0671': '\u0627', // Alef Wasla -> Alef
  '\u06BE': '\u0647', // Heh Doachashmee -> Heh
  '\u06D5': '\u0647', // Ae -> Heh
  '\u200C': ' ', // ZWNJ -> space
  '\u200D': ' ', // ZWJ -> space
  '_': ' ',
};

const DIACRITIC_RE = /[\u064B-\u065F\u0670\u0640]/;

function normalizeChar(ch: string): string {
  if (DIACRITIC_RE.test(ch)) return '';
  const mapped = CHAR_EQUIV_MAP[ch] ?? ch;
  return mapped.toLowerCase();
}

export function normalizeQueryForMatch(text: string): string {
  let out = '';
  let lastSpace = true;
  for (const ch of text.trim()) {
    const norm = normalizeChar(ch);
    if (!norm) continue;
    if (/\s/.test(norm)) {
      if (!lastSpace) {
        out += ' ';
        lastSpace = true;
      }
    } else {
      out += norm;
      lastSpace = false;
    }
  }
  return out.trim();
}

/**
 * Splits `title` into `{ before, match, after }` around the first normalized
 * occurrence of `query` (preferring start-of-title prefix matches).
 */
export function splitTitleForHighlight(title: string, query: string): HighlightSplit {
  const normQuery = normalizeQueryForMatch(query);
  if (!normQuery || !title) {
    return { before: title, match: '', after: '' };
  }

  // Build normalized string alongside original UTF-16 index mapping
  let normTitle = '';
  const origStartIdx: number[] = [];
  const origEndIdx: number[] = [];

  let i = 0;
  let lastSpace = true;
  while (i < title.length) {
    const codePoint = title.codePointAt(i)!;
    const charStr = String.fromCodePoint(codePoint);
    const step = charStr.length;
    const norm = normalizeChar(charStr);

    if (norm) {
      if (/\s/.test(norm)) {
        if (!lastSpace) {
          origStartIdx.push(i);
          origEndIdx.push(i + step);
          normTitle += ' ';
          lastSpace = true;
        }
      } else {
        for (const lc of norm) {
          origStartIdx.push(i);
          origEndIdx.push(i + step);
          normTitle += lc;
        }
        lastSpace = false;
      }
    }

    i += step;
  }

  if (normTitle.endsWith(' ')) {
    normTitle = normTitle.slice(0, -1);
    origStartIdx.pop();
    origEndIdx.pop();
  }

  const foundPos = normTitle.indexOf(normQuery);
  if (foundPos === -1) {
    return { before: title, match: '', after: '' };
  }

  const startOrig = origStartIdx[foundPos] ?? 0;
  const endOrig = origEndIdx[foundPos + normQuery.length - 1] ?? title.length;

  return {
    before: title.slice(0, startOrig),
    match: title.slice(startOrig, endOrig),
    after: title.slice(endOrig),
  };
}

export function getMatchBadgeLabel(matchType?: string): string | null {
  switch (matchType) {
    case 'exact':
      return 'Exact';
    case 'prefix':
      return 'Starts with';
    case 'word_prefix':
      return 'Word match';
    case 'contains':
      return 'Contains';
    default:
      return null;
  }
}
