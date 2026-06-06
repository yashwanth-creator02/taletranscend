// src/pages/library/content.js
// Page-based pagination with Firestore.

import { getTalesPageNumbered } from '@services/index.js';
import { libraryState } from './state.js';
import { safeCall } from '@/utils';

/**
 * Loads a specific page of tales.
 * Replaces allTales with just this page's tales.
 *
 * @param {number} page - 1-based page number
 * @returns {Promise<{tales: Tale[], total: number, hasMore: boolean}>}
 */
export async function loadTalesPage(page) {
  if (libraryState.isLoading) return { tales: [], total: 0, hasMore: false };

  libraryState.isLoading = true;

  const result = await safeCall(
    getTalesPageNumbered({ page, perPage: libraryState.talesPerPage }),
    { tales: [], total: 0, hasMore: false },
    'Failed to load tales from the archive.'
  );

  libraryState.allTales = result.tales;
  libraryState.totalTales = result.total;
  libraryState.currentPage = page;
  libraryState.isLoading = false;

  return result;
}

/**
 * Goes to next page if available.
 */
export async function nextPage() {
  return loadTalesPage(libraryState.currentPage + 1);
}

/**
 * Goes to previous page if available.
 */
export async function prevPage() {
  if (libraryState.currentPage <= 1)
    return { tales: libraryState.allTales, total: libraryState.totalTales, hasMore: true };
  return loadTalesPage(libraryState.currentPage - 1);
}
