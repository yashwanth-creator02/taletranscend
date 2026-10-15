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
//   - This replaced ui/font.registry.js, which declared a second, smaller
//     and incompatible font set under a different localStorage key. Both
//     wrote --reader-font-family; whichever ran last won.

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
    mode: 'dark',
    bg: '#030305',
    fg: '#e6e7ee',
    accent: '#8b7cf6',
    tint: 'linear-gradient(135deg, #030305, #1a1330)',
  },
  {
    id: 'parchment',
    label: 'Warm Vellum',
    sub: 'Antiquity Obsidian',
    mode: 'dark',
    bg: '#14100c',
    fg: '#f4ede2',
    accent: '#f59e0b',
    tint: 'linear-gradient(135deg, #14100c, #2a1f16)',
  },
  {
    id: 'sepia',
    label: 'Sepia Daybreak',
    sub: 'Golden Morning',
    mode: 'light',
    bg: '#f4ecd8',
    fg: '#2c2013',
    accent: '#8c3e10',
    tint: 'linear-gradient(135deg, #f4ecd8, #eadebe)',
  },
  {
    id: 'light',
    label: 'Illuminated Hall',
    sub: 'Crisp Manuscript',
    mode: 'light',
    bg: '#fafafa',
    fg: '#121217',
    accent: '#4f46e5',
    tint: 'linear-gradient(135deg, #ffffff, #f0f1f5)',
  },
  {
    id: 'midnight',
    label: 'Midnight Indigo',
    sub: 'Deep Cobalt',
    mode: 'dark',
    bg: '#080c19',
    fg: '#dbe4ff',
    accent: '#60a5fa',
    tint: 'linear-gradient(135deg, #080c19, #11182e)',
  },
  {
    id: 'emerald',
    label: 'Emerald Glade',
    sub: 'Forest Glass',
    mode: 'dark',
    bg: '#03120c',
    fg: '#d4f1e3',
    accent: '#34d399',
    tint: 'linear-gradient(135deg, #03120c, #0a2217)',
  },
  {
    id: 'rose',
    label: 'Rose Quartz',
    sub: 'Soft Bloom',
    mode: 'dark',
    bg: '#150811',
    fg: '#ffe4ef',
    accent: '#f472b6',
    tint: 'linear-gradient(135deg, #150811, #271120)',
  },
  {
    id: 'solar',
    label: 'Solarized Ochre',
    sub: 'Warm Citrus',
    mode: 'light',
    bg: '#fdf6e3',
    fg: '#073642',
    accent: '#9e6b00',
    tint: 'linear-gradient(135deg, #fdf6e3, #eee8d5)',
  },
  {
    id: 'ocean',
    label: 'Ocean Deep',
    sub: 'Abyssal Cyan',
    mode: 'dark',
    bg: '#020d14',
    fg: '#d7eff8',
    accent: '#22d3ee',
    tint: 'linear-gradient(135deg, #020d14, #071b26)',
  },
  {
    id: 'sunset',
    label: 'Sunset Ember',
    sub: 'Slow Burn',
    mode: 'dark',
    bg: '#150803',
    fg: '#ffe7d1',
    accent: '#fb923c',
    tint: 'linear-gradient(135deg, #150803, #261309)',
  },
  {
    id: 'forest',
    label: 'Forest Mist',
    sub: 'Mossy Calm',
    mode: 'dark',
    bg: '#081109',
    fg: '#e0f0d5',
    accent: '#a3e635',
    tint: 'linear-gradient(135deg, #081109, #112113)',
  },
  {
    id: 'ink',
    label: 'Ink on Paper',
    sub: 'Book Press Mono',
    mode: 'light',
    bg: '#f5f5f0',
    fg: '#0a0a0a',
    accent: '#1c1917',
    tint: 'linear-gradient(135deg, #f5f5f0, #e5e5dc)',
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
    label: 'Cinzel',
    sub: 'Serif',
    css: '"Cinzel", "Cormorant Garamond", Georgia, serif',
  },
  sans: {
    label: 'Inter',
    sub: 'Sans',
    css: '"Inter", ui-sans-serif, system-ui, sans-serif',
  },
  literary: {
    label: 'Merriweather',
    sub: 'Literary',
    css: '"Merriweather", "Baskerville", "Times New Roman", serif',
  },
  elegant: {
    label: 'Playfair',
    sub: 'Elegant',
    css: '"Playfair Display", "Cormorant Garamond", serif',
  },
  classic: {
    label: 'Lora',
    sub: 'Classic',
    css: '"Lora", Georgia, serif',
  },
  crimson: {
    label: 'Crimson Pro',
    sub: 'Book Serif',
    css: '"Crimson Pro", Georgia, serif',
  },
  spectral: {
    label: 'Spectral',
    sub: 'Editorial',
    css: '"Spectral", Georgia, serif',
  },
  baskerville: {
    label: 'Baskerville',
    sub: 'Traditional',
    css: '"Libre Baskerville", "Baskerville", serif',
  },
  cormorant: {
    label: 'Cormorant',
    sub: 'Classical',
    css: '"Cormorant Garamond", Georgia, serif',
  },
  manuscript: {
    label: 'EB Garamond',
    sub: 'Manuscript',
    css: '"EB Garamond", "Palatino Linotype", serif',
  },
  gothic: {
    label: 'IM Fell',
    sub: 'Gothic',
    css: '"IM Fell English", "Garamond", serif',
  },
  fantasy: {
    label: 'Uncial',
    sub: 'Fantasy',
    css: '"Uncial Antiqua", "Cinzel Decorative", fantasy',
  },
  medieval: {
    label: 'Medieval',
    sub: 'Mythic',
    css: '"MedievalSharp", "Cinzel Decorative", cursive',
  },
  modern: {
    label: 'Poppins',
    sub: 'Modern',
    css: '"Poppins", "Inter", sans-serif',
  },
  clean: {
    label: 'Nunito',
    sub: 'Clean',
    css: '"Nunito Sans", "Inter", sans-serif',
  },
  outfit: {
    label: 'Outfit',
    sub: 'Geometric',
    css: '"Outfit", "Inter", sans-serif',
  },
  mono: {
    label: 'JetBrains',
    sub: 'Monospace',
    css: '"JetBrains Mono", ui-monospace, monospace',
  },
  typewriter: {
    label: 'Special Elite',
    sub: 'Typewriter',
    css: '"Special Elite", "Courier New", monospace',
  },
  dyslexic: {
    label: 'OpenDyslexic',
    sub: 'Accessible',
    css: '"OpenDyslexic", "Comic Sans MS", sans-serif',
  },
};

