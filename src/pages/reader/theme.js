// src/pages/reader/theme.js
// Reader theme and typography management.
//
// Responsibilities:
//   - Read stored preferences from localStorage on init
//   - Apply theme by setting data-reader-theme on .reader-surface (NOT on <html>)
//   - Apply font/size/lh/measure by setting CSS custom properties on .reader-surface
//   - Persist user changes to localStorage and (debounced) to Firestore
//   - Sync all picker UI elements to current state after every change
//
// The actual theme color tokens live in reader-themes.css, scoped to
// .reader-surface[data-reader-theme="<id>"]. This module only manages the attribute.

import { readerState } from './state.js';
import {
  FONTS,
  DARK_THEMES,
  DEFAULT_THEME,
  DEFAULT_FONT,
  TYPOGRAPHY_BOUNDS,
  READER_STORAGE_KEYS,
  loadReaderFontStylesheets,
} from '@config/theme.config.js';
import { refs, setDoc, serverTimestamp } from '@fb/index.js';
import { setInput, setText, createLogger } from '@/utils';

const log = createLogger('ReaderTheme');

/** Debounce window for cloud writes — slider drags fire many changes in a row. */
const CLOUD_SAVE_DEBOUNCE_MS = 600;

let _cloudSaveTimer = null;

/* ─────────────────────────────────────────────
   Surface Element
   The element that receives data-reader-theme and CSS var overrides.
   All reader theme CSS rules are scoped inside this element.
   ───────────────────────────────────────────── */

function _getSurface() {
  return document.querySelector('.reader-surface');
}

/* ─────────────────────────────────────────────
   Init
   ───────────────────────────────────────────── */

/**
 * Reads all stored preferences and applies them.
 * Called once on reader page load, before content renders.
 * If cloud prefs are available (appState.prefsLoaded), call applyCloudPrefs()
 * afterwards — it will override the localStorage values.
 */
export function initTheme() {
  log.info('Initialising local theme preferences');

  // Nine of the twelve families in the picker had no stylesheet behind them
  // and silently rendered as Georgia. This loads every declared family.
  loadReaderFontStylesheets();

  readerState.theme = localStorage.getItem(READER_STORAGE_KEYS.theme) || DEFAULT_THEME;
  readerState.fontFamily = localStorage.getItem(READER_STORAGE_KEYS.fontFamily) || DEFAULT_FONT;
  readerState.fontSize =
    Number(localStorage.getItem(READER_STORAGE_KEYS.fontSize)) ||
    TYPOGRAPHY_BOUNDS.fontSize.default;
  readerState.lineHeight =
    Number(localStorage.getItem(READER_STORAGE_KEYS.lineHeight)) ||
    TYPOGRAPHY_BOUNDS.lineHeight.default;
  readerState.measure =
    Number(localStorage.getItem(READER_STORAGE_KEYS.measure)) || TYPOGRAPHY_BOUNDS.measure.default;

  log.debug('Local preferences loaded', {
    theme: readerState.theme,
    font: readerState.fontFamily,
    size: readerState.fontSize,
  });
  _applyAll();
}

/**
 * Applies reader preferences loaded from Firestore (users/{uid}/preferences/reader).
 * Call this after initTheme() once the cloud prefs are available.
 * Overwrites localStorage-sourced values with the cloud-synced ones.
 *
 * @param {import('@state/schemas/user.schema.js').ReaderPreferences} prefs
 */
export function applyCloudPrefs(prefs) {
  log.info('Applying cloud theme preferences', prefs);
  readerState.theme = prefs.theme || readerState.theme;
  readerState.fontFamily = prefs.fontFamily || readerState.fontFamily;
  readerState.fontSize = prefs.fontSize || readerState.fontSize;
  readerState.lineHeight = prefs.lineHeight || readerState.lineHeight;
  readerState.measure = prefs.measure || readerState.measure;

  _applyAll();
}

/* ─────────────────────────────────────────────
   Public Setters
   Each setter: clamps value -> updates readerState -> persists to localStorage
   -> applies CSS -> syncs UI.
   ───────────────────────────────────────────── */

/**
 * Sets the reader colour theme.
 * Applies data-reader-theme to .reader-surface only — never touches <html>.
 *
 * @param {string} theme - Must match an id in READER_THEMES and a block in reader-themes.css
 * @param {boolean} [persist=true] - When false (init / cloud-prefs apply), skips the cloud write
 */
export function setTheme(theme, persist = true) {
  readerState.theme = theme;
  localStorage.setItem(READER_STORAGE_KEYS.theme, theme);

  const surface = _getSurface();
  if (surface) surface.dataset.readerTheme = theme;
  if (typeof document !== 'undefined' && document.body) {
    document.body.dataset.readerTheme = theme;
    const toolbar = document.getElementById('mobile-toolbar');
    if (toolbar) toolbar.dataset.readerTheme = theme;
  }

  // Toggle atmosphere and particle effects for dark vs light themes
  const atmosphere = document.getElementById('atmosphere');
  const particles = document.getElementById('particles');
  const isDark = DARK_THEMES.has(theme);

  if (atmosphere) atmosphere.style.display = isDark ? 'block' : 'none';
  if (particles) particles.style.display = isDark ? 'block' : 'none';

  if (persist) _scheduleCloudSave();
  _syncUI();
}

