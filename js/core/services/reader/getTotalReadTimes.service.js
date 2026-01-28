import { getTotalReadTime } from './readTime.selector.js';

/**
 * Retrieves total read times for multiple tales for a given user.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the user
 * @param {string[]} params.taleIds - Array of tale IDs
 * @returns {Object} Mapping of taleId => totalReadTimeMs
 */
export async function getTotalReadTimes({ userId, taleIds }) {
  // Validate input: must have a user ID and a non-empty array of tale IDs
  if (!userId || !Array.isArray(taleIds) || taleIds.length === 0) {
    return {}; // Return empty object if input is invalid
  }

  // Fetch total read time for each tale in parallel
  const entries = await Promise.all(
    taleIds.map(async (taleId) => {
      const ms = await getTotalReadTime({ userId, taleId });
      return [taleId, ms]; // Convert each result to a [key, value] pair
    })
  );

  // Convert the array of [key, value] pairs into an object
  return Object.fromEntries(entries);
}
