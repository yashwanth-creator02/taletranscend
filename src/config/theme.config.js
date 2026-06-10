// src/config/theme.config.js
// Centralized registry for all reader themes and font families.
// This is the single source of truth for theme/font metadata in JS.
//
// CSS token values for reader themes live in reader-themes.css.
// This file holds the display metadata (labels, tints, categories)
// that JS modules need to render theme pickers and persist preferences.
//
// Rules:
//   - Every theme id here must have a matching block in reader-themes.css.
//   - The DARK_THEMES set drives atmosphere/particle visibility logic.
//   - reader/theme.js imports from here — never defines its own lists.

import { createLogger } from '@/utils';
const log = createLogger('ThemeConfig');

/* ─────────────────────────────────────────────
   Reader Themes
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} ReaderTheme
 * @property {string} id      - Matches data-reader-theme attribute value and CSS block
 * @property {string} label   - Display name shown in theme picker
 * @property {string} sub     - Short flavour text
 * @property {string} tint    - CSS gradient string used for the theme swatch preview
 */

/** @type {ReaderTheme[]} */
export const READER_THEMES = [
  {
    id: 'noir',
    label: 'Mythic Noir',
    sub: 'Eternal Void',
    tint: 'linear-gradient(135deg, #030305, #1a1330)',
  },
  {
    id: 'parchment',
    label: 'Parchment',
    sub: 'Warm Vellum',
    tint: 'linear-gradient(135deg, #1a1410, #3a2a1a)',
  },
  {
    id: 'sepia',
    label: 'Sepia',
    sub: 'Daybreak',
    tint: 'linear-gradient(135deg, #f4ecd8, #e2d3b0)',
  },
  {
    id: 'light',
    label: 'Light',
    sub: 'Bright Hall',
    tint: 'linear-gradient(135deg, #ffffff, #e4e4ef)',
  },
  {
    id: 'midnight',
    label: 'Midnight Indigo',
    sub: 'Deep Cobalt',
    tint: 'linear-gradient(135deg, #0a0f1f, #1e2a52)',
  },
  {
    id: 'emerald',
    label: 'Emerald Glade',
    sub: 'Forest Glass',
    tint: 'linear-gradient(135deg, #04140e, #0d3b2a)',
  },
  {
    id: 'rose',
    label: 'Rose Quartz',
    sub: 'Soft Bloom',
    tint: 'linear-gradient(135deg, #1a0a14, #4a1a35)',
  },
  {
    id: 'solar',
    label: 'Solarized',
    sub: 'Citrus Page',
    tint: 'linear-gradient(135deg, #fdf6e3, #eee8d5)',
  },
  {
    id: 'ocean',
    label: 'Ocean Deep',
    sub: 'Abyssal Cyan',
    tint: 'linear-gradient(135deg, #021018, #0a3a4a)',
  },
  {
    id: 'sunset',
    label: 'Sunset Ember',
    sub: 'Slow Burn',
    tint: 'linear-gradient(135deg, #1a0a05, #4a1a08)',
  },
  {
    id: 'forest',
    label: 'Forest Mist',
    sub: 'Mossy Calm',
    tint: 'linear-gradient(135deg, #0a140c, #1e3a1f)',
  },
  {
    id: 'ink',
    label: 'Ink on Paper',
    sub: 'Pure Print',
    tint: 'linear-gradient(135deg, #f5f5f0, #d8d8d2)',
  },
];

/**
 * Theme IDs that should show atmosphere and particle effects.
 * Light themes hide these effects since they don't read well on bright surfaces.
 * Used by theme.js to toggle visibility of .atmosphere and .particles elements.
 */
export const DARK_THEMES = new Set([
  'noir',
  'parchment',
  'midnight',
  'emerald',
  'rose',
  'ocean',
  'sunset',
  'forest',
]);

/** Default theme applied when no preference is stored */
export const DEFAULT_THEME = 'noir';

/* ─────────────────────────────────────────────
   Font Families
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} FontFamily
 * @property {string} label - Display name shown in font picker
 * @property {string} css   - CSS font-family value applied to --reader-font-family
 */

/** @type {Object.<string, FontFamily>} */
export const FONTS = {
  serif: {
    label: 'Serif',
    css: '"Cinzel", "Cormorant Garamond", Georgia, serif',
  },
  sans: {
    label: 'Sans',
    css: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  mono: {
    label: 'Mono',
    css: '"JetBrains Mono", ui-monospace, monospace',
  },
  literary: {
    label: 'Literary',
    css: '"Merriweather", "Baskerville", "Times New Roman", serif',
  },
  elegant: {
    label: 'Elegant',
    css: '"Playfair Display", "Cormorant Garamond", serif',
  },
  modern: {
    label: 'Modern',
    css: '"Poppins", "Inter", sans-serif',
  },
  classic: {
    label: 'Classic',
    css: '"Lora", Georgia, serif',
  },
  fantasy: {
    label: 'Fantasy',
    css: '"Uncial Antiqua", "Cinzel Decorative", fantasy',
  },
  typewriter: {
    label: 'Typewriter',
    css: '"Special Elite", "Courier New", monospace',
  },
  clean: {
    label: 'Clean',
    css: '"Nunito Sans", "Inter", sans-serif',
  },
  gothic: {
    label: 'Gothic',
    css: '"IM Fell English", "Garamond", serif',
  },
  manuscript: {
    label: 'Manuscript',
    css: '"EB Garamond", "Palatino Linotype", serif',
  },
};

/** Default font applied when no preference is stored */
export const DEFAULT_FONT = 'serif';

/* ─────────────────────────────────────────────
   Typography Bounds
   Clamping values used by setFontSize, setLineHeight, setMeasure.
   Centralized here so the reader and any future settings page use
   the same min/max without duplicating magic numbers.
   ───────────────────────────────────────────── */

export const TYPOGRAPHY_BOUNDS = {
  fontSize: { min: 12, max: 32, default: 18 },
  lineHeight: { min: 1.2, max: 2.5, default: 1.75 },
  measure: { min: 40, max: 100, default: 68 },
};

/* ─────────────────────────────────────────────
   localStorage Keys
   All reader preference storage keys in one place.
   reader/theme.js and any future prefs page import from here.
   ───────────────────────────────────────────── */

export const READER_STORAGE_KEYS = {
  theme: 'tt-reader-theme',
  fontFamily: 'tt-reader-font',
  fontSize: 'tt-reader-size',
  lineHeight: 'tt-reader-lh',
  measure: 'tt-reader-measure',
};

log.debug('Theme configuration initialized');
