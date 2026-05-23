// src/pages/reader/theme.js
// Optimized Theme Management for Reader
// Handles Typography and Colour Themes with absolute consistency.

import { readerState, FONTS } from './state.js';

const STORAGE_KEYS = {
  theme: 'tt-reader-theme',
  fontFamily: 'tt-reader-font',
  fontSize: 'tt-reader-size',
  lineHeight: 'tt-reader-lh',
  measure: 'tt-reader-measure',
};

/* ─────────────────────────────────────────────
   Core Logic
   ───────────────────────────────────────────── */

export function initTheme() {
  readerState.theme = localStorage.getItem(STORAGE_KEYS.theme) || 'noir';
  readerState.fontFamily = localStorage.getItem(STORAGE_KEYS.fontFamily) || 'serif';
  readerState.fontSize = Number(localStorage.getItem(STORAGE_KEYS.fontSize)) || 18;
  readerState.lineHeight = Number(localStorage.getItem(STORAGE_KEYS.lineHeight)) || 1.75;
  readerState.measure = Number(localStorage.getItem(STORAGE_KEYS.measure)) || 68;

  _applyAll();
}

/**
 * Applies a global colour theme.
 */
export function setTheme(theme) {
  readerState.theme = theme;
  localStorage.setItem(STORAGE_KEYS.theme, theme);

  document.documentElement.dataset.theme = theme;
  const app = document.getElementById('app');
  if (app) app.dataset.theme = theme;

  // Atmosphere & Particles
  const atmosphere = document.getElementById('atmosphere');
  const particles = document.getElementById('particles');
  const darkThemes = ["noir", "parchment", "midnight", "emerald", "rose", "ocean", "sunset", "forest"];
  
  if (atmosphere) atmosphere.style.display = darkThemes.includes(theme) ? "block" : "none";
  if (particles) particles.style.display = darkThemes.includes(theme) ? "block" : "none";

  _syncUI();
}

export function setFontFamily(family) {
  if (!FONTS[family]) return;
  readerState.fontFamily = family;
  localStorage.setItem(STORAGE_KEYS.fontFamily, family);
  
  const cssValue = family === 'serif' ? 'var(--font-serif)' : 
                   family === 'sans' ? 'var(--font-sans)' : 
                   'var(--font-mono)';
                   
  document.documentElement.style.setProperty('--reader-font-family', cssValue);
  _syncUI();
}

export function setFontSize(val) {
  const px = Math.min(32, Math.max(12, Number(val)));
  readerState.fontSize = px;
  localStorage.setItem(STORAGE_KEYS.fontSize, String(px));
  document.documentElement.style.setProperty('--reader-font-size', `${px}px`);
  _syncUI();
}

export function setLineHeight(val) {
  const lh = Math.min(2.5, Math.max(1.2, Number(val)));
  readerState.lineHeight = lh;
  localStorage.setItem(STORAGE_KEYS.lineHeight, String(lh));
  document.documentElement.style.setProperty('--reader-line-height', String(lh));
  _syncUI();
}

export function setMeasure(val) {
  const measure = Math.min(100, Math.max(40, Number(val)));
  readerState.measure = measure;
  localStorage.setItem(STORAGE_KEYS.measure, String(measure));
  document.documentElement.style.setProperty('--reader-measure', `${measure}ch`);
  _syncUI();
}

/* ─────────────────────────────────────────────
   Internal Sync
   ───────────────────────────────────────────── */

function _applyAll() {
  setTheme(readerState.theme);
  setFontFamily(readerState.fontFamily);
  setFontSize(readerState.fontSize);
  setLineHeight(readerState.lineHeight);
  setMeasure(readerState.measure);
}

/**
 * Synchronizes all UI components with current state.
 */
function _syncUI() {
  // Sync Theme Buttons
  document.querySelectorAll('[data-theme-id]').forEach((btn) => {
    btn.dataset.active = btn.dataset.themeId === readerState.theme;
    btn.classList.toggle('active', btn.dataset.themeId === readerState.theme);
  });

  // Sync Font Buttons
  document.querySelectorAll('[data-font]').forEach((btn) => {
    btn.dataset.active = btn.dataset.font === readerState.fontFamily;
    btn.classList.toggle('active', btn.dataset.font === readerState.fontFamily);
  });

  // Sync Sliders/Controls
  const sizeInput = document.getElementById('fontSize');
  const fsRange = document.getElementById('fsRange');
  if (sizeInput) sizeInput.value = readerState.fontSize;
  if (fsRange) fsRange.value = readerState.fontSize;
  _setText('sizeVal', `${readerState.fontSize}px`);

  const lhInput = document.getElementById('lineHeight');
  if (lhInput) lhInput.value = readerState.lineHeight;
  _setText('lhVal', readerState.lineHeight.toFixed(2));

  const msInput = document.getElementById('measure');
  const mwRange = document.getElementById('mwRange');
  if (msInput) msInput.value = readerState.measure;
  if (mwRange) mwRange.value = readerState.measure;
  _setText('msVal', `${readerState.measure}ch`);
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
