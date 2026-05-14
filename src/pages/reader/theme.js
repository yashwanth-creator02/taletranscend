// src/pages/reader/theme.js
// Manages all reading preferences: theme, font family, font size,
// line height, and reading width.
// Persists to localStorage and applies CSS variables on init.

import { readerState, THEMES, FONTS, WIDTHS } from './state.js';

const STORAGE_KEYS = {
  theme: 'tt-reader-theme',
  fontFamily: 'tt-reader-font',
  fontSize: 'tt-reader-size',
  lineHeight: 'tt-reader-lh',
  readingWidth: 'tt-reader-width',
};

/* ─────────────────────────────────────────────
   Init — apply all saved preferences
   ───────────────────────────────────────────── */

/**
 * Loads all saved preferences and applies them.
 * Call once on page load before auth resolves.
 */
export function initTheme() {
  readerState.theme = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
  readerState.fontFamily = localStorage.getItem(STORAGE_KEYS.fontFamily) || 'serif';
  readerState.fontSize = Number(localStorage.getItem(STORAGE_KEYS.fontSize)) || 18;
  readerState.lineHeight = Number(localStorage.getItem(STORAGE_KEYS.lineHeight)) || 1.9;
  readerState.readingWidth = localStorage.getItem(STORAGE_KEYS.readingWidth) || 'normal';

  _applyAll();
}

// Alias expected by reader.js
export { initTheme as initFont };

/* ─────────────────────────────────────────────
   Theme
   ───────────────────────────────────────────── */

/**
 * Applies a colour theme to the reader.
 *
 * @param {'dark'|'sepia'|'light'} theme
 */
export function setTheme(theme) {
  if (!THEMES[theme]) return;
  readerState.theme = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);

  // Remove all theme classes and add the new one
  document.body.classList.remove('reader-theme-dark', 'reader-theme-sepia', 'reader-theme-light');
  document.body.classList.add(`reader-theme-${theme}`);

  // CSS variable overrides used by reader.css
  const t = THEMES[theme];
  document.documentElement.style.setProperty('--reader-bg', t.body);
  document.documentElement.style.setProperty('--reader-text', t.text);

  _syncThemeButtons(theme);
}

function _syncThemeButtons(active) {
  document.querySelectorAll('[data-theme]').forEach((btn) => {
    const isActive = btn.dataset.theme === active;
    btn.setAttribute('data-active', String(isActive));
    btn.classList.toggle('reader-option--active', isActive);
  });
}

/* ─────────────────────────────────────────────
   Font Family
   ───────────────────────────────────────────── */

/**
 * @param {'serif'|'sans'|'mono'} family
 */
export function setFontFamily(family) {
  if (!FONTS[family]) return;
  readerState.fontFamily = family;
  localStorage.setItem(STORAGE_KEYS.fontFamily, family);

  document.documentElement.style.setProperty('--reader-font', FONTS[family].css);

  _syncFontButtons(family);
}

// Alias used by reader.js and mobile buttons
export function applyReaderFont(family) {
  setFontFamily(family);
}

function _syncFontButtons(active) {
  document.querySelectorAll('[data-font]').forEach((btn) => {
    const isActive = btn.dataset.font === active;
    btn.setAttribute('data-active', String(isActive));
    btn.classList.toggle('reader-option--active', isActive);
  });
}

/* ─────────────────────────────────────────────
   Font Size
   ───────────────────────────────────────────── */

/**
 * @param {number|string} val - px value 14–26
 */
export function updateSize(val) {
  const px = Math.min(26, Math.max(14, Number(val)));
  readerState.fontSize = px;
  localStorage.setItem(STORAGE_KEYS.fontSize, String(px));
  document.documentElement.style.setProperty('--reader-size', `${px}px`);

  // Keep all sliders in sync
  document.querySelectorAll('[data-control="font-size"]').forEach((el) => {
    el.value = String(px);
  });
}

/* ─────────────────────────────────────────────
   Line Height
   ───────────────────────────────────────────── */

/**
 * @param {number|string} val - multiplier 1.4–2.2
 */
export function setLineHeight(val) {
  const lh = Math.min(2.2, Math.max(1.4, Number(val)));
  readerState.lineHeight = lh;
  localStorage.setItem(STORAGE_KEYS.lineHeight, String(lh));
  document.documentElement.style.setProperty('--reader-lh', String(lh));

  document.querySelectorAll('[data-control="line-height"]').forEach((el) => {
    el.value = String(lh);
  });
}

/* ─────────────────────────────────────────────
   Reading Width
   ───────────────────────────────────────────── */

/**
 * @param {'narrow'|'normal'|'wide'} width
 */
export function setReadingWidth(width) {
  if (!WIDTHS[width]) return;
  readerState.readingWidth = width;
  localStorage.setItem(STORAGE_KEYS.readingWidth, width);
  document.documentElement.style.setProperty('--reader-width', WIDTHS[width].value);

  document.querySelectorAll('[data-width]').forEach((btn) => {
    const isActive = btn.dataset.width === width;
    btn.setAttribute('data-active', String(isActive));
    btn.classList.toggle('reader-option--active', isActive);
  });
}

/* ─────────────────────────────────────────────
   Internal
   ───────────────────────────────────────────── */

function _applyAll() {
  setTheme(readerState.theme);
  setFontFamily(readerState.fontFamily);
  updateSize(readerState.fontSize);
  setLineHeight(readerState.lineHeight);
  setReadingWidth(readerState.readingWidth);
}
