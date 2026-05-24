// src/pages/reader/state.js
// Centralised mutable state for the reader page.
// All reader modules read/write through this object.

/**
 * @typedef {Object} ReaderState
 * @property {string|null}  taleId
 * @property {number}       chapterIndex
 * @property {number}       totalChapters
 * @property {string}       taleTitle
 * @property {string}       chapterTitle
 * @property {string}       authorName
 * @property {string}       authorBio
 * @property {string}       authorHandle
 * @property {string}       coverUrl
 * @property {string}       era
 * @property {string}       language
 * @property {Array<string>} tags
 * @property {number}       wordCount           - current chapter word count
 * @property {number}       estimatedReadMins   - current chapter estimated read time
 * @property {string}       theme               - 'noir' | 'sepia' | 'light' | ...
 * @property {string}       fontFamily          - 'serif' | 'sans' | 'mono'
 * @property {number}       fontSize            - px value 14–26
 * @property {number}       lineHeight          - multiplier 1.4–2.2
 * @property {number}       measure             - chars per line: 40-100
 * @property {string|null}  openTool            - 'toc' | 'type' | 'theme' | ...
 * @property {boolean}      isCollapsed         - sidebar collapsed
 * @property {boolean}      focusMode           - focus mode active
 * @property {string|null}  userId
 * @property {boolean}      bookmarked
 * @property {number}       claps
 * @property {boolean}      hasClapped
 * @property {number}       progress            - scroll percentage
 * @property {string}       activeSection       - current section ID in view
 * @property {Array}        highlights
 * @property {Array}        comments
 * @property {string}       newComment          - draft comment text
 * @property {Object}       tts                 - { playing: boolean, rate: number }
 * @property {Object|null}  selection           - { text, x, y }
 * @property {Array}        chapters            - Full list of chapter objects for TOC
 */

/** @type {ReaderState} */
export const readerState = {
  taleId: null,
  chapterIndex: 0,
  totalChapters: 1,
  taleTitle: '',
  chapterTitle: '',
  authorName: '',
  authorBio: '',
  authorHandle: '',
  coverUrl: '',
  era: '',
  language: '',
  tags: [],
  wordCount: 0,
  estimatedReadMins: 0,
  theme: 'noir',
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.75,
  measure: 68,
  openTool: 'toc',
  isCollapsed: false,
  focusMode: false,
  userId: null,
  bookmarked: false,
  claps: 0,
  hasClapped: false,
  progress: 0,
  activeSection: '',
  highlights: [],
  comments: [],
  newComment: '',
  tts: { playing: false, rate: 1.0 },
  selection: null,
  chapters: [],
};

/** Available reading themes */
export const THEMES = [
  {
    id: 'noir',
    label: 'Mythic Noir',
    tint: 'linear-gradient(135deg,#030305,#1a1330)',
    sub: 'Eternal Void',
  },
  {
    id: 'parchment',
    label: 'Parchment',
    tint: 'linear-gradient(135deg,#1a1410,#3a2a1a)',
    sub: 'Warm Vellum',
  },
  {
    id: 'sepia',
    label: 'Sepia',
    tint: 'linear-gradient(135deg,#f4ecd8,#e2d3b0)',
    sub: 'Daybreak',
  },
  {
    id: 'light',
    label: 'Light',
    tint: 'linear-gradient(135deg,#ffffff,#e4e4ef)',
    sub: 'Bright Hall',
  },
  {
    id: 'midnight',
    label: 'Midnight Indigo',
    tint: 'linear-gradient(135deg,#0a0f1f,#1e2a52)',
    sub: 'Deep Cobalt',
  },
  {
    id: 'emerald',
    label: 'Emerald Glade',
    tint: 'linear-gradient(135deg,#04140e,#0d3b2a)',
    sub: 'Forest Glass',
  },
  {
    id: 'rose',
    label: 'Rose Quartz',
    tint: 'linear-gradient(135deg,#1a0a14,#4a1a35)',
    sub: 'Soft Bloom',
  },
  {
    id: 'solar',
    label: 'Solarized',
    tint: 'linear-gradient(135deg,#fdf6e3,#eee8d5)',
    sub: 'Citrus Page',
  },
  {
    id: 'ocean',
    label: 'Ocean Deep',
    tint: 'linear-gradient(135deg,#021018,#0a3a4a)',
    sub: 'Abyssal Cyan',
  },
  {
    id: 'sunset',
    label: 'Sunset Ember',
    tint: 'linear-gradient(135deg,#1a0a05,#4a1a08)',
    sub: 'Slow Burn',
  },
  {
    id: 'forest',
    label: 'Forest Mist',
    tint: 'linear-gradient(135deg,#0a140c,#1e3a1f)',
    sub: 'Mossy Calm',
  },
  {
    id: 'ink',
    label: 'Ink on Paper',
    tint: 'linear-gradient(135deg,#f5f5f0,#d8d8d2)',
    sub: 'Pure Print',
  },
];
/** Available font families */
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
