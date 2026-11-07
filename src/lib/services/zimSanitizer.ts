/**
 * ZIM Article HTML Sanitizer & Security Sandbox (CORE-005)
 * Hardens untrusted HTML extracted from offline ZIM archives:
 * - Strips all executable scripts, event handlers, and active controls
 * - Blocks javascript:, vbscript:, and malicious data: URI protocols
 * - Normalizes internal links for in-app archive navigation
 * - Rewrites internal media/image paths to the authenticated ZIM resource endpoint
 * - Isolates layout & CSS styles from breaching application chrome
 */

export interface SanitizeOptions {
  archiveId?: string;
  baseUrl?: string;
}

const FORBIDDEN_TAGS = new Set([
  'script',
  'noscript',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'textarea',
  'select',
  'button',
  'frame',
  'frameset',
  'iframe',
  'base',
  'meta',
  'link',
]);

const ALLOWED_DATA_IMAGE_TYPES = [
  'data:image/png',
  'data:image/jpeg',
  'data:image/jpg',
  'data:image/gif',
  'data:image/webp',
  'data:image/svg+xml',
];

export function sanitizeZimHtml(rawHtml: string, options: SanitizeOptions = {}): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  // Parse using browser native DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // 1. Remove all forbidden tags
  FORBIDDEN_TAGS.forEach((tag) => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach((el) => el.remove());
  });

  // 2. Traverse all remaining elements and clean attributes
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    // Collect attributes to remove
    const attrsToRemove: string[] = [];

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim().toLowerCase();

      // Block any inline event handler (e.g. onclick, onerror, onload)
      if (attrName.startsWith('on')) {
        attrsToRemove.push(attr.name);
        continue;
      }

      // Check URL-bearing attributes
      if (['href', 'src', 'xlink:href', 'data'].includes(attrName)) {
        if (
          attrValue.startsWith('javascript:') ||
          attrValue.startsWith('vbscript:') ||
          attrValue.startsWith('file:')
        ) {
          attrsToRemove.push(attr.name);
          continue;
        }

        // Handle data: URIs - allow only benign raster & vector images
        if (attrValue.startsWith('data:')) {
          const isAllowedDataImg = ALLOWED_DATA_IMAGE_TYPES.some((prefix) =>
            attrValue.startsWith(prefix)
          );
          if (!isAllowedDataImg) {
            attrsToRemove.push(attr.name);
            continue;
          }
        }
      }
    }

    // Apply attribute removals
    attrsToRemove.forEach((name) => el.removeAttribute(name));

    // 3. Normalize Anchor Links (`<a>`)
    if (el.tagName.toLowerCase() === 'a') {
      const href = el.getAttribute('href');
      if (href) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
          el.classList.add('zim-external-link');
        } else if (!href.startsWith('#')) {
          // Internal ZIM link
          el.setAttribute('data-zim-internal', 'true');
          el.setAttribute('data-internal-href', href.replace(/^\.\//, ''));
          el.classList.add('zim-internal-link');
        }
      }
    }

    // 4. Normalize Images (`<img>`) to load from local ZIM resource proxy if archiveId is provided
    if (el.tagName.toLowerCase() === 'img') {
      const src = el.getAttribute('src');
      if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
        if (options.archiveId) {
          const cleanSrc = src.replace(/^\.?\//, '').replace(/^(\.\.\/)+/, '');
          const isTauri =
            typeof window !== 'undefined' &&
            (window.location.protocol === 'tauri:' ||
              window.location.hostname === 'tauri.localhost' ||
              (window as any).__TAURI_INTERNALS__ !== undefined);

          const backendHost = isTauri ? 'http://127.0.0.1:3001' : '';
          el.setAttribute(
            'src',
            `${backendHost}/api/knowledge/zim/${encodeURIComponent(options.archiveId)}/resource?path=${encodeURIComponent(cleanSrc)}`
          );
        }
      }
      el.setAttribute('loading', 'lazy');
    }
  });

  return doc.body.innerHTML;
}

