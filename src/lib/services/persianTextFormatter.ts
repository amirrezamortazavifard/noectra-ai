/**
 * Professional Persian Typography & Academic Text Formatter
 * Formats Persian translations with correct ZWNJ (نیم‌فاصله),
 * standardized characters, Persian punctuation, and clean typography.
 */

export function formatPersianAcademicText(text: string): string {
  if (!text) return '';

  let res = text.trim();

  // 1. Normalize Arabic characters to Persian (ی and ک)
  res = res.replace(/\u064A/g, '\u06CC'); // Arabic Yeh -> Persian Yeh (ی)
  res = res.replace(/\u0643/g, '\u06A9'); // Arabic Kaf -> Persian Keheh (ک)
  res = res.replace(/\u06C0/g, '\u0647\u200C\u06CC'); // Heh with Yeh above -> Heh + ZWNJ + Yeh

  // 2. Fix Persian Half-Space (ZWNJ \u200c) for prefixes:
  // "می شود" -> "می‌شود", "نمی تواند" -> "نمی‌تواند"
  res = res.replace(/(^|\s)(می|نمی)\s+([^\s]+)/gu, '$1$2\u200C$3');

  // 3. Fix Half-Space for plural and comparative suffixes:
  // "کتاب ها" -> "کتاب‌ها", "روش هایی" -> "روش‌هایی"
  res = res.replace(/([^\s]+)\s+(های?|هایی?|ها|هایشان|هایمان|هایتان)([\s.,،؛؟!)\]}]|$)/gu, '$1\u200C$2$3');
  // "بزرگ تر" -> "بزرگ‌تر", "سریع ترین" -> "سریع‌ترین"
  res = res.replace(/([^\s]+)\s+(تر|ترین)([\s.,،؛؟!)\]}]|$)/gu, '$1\u200C$2$3');
  // "شناخته شده" -> "شناخته‌شده"
  res = res.replace(/([^\s]+ه)\s+(شده|ای|ام|ایم|اید|اند)([\s.,،؛؟!)\]}]|$)/gu, '$1\u200C$2$3');

  // 4. Standardize punctuation marks for Persian:
  // English comma to Persian comma (when preceded or followed by Persian text)
  res = res.replace(/([آ-ی])\s*,\s*/gu, '$1، ');
  res = res.replace(/\s*,\s*([آ-ی])/gu, '، $1');
  // Semicolon to Persian semicolon
  res = res.replace(/([آ-ی])\s*;\s*/gu, '$1؛ ');
  // Question mark to Persian question mark
  res = res.replace(/([آ-ی][^?]*)\?/gu, '$1؟');

  // 5. Clean up duplicate spaces and standardize parenthesis spacing
  res = res.replace(/[ \t]+/g, ' ');
  res = res.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

  return res.trim();
}

/**
 * Check if a language code or name requires Right-to-Left (RTL) layout
 */
export function isRtlLanguage(lang: string): boolean {
  if (!lang) return false;
  const l = lang.toLowerCase();
  return (
    l.includes('persian') ||
    l.includes('farsi') ||
    l.includes('arabic') ||
    l.includes('hebrew') ||
    l.includes('urdu') ||
    l === 'fa' ||
    l === 'ar' ||
    l === 'he' ||
    l === 'ur'
  );
}

/**
 * Remove line breaks and hyphens produced by PDF justification,
 * e.g., "computa- tion" -> "computation"
 */
export function cleanPdfTextFragment(text: string): string {
  if (!text) return '';
  return text
    // Remove hyphenation at line breaks
    .replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2')
    // Replace internal newlines with single spaces
    .replace(/\r?\n+/g, ' ')
    // Collapse duplicate whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
