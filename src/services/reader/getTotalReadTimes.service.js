// src/services/reader/getTotalReadTimes.service.js
// Aggregates total read times across multiple tales for a given user.
// Combines local and cloud read time via the readTime selector.

import { getTotalReadTime } from './readTime.selector.js';
import { createLogger } from '@/utils';

const log = createLogger('GetTotalReadTimes');

/**
 * Retrieves total read times for multiple tales in parallel.
 * Uses Promise.all for efficiency — does not block on each tale sequentially.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string[]} params.taleIds - Array of tale IDs to fetch read times for
 * @returns {Promise<Object>} Map of taleId => totalReadTimeMs
 */
export async function getTotalReadTimes({ userId, taleIds }) {
  if (!userId || !Array.isArray(taleIds) || taleIds.length === 0) return {};

  log.debug('Fetching batch read times', { userId, count: taleIds.length });
  const entries = await Promise.all(
    taleIds.map(async (taleId) => {
      const ms = await getTotalReadTime({ userId, taleId });
      return [taleId, ms];
    })
  );

  const result = Object.fromEntries(entries);
  log.info('Batch read times resolved', { count: Object.keys(result).length });
  return result;
}
