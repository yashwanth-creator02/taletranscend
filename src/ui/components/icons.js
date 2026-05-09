// src/ui/components/icons.js
// Initializes Lucide icons across the page.
// Call this after any DOM update that introduces new data-lucide attributes.

/**
 * Renders all Lucide icons found in the current DOM.
 * Safe to call multiple times — skips silently if Lucide is not loaded.
 */
export function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