/**
 * @param {string} family - Key from FONTS object in theme.config.js
 * @param {boolean} [persist=true] - When false (init / cloud-prefs apply), skips the cloud write
 */
export function setFontFamily(family, persist = true) {
  if (!FONTS[family]) return;
  readerState.fontFamily = family;
  localStorage.setItem(READER_STORAGE_KEYS.fontFamily, family);

  const surface = _getSurface();
  if (surface) surface.style.setProperty('--reader-font-family', FONTS[family].css);

  if (persist) _scheduleCloudSave();
  _syncUI();
}

/**
 * @param {number|string} val - Font size in px, clamped to TYPOGRAPHY_BOUNDS.fontSize
 * @param {boolean} [persist=true] - When false (init / cloud-prefs apply), skips the cloud write
 */
export function setFontSize(val, persist = true) {
  const { min, max } = TYPOGRAPHY_BOUNDS.fontSize;
  const px = Math.min(max, Math.max(min, Number(val)));
  readerState.fontSize = px;
  localStorage.setItem(READER_STORAGE_KEYS.fontSize, String(px));

  const surface = _getSurface();
  if (surface) surface.style.setProperty('--reader-font-size', `${px}px`);

  if (persist) _scheduleCloudSave();
  _syncUI();
}

/**
 * @param {number|string} val - Line height multiplier, clamped to TYPOGRAPHY_BOUNDS.lineHeight
 * @param {boolean} [persist=true] - When false (init / cloud-prefs apply), skips the cloud write
 */
export function setLineHeight(val, persist = true) {
  const { min, max } = TYPOGRAPHY_BOUNDS.lineHeight;
  const lh = Math.min(max, Math.max(min, Number(val)));
  readerState.lineHeight = lh;
  localStorage.setItem(READER_STORAGE_KEYS.lineHeight, String(lh));

  const surface = _getSurface();
  if (surface) surface.style.setProperty('--reader-line-height', String(lh));

  if (persist) _scheduleCloudSave();
  _syncUI();
}

/**
 * @param {number|string} val - Characters per line, clamped to TYPOGRAPHY_BOUNDS.measure
 * @param {boolean} [persist=true] - When false (init / cloud-prefs apply), skips the cloud write
 */
export function setMeasure(val, persist = true) {
  const { min, max } = TYPOGRAPHY_BOUNDS.measure;
  const ch = Math.min(max, Math.max(min, Number(val)));
  readerState.measure = ch;
  localStorage.setItem(READER_STORAGE_KEYS.measure, String(ch));

  const surface = _getSurface();
  if (surface) surface.style.setProperty('--reader-measure', `${ch}ch`);

  if (persist) _scheduleCloudSave();
  _syncUI();
}

/* ─────────────────────────────────────────────
   Internal
   ───────────────────────────────────────────── */

/**
 * Applies all current readerState preference values.
 * Called on init and after applyCloudPrefs — passes persist=false so applying
 * stored/cloud values never triggers another cloud write.
 */
function _applyAll() {
  setTheme(readerState.theme, false);
  setFontFamily(readerState.fontFamily, false);
  setFontSize(readerState.fontSize, false);
  setLineHeight(readerState.lineHeight, false);
  setMeasure(readerState.measure, false);
}

/**
 * Schedules a debounced write of the current preferences to Firestore.
 * No-op while unauthenticated — localStorage stays the local record either way.
 */
function _scheduleCloudSave() {
  if (!readerState.userId) return;
  clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(() => {
    _cloudSaveTimer = null;
    void _saveCloudPrefs();
  }, CLOUD_SAVE_DEBOUNCE_MS);
}

/**
 * Persists the current reader preferences to Firestore
 * (users/{uid}/preferences/reader); failures are logged and otherwise ignored.
 */
async function _saveCloudPrefs() {
  const userId = readerState.userId;
  if (!userId) return;
  try {
    await setDoc(
      refs.readerPrefs(userId),
      {
        theme: readerState.theme,
        fontFamily: readerState.fontFamily,
        fontSize: readerState.fontSize,
        lineHeight: readerState.lineHeight,
        measure: readerState.measure,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    log.debug('Reader preferences saved to cloud');
  } catch (err) {
    log.warn('Could not save prefs to cloud:', err);
  }
}

/**
 * Synchronises all picker UI controls with the current readerState.
 * Safe to call at any time — all queries are defensive.
 */
function _syncUI() {
  // Theme picker buttons
  document.querySelectorAll('[data-theme-id]').forEach((btn) => {
    const active = btn.dataset.themeId === readerState.theme;
    btn.dataset.active = active;
    btn.classList.toggle('active', active);
  });

  // Font picker buttons
  document.querySelectorAll('[data-font]').forEach((btn) => {
    const active = btn.dataset.font === readerState.fontFamily;
    btn.dataset.active = active;
    btn.classList.toggle('active', active);
  });

  // Font size controls
  setInput('font-size', readerState.fontSize);
  setInput('fs-range', readerState.fontSize);
  setText('size-val', `${readerState.fontSize}px`);

  // Line height controls
  setInput('line-height-input', readerState.lineHeight);
  setText('lh-val', readerState.lineHeight.toFixed(2));

  // Measure (reading width) controls
  setInput('measure', readerState.measure);
  setInput('mw-range', readerState.measure);
  setText('ms-val', `${readerState.measure}ch`);
}
