/**
 * Escapes HTML special characters to prevent XSS injection.
 *
 * @param {string} value - Raw string to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
