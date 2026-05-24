/**
 * Escapes HTML special characters to prevent XSS injection.
 *
 * @param value - Raw string to escape
 * @returns HTML-safe string
 */
export function escapeHtml(value: string | number | null | undefined = ''): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
