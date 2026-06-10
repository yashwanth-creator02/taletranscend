// src/services/reader/readTime.selector.js
// Selects the most accurate total read time for a tale by comparing
// local storage and cloud Firestore values, taking the higher of the two.

import { getLocalTotalReadTime } from './localProgress.service.js';
import { getCloudProgress } from './cloudProgress.service.js';
import { createLogger } from '@/utils';

const log = createLogger('ReadTimeSelector');

/**
 * Returns the total read time for a tale by combining local and cloud sources.
 * Always returns the maximum value to avoid losing progress due to sync delays.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale
 * @returns {Promise<number>} Total read time in milliseconds
 */
export async function getTotalReadTime({ userId, taleId }) {
  if (!userId || !taleId) return 0;

  log.debug('Resolving total read time', { userId, taleId });
  const localTime = getLocalTotalReadTime({ userId, taleId });

  const cloud = await getCloudProgress({ userId, taleId });
  const cloudTime = cloud?.totalReadTimeMs || 0;

  const max = Math.max(localTime, cloudTime);
  log.info('Total read time resolved', { localTime, cloudTime, result: max });

  // Take the maximum to always trust the most up-to-date source
  return max;
}
