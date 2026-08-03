// src/features/library/state.js
// Centralised mutable state for the library page.

/**
 * @typedef {'all'|'recent'|'finished'|'bookmarked'|'my-tales'} SidebarFilter
 *
 * @typedef {Object} LibraryState
 * @property {string|null}     userId
 * @property {import('@state/schemas/tale.schema.js').Tale[]} allTales
 * @property {import('@state/schemas/tale.schema.js').Tale[]} filteredTales
 * @property {string}          searchQuery
 * @property {string}          activeEra
 * @property {string}          activeTone
 * @property {string}          activeLength
 * @property {SidebarFilter}   sidebarFilter
 * @property {boolean}         sidebarCollapsed
 * @property {boolean}         eraChipsBuilt      - True after first tales batch loads chips
 */

/** @type {LibraryState} */
export const libraryState = {
  userId: null,
  allTales: [],
  filteredTales: [],
  searchQuery: '',
  activeEra: 'all',
  activeTone: 'all',
  activeLength: 'all',
  sidebarFilter: 'all',
  sidebarCollapsed: JSON.parse(localStorage.getItem('tt-lib-sidebar-collapsed') ?? 'false'),
  eraChipsBuilt: false,

  // Pagination (page-based)
  currentPage: 1, // 1-based page number
  talesPerPage: 2, // Tales per page (adjust as needed)
  totalTales: 0, // Total count from Firestore
  isLoading: false,
};
