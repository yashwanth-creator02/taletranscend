// src/pages/reader/state.js
// Centralised mutable state for the reader page.
// All reader modules read/write through this object.
//
// THEMES and FONTS are no longer defined here — they live in
// src/config/theme.config.js and are imported below.
// Any module that previously imported THEMES or FONTS from this file
// should now import from @config/theme.config.js directly.

import { READER_THEMES, FONTS as _FONTS } from '@config/theme.config.js';

// Re-export so existing imports that come from state.js continue to work
// during the migration period. Remove these once all callsites are updated.
export { READER_THEMES as THEMES, _FONTS as FONTS };

/**
 * @typedef {Object} ReaderState
 * @property {string|null}   taleId
 * @property {number}        chapterIndex
 * @property {number}        totalChapters
 * @property {string}        taleTitle
 * @property {string}        chapterTitle
 * @property {string}        authorName
 * @property {string}        authorBio
 * @property {string}        authorHandle
 * @property {string}        coverUrl
 * @property {string}        era
 * @property {string}        language
 * @property {string[]}      tags
 * @property {number}        wordCount           - Current chapter word count
 * @property {number}        estimatedReadMins   - Current chapter estimated read time
 * @property {string}        theme               - Active reader theme id
 * @property {string}        fontFamily          - 'serif' | 'sans' | 'mono' | ...
 * @property {number}        fontSize            - px value within TYPOGRAPHY_BOUNDS.fontSize
 * @property {number}        lineHeight          - Multiplier within TYPOGRAPHY_BOUNDS.lineHeight
 * @property {number}        measure             - Characters per line within TYPOGRAPHY_BOUNDS.measure
 * @property {string|null}   openTool            - 'toc' | 'type' | 'theme' | null
 * @property {boolean}       isCollapsed         - Sidebar collapsed state
 * @property {boolean}       focusMode           - Focus mode active
 * @property {string|null}   userId
 * @property {boolean}       bookmarked
 * @property {number}        claps
 * @property {boolean}       hasClapped
 * @property {number}        progress            - Scroll percentage 0–100
 * @property {string}        activeSection       - Current section ID in view for TOC sync
 * @property {Array}         highlights
 * @property {Array}         comments
 * @property {string}        newComment          - Draft comment text
 * @property {Object}        tts                 - { playing: boolean, rate: number }
 * @property {Object|null}   selection           - { text, x, y } for floating toolbar
 * @property {Array}         chapters            - Full chapter list for TOC rendering
 */

/** @type {ReaderState} */
export const readerState = {
  taleId:            null,
  chapterIndex:      0,
  totalChapters:     1,
  taleTitle:         '',
  chapterTitle:      '',
  authorName:        '',
  authorBio:         '',
  authorHandle:      '',
  coverUrl:          '',
  era:               '',
  language:          '',
  tags:              [],
  wordCount:         0,
  estimatedReadMins: 0,

  // Typography — defaults are authoritative here; theme.config.js holds bounds
  theme:      'noir',
  fontFamily: 'serif',
  fontSize:   18,
  lineHeight: 1.75,
  measure:    68,

  // Panel / UI state
  openTool:    'toc',
  isCollapsed: false,
  focusMode:   false,

  // User-specific state
  userId:     null,
  bookmarked: false,
  claps:      0,
  hasClapped: false,

  // Reading position
  progress:      0,
  activeSection: '',

  // Content interactions
  highlights: [],
  comments:   [],
  newComment: '',
  tts:        { playing: false, rate: 1.0 },
  selection:  null,

  // Chapter list for TOC (populated by content.js on load)
  chapters: [],
};