/** Default font applied when no preference is stored */
export const DEFAULT_FONT = 'serif';

/**
 * Stylesheets that must be loaded for the FONTS above to actually render.
 *
 * Loaded lazily by the reader on first paint rather than blocking it: the
 * reader only needs the *selected* family immediately, and the rest matter
 * only once the font picker is opened.
 */
export const FONT_STYLESHEETS = [
  'https://fonts.googleapis.com/css2' +
    '?family=Playfair+Display:wght@400;600;700' +
    '&family=Poppins:wght@300;400;500;600;700' +
    '&family=Lora:ital,wght@0,400;0,600;0,700;1,400' +
    '&family=Nunito+Sans:wght@300;400;600;700' +
    '&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400' +
    '&family=IM+Fell+English:ital@0;1' +
    '&family=Special+Elite' +
    '&family=Uncial+Antiqua' +
    '&family=JetBrains+Mono:wght@400;500;700' +
    '&family=Crimson+Pro:ital,wght@0,400;0,600;1,400' +
    '&family=Spectral:ital,wght@0,400;0,600;1,400' +
    '&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400' +
    '&family=MedievalSharp' +
    '&family=Outfit:wght@300;400;500;600' +
    '&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400' +
    '&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400' +
    '&display=swap',
  'https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.css',
];

