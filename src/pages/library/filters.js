// src/pages/library/filters.js
// All filtering logic for the library page.
// Search, era, tone, length, and sidebar filters are composable — they all
// run together against libraryState.allTales so they never conflict.

import { libraryState } from './state.js';
import { debounce } from '@/utils';
import { getBookmarks } from '@services/index.js';
import { buildEraChips, setActiveEraChip, setActiveSidebarBtn } from './ui.js';
import { renderCardsGrid, appendTaleCards } from '@ui/components/taleCard.js';
import { initIcons } from '@ui/components/icons.js';

/* ─────────────────────────────────────────────
   Core — apply all active filters together
   ───────────────────────────────────────────── */

/**
 * Applies the current search query, era, tone, length, and sidebar filters
 * together against libraryState.allTales and renders the result.
 * Called by every individual filter change — single source of render truth.
 *
 * @returns {Promise<void>}
 */
export async function applyAllFilters() {
  let result = [...libraryState.allTales];

  // 1. Sidebar filter (scope reduction — may hit Firestore for bookmarks)
  result = await _applySidebarFilter(result, libraryState.sidebarFilter, libraryState.userId);

  // 2. Era filter
  if (libraryState.activeEra !== 'all') {
    result = result.filter((t) => t.era?.toLowerCase() === libraryState.activeEra.toLowerCase());
  }

  // 3. Tone filter
  if (libraryState.activeTone !== 'all') {
    result = result.filter((t) => t.tone?.toLowerCase() === libraryState.activeTone.toLowerCase());
  }

  // 4. Length filter — based on tale wordCount field
  if (libraryState.activeLength !== 'all') {
    result = result.filter((t) => {
      const wc = Number(t.wordCount) || 0;
      if (libraryState.activeLength === 'short') return wc < 2000;
      if (libraryState.activeLength === 'medium') return wc >= 2000 && wc < 10000;
      if (libraryState.activeLength === 'long') return wc >= 10000;
      return true;
    });
  }

  // 5. Search query (across title, description, era, tags, author)
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
 * Pre-fills from ?search= URL param on first call.
 */
export function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  const urlSearch = new URLSearchParams(window.location.search).get('search');
  if (urlSearch) {
    input.value = urlSearch;
    libraryState.searchQuery = urlSearch.toLowerCase();
  }

  const onSearch = debounce((e) => {
    libraryState.searchQuery = e.target.value.toLowerCase();
    applyAllFilters();
  }, 220);

  input.addEventListener('input', onSearch);

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
 * @param {import('@state/schemas/tale.schema.js').Tale[]} tales
 */
export function setupEraFilter(tales) {
  const eras = [...new Set(tales.map((t) => t.era).filter(Boolean))].sort();
  buildEraChips(eras);

  const bar = document.getElementById('era-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-era]');
    if (!btn) return;
    libraryState.activeEra = btn.dataset.era;
    setActiveEraChip(btn.dataset.era);
    applyAllFilters();
  });
}

/* ─────────────────────────────────────────────
   Tone Filter
   ───────────────────────────────────────────── */

export function setupToneFilter() {
  const bar = document.getElementById('tone-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tone]');
    if (!btn) return;

    libraryState.activeTone = btn.dataset.tone;
    bar.querySelectorAll('[data-tone]').forEach((b) => {
      b.classList.toggle('filter-pill--active', b.dataset.tone === btn.dataset.tone);
    });
    applyAllFilters();
  });
}

/* ─────────────────────────────────────────────
   Length Filter
   ───────────────────────────────────────────── */

export function setupLengthFilter() {
  const bar = document.getElementById('length-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-length]');
    if (!btn) return;

    libraryState.activeLength = btn.dataset.length;
    bar.querySelectorAll('[data-length]').forEach((b) => {
      b.classList.toggle('filter-pill--active', b.dataset.length === btn.dataset.length);
    });
    applyAllFilters();
  });
}

/* ─────────────────────────────────────────────
   Sidebar Filter
   ───────────────────────────────────────────── */

export function setupSidebarFilter() {
  document.querySelectorAll('.sidebar-filter').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const filter = /** @type {import('./state.js').SidebarFilter} */ (btn.dataset.filter);
      libraryState.sidebarFilter = filter;
      setActiveSidebarBtn(filter);
      await applyAllFilters();
    });
  });
}

/* ─────────────────────────────────────────────
   Internal — sidebar filter logic
   ───────────────────────────────────────────── */

/**
 * @param {import('@state/schemas/tale.schema.js').Tale[]} tales
 * @param {import('./state.js').SidebarFilter} filter
 * @param {string} userId
 * @returns {Promise<import('@state/schemas/tale.schema.js').Tale[]>}
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
      // Bookmarks are keyed by taleId — use taleId field, not id
      const ids = new Set(bookmarks.map((b) => b.taleId));
      return tales.filter((t) => ids.has(t.id));
    }

    case 'my-tales':
      return tales.filter((t) => t.authorId === userId);

    case 'all':
    default:
      return tales;
  }
}
