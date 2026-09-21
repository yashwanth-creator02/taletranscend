// src/pages/library/filters.js
// All filtering logic for the library page.
// Search, era, tone, length, and sidebar filters are composable — they all
// run together against libraryState.allTales so they never conflict.

import { libraryState } from './state.js';
import { debounce, createLogger } from '@/utils';
import { getBookmarks } from '@services/index.js';
import { buildEraChips, setActiveEraChip, setActiveSidebarBtn } from './ui.js';
import { renderCardsGrid } from '@ui/components/taleCard.js';
import { initIcons } from '@ui/components/icons.js';

const log = createLogger('LibraryFilters');

/* ─────────────────────────────────────────────
   Core — apply all active filters together
   ───────────────────────────────────────────── */

/**
 * Applies the current search query, era, tone, length, and sidebar filters
 * together against libraryState.allTales and renders the result.
 * Called by every individual filter change — single source of render truth.
 *
 * @param {Object} [options]
 * @param {boolean} [options.append=false] - If true, only newly loaded tales are rendered
 * @returns {Promise<void>}
 */
export async function applyAllFilters({ append = false } = {}) {
  log.info('Applying filters...', {
    sidebar: libraryState.sidebarFilter,
    era: libraryState.activeEra,
    tone: libraryState.activeTone,
    length: libraryState.activeLength,
    query: libraryState.searchQuery,
  });

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

  if (append) {
    // When appending, we only care about the tales that aren't already in the DOM.
    // However, applyAllFilters is usually called after fetching a new batch.
    // To keep it simple and safe (matching user request), we re-render everything
    // unless the user specifically wanted appendTaleCards logic.
    // The user's prompt suggested:
    // "if (append) { ... await renderCardsGrid(...) } else { await renderCardsGrid(...) }"
    // which effectively re-renders everything in both cases.
    await renderCardsGrid(libraryState.userId, result);
  } else {
    await renderCardsGrid(libraryState.userId, result);
  }

  log.info(`Filters applied. Resulting tales: ${result.length}`);
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
  log.info('Setting up search filter');
  const input = document.getElementById('search-input');
  if (!input) return;

  const urlSearch = new URLSearchParams(window.location.search).get('search');
  if (urlSearch) {
    input.value = urlSearch;
    libraryState.searchQuery = urlSearch.toLowerCase();
  }

  const onSearch = debounce((e) => {
    libraryState.searchQuery = e.target.value.toLowerCase();
    log.info('Search query updated:', libraryState.searchQuery);
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
  log.info('Setting up era filter');
  const eras = [...new Set(tales.map((t) => t.era).filter(Boolean))].sort();
  buildEraChips(eras);

  const bar = document.getElementById('era-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-era]');
    if (!btn) return;
    log.info('Era filter changed:', btn.dataset.era);
    libraryState.activeEra = btn.dataset.era;
    setActiveEraChip(btn.dataset.era);
    applyAllFilters();
  });
}

/* ─────────────────────────────────────────────
   Tone Filter
   ───────────────────────────────────────────── */

export function setupToneFilter() {
  log.info('Setting up tone filter');
  const bar = document.getElementById('tone-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tone]');
    if (!btn) return;

    log.info('Tone filter changed:', btn.dataset.tone);
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
  log.info('Setting up length filter');
  const bar = document.getElementById('length-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-length]');
    if (!btn) return;

    log.info('Length filter changed:', btn.dataset.length);
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
  log.info('Setting up sidebar filter');
  document.querySelectorAll('.sidebar-filter').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const filter = /** @type {import('./state.js').SidebarFilter} */ (btn.dataset.filter);
      log.info('Sidebar filter changed:', filter);
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
  log.debug('Applying sidebar filter logic', { filter, userId });
  switch (filter) {
    case 'recent':
      return [...tales]
        .filter((t) => t.publishedAt)
        .sort((a, b) => (b.publishedAt?.seconds ?? 0) - (a.publishedAt?.seconds ?? 0))
        .slice(0, 30);

    case 'finished':
      return tales.filter((t) => t.status === 'finished');

    case 'bookmarked': {
      log.debug('Fetching bookmarks for filter...');
      const bookmarks = await getBookmarks({ userId });
      // Bookmarks are keyed by taleId — use taleId field, not id
      const ids = new Set(bookmarks.map((b) => b.taleId));
      log.debug(`Filtering by ${ids.size} bookmarks`);
      return tales.filter((t) => ids.has(t.id));
    }

    case 'my-tales':
      return tales.filter((t) => t.authorId === userId);

    case 'all':
    default:
      return tales;
  }
}
