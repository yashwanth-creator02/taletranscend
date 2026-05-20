// src/pages/library/filters.js
// All filtering logic for the library page.
// Search, era, and sidebar filters are composable — they all run together
// against libraryState.allTales so they never conflict with each other.

import { libraryState } from './state.js';
import { getBookmarks } from '@services/index.js';
import { buildEraChips, setActiveEraChip, setActiveSidebarBtn } from './ui.js';
import { renderCardsGrid } from '@ui/components/taleCard.js';
import { initIcons } from '@/ui/icons.js';

/* ─────────────────────────────────────────────
   Core: apply all active filters together
   ───────────────────────────────────────────── */

/**
 * Applies the current search query, era filter, and sidebar filter
 * together against libraryState.allTales and renders the result.
 *
 * Called by every individual filter change — single source of render truth.
 *
 * @returns {Promise<void>}
 */
export async function applyAllFilters() {
  let result = [...libraryState.allTales];

  // 1. Sidebar filter (scope reduction)
  result = await _applySidebarFilter(result, libraryState.sidebarFilter, libraryState.userId);

  // 2. Era filter
  if (libraryState.activeEra !== 'all') {
    result = result.filter((t) => t.era?.toLowerCase() === libraryState.activeEra.toLowerCase());
  }

  // 3. Search query (across title, description, era, tags, author)
  const q = libraryState.searchQuery.trim();
  if (q) {
    result = result.filter((t) => {
      const searchable = [t.title, t.description, t.era, t.authorName, ...(t.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }

  libraryState.filteredTales = result;
  await renderCardsGrid(libraryState.userId, result);
  initIcons();
}

/* ─────────────────────────────────────────────
   Search
   ───────────────────────────────────────────── */

/**
 * Initialises the search input with debounced filtering.
 * Pre-fills the input from ?search= URL param on first call.
 */
export function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  // Pre-fill from URL param
  const urlSearch = new URLSearchParams(window.location.search).get('search');
  if (urlSearch) {
    input.value = urlSearch;
    libraryState.searchQuery = urlSearch.toLowerCase();
  }

  let debounceTimer;

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      libraryState.searchQuery = e.target.value.toLowerCase();
      applyAllFilters();
    }, 220);
  });

  // CMD/Ctrl+K focuses the search input
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      libraryState.searchQuery = '';
      applyAllFilters();
      input.blur();
    }
  });
}

/* ─────────────────────────────────────────────
   Era Filter
   ───────────────────────────────────────────── */

/**
 * Builds era chips from actual tale data and wires click handlers.
 * Must be called after the first tales batch loads.
 *
 * @param {Array<Object>} tales - Full tales array to derive eras from
 */
export function setupEraFilter(tales) {
  // Derive unique eras from real data, sorted alphabetically
  const eras = [...new Set(tales.map((t) => t.era).filter(Boolean))].sort();
  buildEraChips(eras);

  // Wire clicks via delegation on the era bar
  const bar = document.getElementById('era-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-era]');
    if (!btn) return;

    const era = btn.dataset.era;
    libraryState.activeEra = era;
    setActiveEraChip(era);
    applyAllFilters();
  });
}

/* ─────────────────────────────────────────────
   Sidebar Filter
   ───────────────────────────────────────────── */

/**
 * Wires the sidebar filter buttons.
 */
export function setupSidebarFilter() {
  const buttons = document.querySelectorAll('.sidebar-filter');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const filter = /** @type {import('./state.js').SidebarFilter} */ (btn.dataset.filter);
      libraryState.sidebarFilter = filter;
      setActiveSidebarBtn(filter);
      await applyAllFilters();
    });
  });
}

/* ─────────────────────────────────────────────
   Internal: sidebar filter logic
   ───────────────────────────────────────────── */

/**
 * Applies a named sidebar filter to a tales array.
 * Async because the bookmarked filter fetches from Firestore.
 *
 * @param {Array<Object>}                          tales
 * @param {import('./state.js').SidebarFilter}     filter
 * @param {string}                                 userId
 * @returns {Promise<Array<Object>>}
 */
async function _applySidebarFilter(tales, filter, userId) {
  switch (filter) {
    case 'recent':
      return [...tales]
        .filter((t) => t.publishedAt)
        .sort((a, b) => (b.publishedAt?.seconds ?? 0) - (a.publishedAt?.seconds ?? 0))
        .slice(0, 30);

    case 'finished':
      return tales.filter((t) => t.status === 'finished');

    case 'bookmarked': {
      const bookmarks = await getBookmarks({ userId });
      const ids = new Set(bookmarks.map((b) => b.id));
      return tales.filter((t) => ids.has(t.id));
    }

    case 'my-tales':
      return tales.filter((t) => t.authorId === userId);

    case 'all':
    default:
      return tales;
  }
}