/**
 * Injects the reader font stylesheets once, idempotently.
 *
 * Safe to call on every reader mount — subsequent calls are no-ops.
 */
export function loadReaderFontStylesheets(doc = document) {
  for (const href of FONT_STYLESHEETS) {
    if (doc.querySelector(`link[href="${href}"]`)) continue;
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    doc.head.appendChild(link);
  }
}

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

/* ─────────────────────────────────────────────
   Global Application Interface Themes
   Single source of truth for the entire application interface theme:
   - 'transcendental' (signature mythic cosmic dark, default)
   - 'dark'           (midnight obsidian & luminous indigo)
   - 'light'          (illuminated manuscript parchment & imperial ink)
   - 'system'         (automatic synchronization with device OS preference)
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} AppTheme
 * @property {string} id          - Matches data-app-theme attribute value and CSS block
 * @property {string} name        - Display name shown in UI
 * @property {string} subtitle    - Secondary tagline
 * @property {string} description - Detailed visual description
 * @property {'dark'|'light'|'auto'} colorScheme - Browser color-scheme
 * @property {{ bg: string, surface: string, accent: string, text: string }} preview - Palette preview colors
 */

/** @type {AppTheme[]} */
export const APP_THEMES = [
  {
    id: 'transcendental',
    name: 'Transcendental',
    subtitle: 'Signature Cosmic Dark',
    description: 'Deep obsidian floor with starlight indigo gradients and warm amber runes.',
    colorScheme: 'dark',
    tagStyle:
      'background: rgb(3 3 5 / 0.75); color: #e2e8f0; border: 1px solid rgb(255 255 255 / 0.15);',
    preview: {
      bg: '#030305',
      surface: '#0d0d14',
      accent: '#6366f1',
      text: '#e2e8f0',
    },
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    subtitle: 'Obsidian & Indigo',
    description:
      'Charcoal depths with vibrant indigo accents and crisp high-contrast silver typography.',
    colorScheme: 'dark',
    tagStyle:
      'background: rgb(11 13 19 / 0.85); color: #f8fafc; border: 1px solid rgb(129 140 248 / 0.25);',
    preview: {
      bg: '#0b0d13',
      surface: '#1c2132',
      accent: '#818cf8',
      text: '#f8fafc',
    },
  },
  {
    id: 'light',
    name: 'Illuminated Light',
    subtitle: 'Manuscript Parchment',
    description: 'Warm manuscript parchment base with crisp ivory surfaces and imperial royal ink.',
    colorScheme: 'light',
    tagStyle:
      'background: rgb(255 255 255 / 0.9); color: #1e293b; border: 1px solid rgb(26 31 44 / 0.15);',
    preview: {
      bg: '#f7f5f0',
      surface: '#ffffff',
      accent: '#4f46e5',
      text: '#1e293b',
    },
  },
  {
    id: 'system',
    name: 'Sync with System',
    subtitle: 'Automatic Device Preference',
    description:
      'Dynamically adapts to your operating system appearance (Light by day, Transcendental by night).',
    colorScheme: 'auto',
    tagStyle:
      'background: rgb(15 23 42 / 0.7); color: #cbd5e1; border: 1px solid rgb(255 255 255 / 0.15);',
    preview: {
      bg: '#030305',
      surface: '#0d0d14',
      accent: '#6366f1',
      text: '#e2e8f0',
    },
  },
];

export const DEFAULT_APP_THEME = 'transcendental';
export const APP_THEME_STORAGE_KEY = 'tt_app_theme';

let _transitionTimer = null;
let _mediaQueryListenerBound = false;

/**
 * Triggers a temporary .theme-transitioning class on documentElement for a silky cross-fade.
 * Respects prefers-reduced-motion.
 * @param {Document} [doc]
 */
export function triggerThemeTransition(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc?.documentElement || typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  doc.documentElement.classList.add('theme-transitioning');
  if (_transitionTimer) clearTimeout(_transitionTimer);
  _transitionTimer = setTimeout(() => {
    doc.documentElement.classList.remove('theme-transitioning');
    _transitionTimer = null;
  }, 250);
}

