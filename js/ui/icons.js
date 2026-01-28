/**
 * Initialize Lucide icons throughout the page.
 *
 * Checks if the global `lucide` object exists, then renders all icons
 * that have `data-lucide` attributes.
 */
export function initIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}
