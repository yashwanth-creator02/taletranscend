// src/ui/font.registry.js
// Manages reader font selection, persistence, and stylesheet loading.
// Font preference is stored in localStorage and applied via a CSS variable.

const FONT_STORAGE_KEY = 'taletranscend:reader-font';

/* ================= Font Sources ================= */

// External stylesheet URLs for all reader fonts.
// These are loaded once on page init by the reader page.
export const FONT_STYLESHEETS = [
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic.min.css',
];

/* ================= Font Definitions ================= */

/**
 * Predefined font options available in the reader.
 * Each entry maps a key to a display label and CSS font-family value.
 */
export const READER_FONTS = {
  serif: { label: 'Serif', css: "'Crimson Pro', serif" },
  sans: { label: 'Sans', css: "'Plus Jakarta Sans', sans-serif" },
  mono: { label: 'Mono', css: "'JetBrains Mono', monospace" },
  dyslexic: { label: 'Dyslexic', css: "'OpenDyslexic', sans-serif" },
};

/* ================= Apply / Load ================= */

/**
 * Applies a font to the reader by setting the --reader-font-family CSS variable
 * on the root element and persisting the selection to localStorage.
 *
 * @param {string} fontKey - One of the keys defined in READER_FONTS
 */
export function applyReaderFont(fontKey) {
  const font = READER_FONTS[fontKey];
  if (!font) return;

  document.documentElement.style.setProperty('--reader-font-family', font.css);
  localStorage.setItem(FONT_STORAGE_KEY, fontKey);
}

/**
 * Loads the previously saved font key from localStorage.
 * Falls back to 'serif' if no valid font was saved.
 *
 * @returns {string} A valid key from READER_FONTS
 */
export function loadReaderFont() {
  const saved = localStorage.getItem(FONT_STORAGE_KEY);
  return READER_FONTS[saved] ? saved : 'serif';
}
