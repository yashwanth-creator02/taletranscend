// src/utils/sanitize.utils.ts
// Central HTML sanitization for all user-generated content.
// Every innerHTML assignment that renders Firestore text MUST go through here.

import DOMPurify from 'dompurify';

/**
 * Sanitizes a raw HTML string for safe insertion into the DOM.
 * Allows only safe tags and attributes while stripping all event handlers,
 * javascript: URLs, and <script> tags.
 *
 * @param dirty - Raw user-generated or dynamic string
 * @returns Clean HTML string safe for innerHTML
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'ul',
      'ol',
      'li',
      'a',
      'figure',
      'figcaption',
      'img',
      'div',
      'span',
    ],

    ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'id', 'class', 'style', 'aria-hidden'],

    ALLOW_DATA_ATTR: true,
    SANITIZE_DOM: true,
  });
}

/**
 * Escapes a string for safe insertion as textContent.
 * Use this when you do NOT want any HTML rendering (e.g., tale titles in cards).
 *
 * @param text - Raw string
 * @returns Escaped string where < > & " are converted to entities
 */
export function escapeText(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
