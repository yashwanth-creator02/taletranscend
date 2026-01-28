import { getLocalTotalReadTime } from './localProgress.service.js';
import { getCloudProgress } from './cloudProgress.service.js';

/**
 * Calculates the total read time for a given user and tale.
 * Combines local storage and cloud progress, taking the maximum.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the user
 * @param {string} params.taleId - ID of the tale
 * @returns {number} Total read time in milliseconds
 */
export async function getTotalReadTime({ userId, taleId }) {
  // Validate input
  if (!userId || !taleId) return 0;

  // Fetch total read time from local storage
  const localTime = getLocalTotalReadTime({ userId, taleId });

  // Fetch total read time from cloud Firestore
  const cloud = await getCloudProgress({ userId, taleId });
  const cloudTime = cloud?.totalReadTimeMs || 0;

  // Use the maximum value to ensure we always trust the most recent / highest total read time
  return Math.max(localTime, cloudTime);
}
