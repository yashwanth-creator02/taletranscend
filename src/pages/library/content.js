// src/pages/library/content.js
// Manages paginated loading of published tales from Firestore.
// Replaces the previous onSnapshot subscription to avoid unbounded reads.

import { getTalesPage } from '@services/index.js';
import { libraryState } from './state.js';
import { safeCall } from '@/utils';

/**
 * Loads the first (or next) batch of tales from Firestore.
 * Appends to libraryState.allTales, updates cursor state, and returns the full list.
 *
 * @returns {Promise<<import('@state/schemas/tale.schema.js').Tale[]>}
 */
export async function loadTalesBatch() {
  if (libraryState.isLoadingMore) return libraryState.allTales;

  libraryState.isLoadingMore = true;

  const { tales, lastDoc } = await safeCall(
    getTalesPage({
      count: libraryState.talesPerPage,
      after: libraryState.lastVisible,
    }),
    { tales: [], lastDoc: null },
    'Failed to load tales from the archive.'
  );

  if (tales.length === 0) {
    libraryState.hasMore = false;
  } else {
    // Deduplicate by id (safety net)
    const existingIds = new Set(libraryState.allTales.map((t) => t.id));
    const newTales = tales.filter((t) => !existingIds.has(t.id));
    libraryState.allTales.push(...newTales);
    libraryState.lastVisible = lastDoc;
    libraryState.hasMore = tales.length === libraryState.talesPerPage;
  }

  libraryState.isLoadingMore = false;
  return libraryState.allTales;
}

/**
 * Convenience wrapper for "Load More" button clicks.
 * Fetches the next batch and returns the updated full list.
 */
export async function loadMoreTales() {
  if (!libraryState.hasMore || libraryState.isLoadingMore) return libraryState.allTales;
  return loadTalesBatch();
}

/**
 * Resets pagination state and reloads from the first page.
 * Call this after a publish or when you want to refresh the library.
 */
export async function resetAndLoadTales() {
  libraryState.allTales = [];
  libraryState.lastVisible = null;
  libraryState.hasMore = true;
  libraryState.isLoadingMore = false;
  return loadTalesBatch();
}