/**
 * Detects the OS color scheme preference.
 * @returns {'transcendental'|'light'}
 */
export function getSystemAppTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'transcendental' : 'light';
    } catch {
      return DEFAULT_APP_THEME;
    }
  }
  return DEFAULT_APP_THEME;
}

/**
 * Resolves a given theme ID into an actual active theme attribute ('transcendental', 'dark', or 'light').
 * When 'system' is requested, returns the OS resolved theme.
 * @param {string} themeId
 * @returns {string}
 */
export function resolveAppTheme(themeId) {
  if (themeId === 'system') {
    return getSystemAppTheme();
  }
  return APP_THEMES.some((t) => t.id === themeId) ? themeId : DEFAULT_APP_THEME;
}

/**
 * Retrieves the persisted application theme preference from localStorage, falling back to 'transcendental'.
 * @returns {string}
 */
export function getSavedAppTheme() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(APP_THEME_STORAGE_KEY);
      if (saved && APP_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    }
  } catch (err) {
    log.warn('Failed to read app theme from localStorage', err);
  }
  return DEFAULT_APP_THEME;
}

/**
 * Applies the application theme to the document root and persists to localStorage.
 * @param {string} themeId
 * @param {Document} [doc]
 * @param {boolean} [animate=true]
 * @returns {string} The active theme preference that was applied ('transcendental', 'dark', 'light', or 'system').
 */
export function applyAppTheme(
  themeId,
  doc = typeof document !== 'undefined' ? document : null,
  animate = true
) {
  const isKnown = APP_THEMES.some((t) => t.id === themeId);
  const targetTheme = isKnown ? themeId : DEFAULT_APP_THEME;
  const resolved = resolveAppTheme(targetTheme);

  if (animate && doc?.documentElement) {
    triggerThemeTransition(doc);
  }

  if (doc?.documentElement) {
    doc.documentElement.setAttribute('data-app-theme', resolved);
    doc.documentElement.setAttribute('data-theme-preference', targetTheme);
    const metaTheme = doc.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const themeColors = {
        transcendental: '#030305',
        dark: '#0b0d13',
        light: '#f7f5f0',
      };
      metaTheme.setAttribute('content', themeColors[resolved] || '#030305');
    }
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(APP_THEME_STORAGE_KEY, targetTheme);
    }
  } catch (err) {
    log.warn('Failed to persist app theme to localStorage', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('appthemechange', {
        detail: { theme: targetTheme, resolvedTheme: resolved },
      })
    );
  }

  return targetTheme;
}

/**
 * Initializes the application theme on document load.
 * @param {Document} [doc]
 * @returns {string}
 */
export function initAppTheme(doc = typeof document !== 'undefined' ? document : null) {
  const theme = getSavedAppTheme();
  // Don't trigger transition animation on initial boot
  const applied = applyAppTheme(theme, doc, false);

  // Wire cross-tab storage sync once
  if (typeof window !== 'undefined' && !window._appThemeStorageBound) {
    window._appThemeStorageBound = true;
    window.addEventListener('storage', (event) => {
      if (event.key === APP_THEME_STORAGE_KEY && event.newValue) {
        applyAppTheme(event.newValue, typeof document !== 'undefined' ? document : null);
      }
    });
  }

  // Wire live OS prefers-color-scheme listener once
  if (typeof window !== 'undefined' && !_mediaQueryListenerBound && window.matchMedia) {
    _mediaQueryListenerBound = true;
    try {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        if (getSavedAppTheme() === 'system') {
          applyAppTheme('system', typeof document !== 'undefined' ? document : null);
        }
      };
      if (mql.addEventListener) {
        mql.addEventListener('change', handleSystemChange);
      } else if (mql.addListener) {
        mql.addListener(handleSystemChange);
      }
    } catch (err) {
      log.debug('Could not bind system color scheme listener', err);
    }
  }

  return applied;
}

log.debug('Theme configuration initialized');
