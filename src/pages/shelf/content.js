// src/pages/shelf/content.js
// Data fetching, filtering, sorting, and grid rendering for the shelf page.
// Pure data layer — no direct DOM manipulation except delegating to ui.js renderers.

import { getBookmarks, getTales, getUserDrafts } from '@services/index.js';
import { shelfState } from './state.js';
import { renderGrid, renderHeroStats, setGridLoading, setGridEmpty, setGridError } from './ui.js';

/* ─────────────────────────────────────────────
   Bookmarked Tales
   ───────────────────────────────────────────── */

/**
 * Fetches bookmarked tales, stores them in state, and renders the grid.
 * On subsequent calls (tab switch) uses cached state to avoid re-fetching.
 *
 * @param {string} userId
 * @param {boolean} [force=false] - Force re-fetch even if cache exists
 */
export async function loadBookmarkedTales(userId, force = false) {
  if (!userId) return;

  // Use cache unless forced or empty
  if (!force && shelfState.bookmarkedTales.length) {
    renderGrid(applyFilterSort(shelfState.bookmarkedTales), 'bookmarked');
    return;
  }

  shelfState.isLoading = true;
  setGridLoading();

  try {
    const [allTales, bookmarks] = await Promise.all([getTales(), getBookmarks({ userId })]);

    const bookmarkedIds = new Set(bookmarks.map((b) => b.id));
    const tales = allTales.filter((t) => bookmarkedIds.has(t.id));

    shelfState.bookmarkedTales = tales;

    if (!tales.length) {
      setGridEmpty('No bookmarked tales yet. Head to the library to start saving.');
      return;
    }

    renderGrid(applyFilterSort(tales), 'bookmarked');
  } catch (err) {
    console.error('[shelf] loadBookmarkedTales failed:', err);
    setGridError();
  } finally {
    shelfState.isLoading = false;
  }
}

/* ─────────────────────────────────────────────
   Drafts
   ───────────────────────────────────────────── */

/**
 * Fetches user drafts, stores them in state, and renders the grid.
 *
 * @param {string} userId
 * @param {boolean} [force=false]
 */
export async function loadDrafts(userId, force = false) {
  if (!userId) return;

  if (!force && shelfState.drafts.length) {
    renderGrid(applyFilterSort(shelfState.drafts), 'drafts');
    return;
  }

  shelfState.isLoading = true;
  setGridLoading();

  try {
    const drafts = await getUserDrafts(userId);
    shelfState.drafts = drafts;

    if (!drafts.length) {
      setGridEmpty('No drafts yet. Start writing in the contribution page.');
      return;
    }

    renderGrid(applyFilterSort(drafts), 'drafts');
  } catch (err) {
    console.error('[shelf] loadDrafts failed:', err);
    setGridError();
  } finally {
    shelfState.isLoading = false;
  }
}

/* ─────────────────────────────────────────────
   Hero Stats
   ───────────────────────────────────────────── */

/**
 * Computes and renders real hero stat values from cached state.
 * Call after both bookmarkedTales and drafts have been loaded.
 */
export function computeAndRenderHeroStats() {
  const bookmarkCount = shelfState.bookmarkedTales.length;
  const draftCount = shelfState.drafts.length;

  // totalWordsWritten is a denormalized field written by cloud.js on every save
  const wordsPreserved = shelfState.drafts.reduce((acc, d) => acc + (d.totalWordsWritten || 0), 0);

  shelfState.heroStats = { draftCount, bookmarkCount, wordsPreserved };
  renderHeroStats(shelfState.heroStats);
}

/* ─────────────────────────────────────────────
   Filter + Sort
   ───────────────────────────────────────────── */

/**
 * Re-applies the current filter + sort to the active tab's data
 * and re-renders the grid. Called on every filter/sort change.
 */
export function applyAndRender() {
  const data =
    shelfState.activeTab === 'bookmarked' ? shelfState.bookmarkedTales : shelfState.drafts;

  if (!data.length) return;

  renderGrid(applyFilterSort(data), shelfState.activeTab);
}

/**
 * Filters and sorts an array of tale/draft objects using current state.
 *
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
export function applyFilterSort(items) {
  let result = [...items];

  // Filter by query across title, description, era, tags
  const q = shelfState.filterQuery.trim().toLowerCase();
  if (q) {
    result = result.filter((item) => {
      const searchable = [
        item.title,
        item.description,
        item.synopsis,
        item.era,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
  }

  // Sort
  const dir = shelfState.sortDir === 'asc' ? 1 : -1;

  result.sort((a, b) => {
    switch (shelfState.sortBy) {
      case 'title':
        return dir * (a.title || '').localeCompare(b.title || '');

      case 'progress':
        return dir * ((a.progress || a.percent || 0) - (b.progress || b.percent || 0));

      case 'date':
      default: {
        const aTime = a.updatedAt?.seconds ?? a.lastUpdatedAt ?? 0;
        const bTime = b.updatedAt?.seconds ?? b.lastUpdatedAt ?? 0;
        return dir * (aTime - bTime);
      }
    }
  });

  return result;
}
