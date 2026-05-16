// src/pages/library/state.js
// Centralised mutable state for the library page.
// All filter, search, and data state lives here so every module
// reads from the same source — no function-argument state passing.

/**
 * @typedef {'all'|'recent'|'finished'|'bookmarked'|'my-tales'} SidebarFilter
 *
 * @typedef {Object} LibraryState
 * @property {string|null}     userId          - Authenticated Firebase user ID
 * @property {Array<Object>}   allTales        - Full unfiltered tales from Firestore
 * @property {Array<Object>}   filteredTales   - Currently displayed tales
 * @property {string}          searchQuery     - Current search string (lowercase)
 * @property {string}          activeEra       - Active era chip value ('all' or era name)
 * @property {SidebarFilter}   sidebarFilter   - Active sidebar filter key
 * @property {boolean}         sidebarCollapsed
 * @property {boolean}         isLoading
 */

/** @type {LibraryState} */
export const libraryState = {
  userId: null,
  allTales: [],
  filteredTales: [],
  searchQuery: '',
  activeEra: 'all',
  sidebarFilter: 'all',
  sidebarCollapsed: JSON.parse(localStorage.getItem('tt-lib-sidebar-collapsed') ?? 'false'),
  isLoading: false,
};
