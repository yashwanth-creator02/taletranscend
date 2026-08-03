// src/features/library/content.js
// Page-based pagination with Firestore.

import { getTalesPageNumbered } from '@services/index.js';
import { libraryState } from './state.js';
import { safeCall, createLogger } from '@/utils';

const log = createLogger('LibraryContent');

/**
 * Loads a specific page of tales.
 * Replaces allTales with just this page's tales.
 *
 * @param {number} page - 1-based page number
 * @returns {Promise<{tales: Tale[], total: number, hasMore: boolean}>}
 */
export async function loadTalesPage(page) {
  if (libraryState.isLoading) {
    log.debug('Load requested while already loading', { page });
    return { tales: [], total: 0, hasMore: false };
  }

  log.info(`Loading page ${page}...`, { perPage: libraryState.talesPerPage });
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

  log.info(
    `Loaded page ${page}. Found ${result.tales.length} tales. Total in archive: ${result.total}`
  );
  return result;
}

/**
 * Goes to next page if available.
 */
export async function nextPage() {
  log.info('Navigating to next page');
  return loadTalesPage(libraryState.currentPage + 1);
}

/**
 * Goes to previous page if available.
 */
export async function prevPage() {
  if (libraryState.currentPage <= 1) {
    log.info('Already on the first page');
    return { tales: libraryState.allTales, total: libraryState.totalTales, hasMore: true };
  }
  log.info('Navigating to previous page');
  return loadTalesPage(libraryState.currentPage - 1);
}
