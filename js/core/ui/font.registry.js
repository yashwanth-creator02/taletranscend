// js/core/ui/font.registry.js

// Key used to store the user's selected reader font in localStorage
const FONT_STORAGE_KEY = 'taletranscend:reader-font';

/* ================= Font Sources ================= */

export const FONT_STYLESHEETS = [
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap',

  'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic.min.css',
];

/* ================= Reader Fonts ================= */

/**
 * Predefined fonts available for the reader.
 * Each font has a display label and the corresponding CSS font-family value.
 */
export const READER_FONTS = {
  serif: { label: 'Serif', css: "'Crimson Pro', serif" },
  sans: { label: 'Sans', css: "'Plus Jakarta Sans', sans-serif" },
  mono: { label: 'Mono', css: "'JetBrains Mono', monospace" },
  dyslexic: { label: 'Dyslexic', css: "'OpenDyslexic', sans-serif" },
};

/* ================= Apply / Load Fonts ================= */

/**
 * Applies a selected font to the reader by updating the CSS variable
 * and saves the selection to localStorage.
 *
 * @param {string} fontKey - One of the keys in READER_FONTS
 */
export function applyReaderFont(fontKey) {
  const font = READER_FONTS[fontKey];
  if (!font) return;

  // Apply the font to the root element (used in CSS via --reader-font-family)
  document.documentElement.style.setProperty('--reader-font-family', font.css);

  // Persist the selected font in localStorage
  localStorage.setItem(FONT_STORAGE_KEY, fontKey);
}

/**
 * Loads the previously saved font from localStorage.
 * Falls back to 'serif' if none saved or invalid.
 *
 * @returns {string} Font key
 */
export function loadReaderFont() {
  const saved = localStorage.getItem(FONT_STORAGE_KEY);
  return READER_FONTS[saved] ? saved : 'serif';
}
