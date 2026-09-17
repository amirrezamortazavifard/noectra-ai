/**
 * Lightweight browser parsers for FB2, TXT, and MOBI document text.
 */

export interface ParsedDocumentResult {
  title: string;
  author: string;
  markdownContent: string;
}

/**
 * Parses FictionBook 2.0 XML format into structured Markdown.
 */
export function parseFb2Xml(xmlString: string): ParsedDocumentResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    // Title & Author extraction
    const bookTitle =
      doc.querySelector('book-title')?.textContent ||
      doc.querySelector('title')?.textContent ||
      'FictionBook Document';
    
    const firstName = doc.querySelector('first-name')?.textContent || '';
    const lastName = doc.querySelector('last-name')?.textContent || '';
    const author = `${firstName} ${lastName}`.trim() || 'Unknown Author';

    let markdown = `# ${bookTitle}\n*By ${author}*\n\n---\n\n`;

    // Extract body sections and paragraphs
    const bodies = doc.querySelectorAll('body');
    bodies.forEach((body) => {
      const sections = body.querySelectorAll('section');
      if (sections.length > 0) {
        sections.forEach((sec) => {
          const secTitle = sec.querySelector('title')?.textContent;
          if (secTitle) {
            markdown += `\n## ${secTitle.trim()}\n\n`;
          }
          const paras = sec.querySelectorAll('p');
          paras.forEach((p) => {
            const text = p.textContent?.trim();
            if (text) markdown += `${text}\n\n`;
          });
        });
      } else {
        const paras = body.querySelectorAll('p');
        paras.forEach((p) => {
          const text = p.textContent?.trim();
          if (text) markdown += `${text}\n\n`;
        });
      }
    });

    return {
      title: bookTitle,
      author,
      markdownContent: markdown,
    };
  } catch (err) {
    console.error('FB2 parsing failed:', err);
    return {
      title: 'FictionBook Document',
      author: '',
      markdownContent: xmlString.replace(/<[^>]+>/g, ' '),
    };
  }
}

/**
 * Basic text extraction from MOBI / AZW3 records.
 */
export function parseMobiBuffer(buffer: ArrayBuffer, fileName: string): ParsedDocumentResult {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(buffer);

    // Look for embedded HTML blocks in MOBI
    const htmlMatches = raw.match(/<html[\s\S]*?<\/html>/i);
    if (htmlMatches && htmlMatches[0]) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlMatches[0], 'text/html');
      const title = doc.querySelector('title')?.textContent || fileName;
      const text = doc.body.innerText || doc.body.textContent || '';
      return {
        title,
        author: '',
        markdownContent: `# ${title}\n\n${text}`,
      };
    }

    // Fallback: Clean printable strings
    const printable = raw.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
    const paragraphs = printable
      .split(/\n{2,}|\r{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30);

    return {
      title: fileName,
      author: '',
      markdownContent: `# ${fileName}\n\n${paragraphs.slice(0, 1500).join('\n\n')}`,
    };
  } catch (err) {
    console.error('MOBI parse error:', err);
    return {
      title: fileName,
      author: '',
      markdownContent: `# ${fileName}\n\nCould not extract MOBI content.`,
    };
  }
}
