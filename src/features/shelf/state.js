// src/features/shelf/state.js
// Centralised mutable state for the shelf page.
// All shelf modules read and write through this object.

/**
 * @typedef {'bookmarked' | 'drafts' | 'recent'} ShelfTab
 *
 * @typedef {Object} ShelfState
 * @property {string|null}   userId           - Authenticated user ID
 * @property {ShelfTab}      activeTab        - Currently visible tab
 * @property {Array<Object>} bookmarkedTales  - Full tale objects for bookmark tab
 * @property {Array<Object>} drafts           - Draft objects for drafts tab
 * @property {Array<Object>} recentTales      - Recently opened tales
 * @property {string}        filterQuery      - Current filter string (lowercased)
 * @property {'date'|'title'|'progress'} sortBy - Current sort key
 * @property {'asc'|'desc'}  sortDir          - Current sort direction
 * @property {boolean}       isLoading        - Whether data is currently fetching
 * @property {{ draftCount: number, bookmarkCount: number, wordsPreserved: number }} heroStats
 */

/** @type {ShelfState} */
export const shelfState = {
  userId: null,
  activeTab: 'bookmarked',
  bookmarkedTales: [],
  drafts: [],
  recentTales: [],
  filterQuery: '',
  sortBy: 'date',
  sortDir: 'desc',
  isLoading: false,
  heroStats: {
    draftCount: 0,
    bookmarkCount: 0,
    wordsPreserved: 0,
  },
};
