import { getTalesPageNumbered } from '@services/index.js';
import { cacheService } from '@services/cache.service.js';
import { libraryState } from './state.js';
import { safeCall, createLogger } from '@/utils';
import { fetchTalesMetadata, renderTaleCards } from '@ui/components/taleCard.js';
import { initIcons } from '@ui/components/icons.js';
import { applyAllFilters } from './filters.js';

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

  const onBackgroundUpdate = async (freshResult) => {
    log.info('Background update for library page received', { count: freshResult.tales?.length });
    const cachedTales = libraryState.allTales;
    const freshTales = freshResult.tales || [];

    cacheService.reconcileOrReload({
      cached: cachedTales,
      fresh: freshTales,
      updateDiv: async (freshTale, id) => {
        log.info('Updating specific library tale card div', { id });
        const cardEl = document.querySelector(`#cards-grid article[data-id="${id}"]`);
        if (cardEl) {
          const metadata = await fetchTalesMetadata(libraryState.userId, [freshTale]);
          const temp = document.createElement('div');
          renderTaleCards(temp, [freshTale], metadata);
          const newCard = temp.firstElementChild;
          if (newCard) {
            cardEl.replaceWith(newCard);
            initIcons();
          }
        }
      },
      onReload: async () => {
        log.info('Changes too many in library page — re-rendering full grid');
        libraryState.allTales = freshTales;
        libraryState.totalTales = freshResult.total;
        await applyAllFilters();
      },
    });
  };

  const result = await safeCall(
    getTalesPageNumbered({
      page,
      perPage: libraryState.talesPerPage,
      onBackgroundUpdate,
    }),
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
