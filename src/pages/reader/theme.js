// src/pages/reader/theme.js
// Optimized Theme Management for Reader
// Handles Typography and Colour Themes with absolute consistency.

import { readerState, THEMES, FONTS, WIDTHS } from './state.js';

const STORAGE_KEYS = {
  theme: 'tt-reader-theme',
  fontFamily: 'tt-reader-font',
  fontSize: 'tt-reader-size',
  lineHeight: 'tt-reader-lh',
  readingWidth: 'tt-reader-width',
};

/* ─────────────────────────────────────────────
   Core Logic
   ───────────────────────────────────────────── */

export function initTheme() {
  readerState.theme = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
  readerState.fontFamily = localStorage.getItem(STORAGE_KEYS.fontFamily) || 'serif';
  readerState.fontSize = Number(localStorage.getItem(STORAGE_KEYS.fontSize)) || 18;
  readerState.lineHeight = Number(localStorage.getItem(STORAGE_KEYS.lineHeight)) || 1.9;
  readerState.readingWidth = localStorage.getItem(STORAGE_KEYS.readingWidth) || 'normal';

  _applyAll();
}

/**
 * Applies a global colour theme.
 * Updates both <body> and <html> to ensure total consistency.
 */
export function setTheme(theme) {
  if (!THEMES[theme]) return;
  readerState.theme = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);

  // 1. Update Body Classes (Global + Scoped)
  const allThemes = ['theme-dark', 'theme-sepia', 'theme-light', 'reader-theme-dark', 'reader-theme-sepia', 'reader-theme-light'];
  document.body.classList.remove(...allThemes);
  document.body.classList.add(`theme-${theme}`);
  document.body.classList.add(`reader-theme-${theme}`);

  // 2. Update Data Attribute for persistent styling
  document.documentElement.setAttribute('data-theme', theme);

  _syncUI();
}

export function setFontFamily(family) {
  if (!FONTS[family]) return;
  readerState.fontFamily = family;
  localStorage.setItem(STORAGE_KEYS.fontFamily, family);
  document.documentElement.style.setProperty('--reader-font', FONTS[family].css);
  _syncUI();
}

export function updateSize(val) {
  const px = Math.min(26, Math.max(14, Number(val)));
  readerState.fontSize = px;
  localStorage.setItem(STORAGE_KEYS.fontSize, String(px));
  document.documentElement.style.setProperty('--reader-size', `${px}px`);
  _syncUI();
}

export function setLineHeight(val) {
  const lh = Math.min(2.2, Math.max(1.4, Number(val)));
  readerState.lineHeight = lh;
  localStorage.setItem(STORAGE_KEYS.lineHeight, String(lh));
  document.documentElement.style.setProperty('--reader-lh', String(lh));
  _syncUI();
}

export function setReadingWidth(width) {
  if (!WIDTHS[width]) return;
  readerState.readingWidth = width;
  localStorage.setItem(STORAGE_KEYS.readingWidth, width);
  document.documentElement.style.setProperty('--reader-width', WIDTHS[width].value);
  _syncUI();
}

/* ─────────────────────────────────────────────
   Internal Sync
   ───────────────────────────────────────────── */

function _applyAll() {
  setTheme(readerState.theme);
  setFontFamily(readerState.fontFamily);
  updateSize(readerState.fontSize);
  setLineHeight(readerState.lineHeight);
  setReadingWidth(readerState.readingWidth);
}

/**
 * Synchronizes all UI components (buttons, sliders) with current state.
 * Prevents "duplicate button" sync issues by targeting all instances.
 */
function _syncUI() {
  // Sync Buttons
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.classList.toggle('reader-option--active', btn.dataset.theme === readerState.theme);
  });

  document.querySelectorAll('[data-font]').forEach(btn => {
    btn.classList.toggle('reader-option--active', btn.dataset.font === readerState.fontFamily);
  });

  document.querySelectorAll('[data-width]').forEach(btn => {
    btn.classList.toggle('reader-option--active', btn.dataset.width === readerState.readingWidth);
  });

  // Sync Sliders
  document.querySelectorAll('[data-control="font-size"]').forEach(el => {
    el.value = String(readerState.fontSize);
  });
  document.querySelectorAll('[data-val="font-size"]').forEach(s => {
    s.textContent = `${readerState.fontSize}px`;
  });

  document.querySelectorAll('[data-control="line-height"]').forEach(el => {
    el.value = String(readerState.lineHeight);
  });
  document.querySelectorAll('[data-val="line-height"]').forEach(s => {
    s.textContent = String(readerState.lineHeight);
  });
}
