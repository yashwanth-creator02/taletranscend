// src/pages/shelf/content.js
// Data fetching, filtering, sorting, and grid rendering for the shelf page.
// Pure data layer — no direct DOM manipulation except delegating to ui.js renderers.
//
// Key fix: loadBookmarkedTales no longer calls getTales() + filters — that caused
// two Firestore round-trips and used b.id (wrong) instead of b.taleId.
// Bookmarks already cache taleTitle, coverUrl, era, chapterCount — enough to render.
// The bookmark objects are cast to the Tale-compatible shape needed by buildBookmarkCard.

import { getBookmarks, getUserDrafts } from '@services/index.js';
import { createBookmark } from '@state/index.js';
import { createLogger } from '@/utils';
import { shelfState } from './state.js';
import { renderGrid, renderHeroStats, setGridLoading, setGridEmpty, setGridError } from './ui.js';

const log = createLogger('ShelfContent');

/* ─────────────────────────────────────────────
   Bookmarked Tales
   ───────────────────────────────────────────── */

/**
 * Fetches bookmarked tales directly from the bookmarks subcollection.
 * Bookmarks cache all fields needed for card rendering — no getTales() needed.
 * Uses shelfState.bookmarkedTales as a cache to avoid re-fetching on tab switch.
 *
 * @param {string} userId
 * @param {boolean} [force=false] - Force re-fetch even if cache exists
 */
export async function loadBookmarkedTales(userId, force = false) {
  if (!userId) return;

  log.info('Loading bookmarked tales', { userId, force });
  // Use cache unless forced or empty
  if (!force && shelfState.bookmarkedTales.length) {
    log.debug('Using cached bookmarked tales');
    renderGrid(applyFilterSort(shelfState.bookmarkedTales), 'bookmarked');
    return;
  }

  shelfState.isLoading = true;
  setGridLoading();

  try {
    const bookmarks = await getBookmarks({ userId });
    log.info(`Found ${bookmarks.length} bookmarks`);

    // Normalize through schema — ensures every field has a safe default
    // Build a card-compatible shape from the cached bookmark fields.
    // Bug fix: was using b.id (Firestore doc auto-ID) instead of b.taleId.
    const tales = bookmarks.map((b) => {
      const bm = createBookmark(b.taleId, b);
      return {
        id: bm.taleId,
        title: bm.taleTitle,
        coverUrl: bm.coverUrl,
        authorName: bm.authorName,
        chapterCount: bm.chapterCount,
        era: bm.era,
        description: '',
        progress: 0,
      };
    });

    shelfState.bookmarkedTales = tales;

    if (!tales.length) {
      setGridEmpty('No bookmarked tales yet. Head to the library to start saving.');
      return;
    }

    renderGrid(applyFilterSort(tales), 'bookmarked');
  } catch (err) {
    log.error('loadBookmarkedTales failed:', err);
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

  log.info('Loading drafts', { userId, force });
  if (!force && shelfState.drafts.length) {
    log.debug('Using cached drafts');
    renderGrid(applyFilterSort(shelfState.drafts), 'drafts');
    return;
  }

  shelfState.isLoading = true;
  setGridLoading();

  try {
    const drafts = await getUserDrafts(userId);
    log.info(`Found ${drafts.length} drafts`);
    shelfState.drafts = drafts;

    if (!drafts.length) {
      setGridEmpty('No drafts yet. Start writing in the contribution page.');
      return;
    }

    renderGrid(applyFilterSort(drafts), 'drafts');
  } catch (err) {
    log.error('loadDrafts failed:', err);
    setGridError();
  } finally {
    shelfState.isLoading = false;
  }
}

/* ─────────────────────────────────────────────
   Hero Stats
   ───────────────────────────────────────────── */

/**
 * Computes and renders hero stat values from cached state.
 * Call after both bookmarkedTales and drafts have been loaded.
 */
export function computeAndRenderHeroStats() {
  log.debug('Computing hero stats...');
  const bookmarkCount = shelfState.bookmarkedTales.length;
  const draftCount = shelfState.drafts.length;
  const wordsPreserved = shelfState.drafts.reduce((acc, d) => acc + (d.wordCount || 0), 0);

  shelfState.heroStats = { draftCount, bookmarkCount, wordsPreserved };
  log.info('Hero stats updated', shelfState.heroStats);
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
  log.info('Applying filters and sorting...', {
    tab: shelfState.activeTab,
    query: shelfState.filterQuery,
    sortBy: shelfState.sortBy,
    dir: shelfState.sortDir,
  });

  const data =
    shelfState.activeTab === 'bookmarked' ? shelfState.bookmarkedTales : shelfState.drafts;

  if (!data.length) {
    log.debug('No data to filter/sort');
    return;
  }

  const filtered = applyFilterSort(data);
  log.info(`Rendered ${filtered.length} items after filtering`);
  renderGrid(filtered, shelfState.activeTab);
}

/**
 * Filters and sorts an array of tale/draft objects using current shelfState.
 *
 * @param {Array<Object>} items
 * @returns {Array<Object>}
 */
export function applyFilterSort(items) {
  let result = [...items];

  // Filter by query across title, description, era, tags
  const q = (shelfState.filterQuery || '').trim().toLowerCase();
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
        const aTime = a.updatedAt?.seconds ?? a.bookmarkedAt?.seconds ?? a.lastUpdatedAt ?? 0;
        const bTime = b.updatedAt?.seconds ?? b.bookmarkedAt?.seconds ?? b.lastUpdatedAt ?? 0;
        return dir * (aTime - bTime);
      }
    }
  });

  return result;
}
