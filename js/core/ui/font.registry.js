// js/core/ui/font.registry.js

const FONT_STORAGE_KEY = 'taletranscend:reader-font';

/**
 * Available reader fonts
 */
export const READER_FONTS = {
  serif: { label: 'Serif', css: "'Crimson Pro', serif" },
  sans: { label: 'Sans', css: "'Plus Jakarta Sans', sans-serif" },
  mono: { label: 'Mono', css: "'JetBrains Mono', monospace" },
  dyslexic: { label: 'Dyslexic', css: "'OpenDyslexic', sans-serif" },
};

/**
 * Apply font to reader root
 */
export function applyReaderFont(fontKey) {
  const font = READER_FONTS[fontKey];
  if (!font) return;

  document.documentElement.style.setProperty('--reader-font-family', font.css);

  localStorage.setItem(FONT_STORAGE_KEY, fontKey);
}

/**
 * Load saved font (fallback safe)
 */
export function loadReaderFont() {
  const saved = localStorage.getItem(FONT_STORAGE_KEY);
  return READER_FONTS[saved] ? saved : 'serif';
}
