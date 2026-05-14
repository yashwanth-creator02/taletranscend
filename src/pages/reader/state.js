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
 * @property {string}       coverUrl
 * @property {string}       era
 * @property {string}       language
 * @property {Array<string>} tags
 * @property {number}       wordCount           - current chapter word count
 * @property {number}       estimatedReadMins   - current chapter estimated read time
 * @property {string}       theme               - 'dark' | 'sepia' | 'light'
 * @property {string}       fontFamily          - 'serif' | 'sans' | 'mono'
 * @property {number}       fontSize            - px value 14–26
 * @property {number}       lineHeight          - multiplier 1.4–2.2
 * @property {number}       readingWidth        - chars per line: 'narrow'|'normal'|'wide'
 * @property {boolean}      settingsPanelOpen
 * @property {boolean}      chapterTrailOpen
 * @property {string|null}  userId
 */

/** @type {ReaderState} */
export const readerState = {
  taleId: null,
  chapterIndex: 0,
  totalChapters: 1,
  taleTitle: '',
  chapterTitle: '',
  authorName: '',
  coverUrl: '',
  era: '',
  language: '',
  tags: [],
  wordCount: 0,
  estimatedReadMins: 0,
  theme: 'dark',
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.9,
  readingWidth: 'normal',
  settingsPanelOpen: false,
  chapterTrailOpen: false,
  userId: null,
};

/** Available reading themes */
export const THEMES = {
  dark: { label: 'Dark', body: '#030305', text: '#e2e8f0', bg: '#030305' },
  sepia: { label: 'Sepia', body: '#1c150e', text: '#d4b896', bg: '#1c150e' },
  light: { label: 'Light', body: '#f8f7f4', text: '#1e1a14', bg: '#f8f7f4' },
};

/** Available font families */
export const FONTS = {
  serif: { label: 'Serif', css: "'Merriweather', Georgia, serif" },
  sans: { label: 'Sans', css: "'Inter', system-ui, sans-serif" },
  mono: { label: 'Mono', css: "'JetBrains Mono', monospace" },
};

/** Reading width presets (max-width of the content column) */
export const WIDTHS = {
  narrow: { label: 'Narrow', value: '560px' },
  normal: { label: 'Normal', value: '720px' },
  wide: { label: 'Wide', value: '900px' },
};
