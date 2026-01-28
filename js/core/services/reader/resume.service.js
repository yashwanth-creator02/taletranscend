import { readStorage } from './localProgress.service.js';
import { getCloudProgress } from './cloudProgress.service.js';

/**
 * Determines the best chapter to resume reading for a user.
 * Combines both local storage and cloud progress to find the most recent incomplete chapter.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the user
 * @param {string} params.taleId - ID of the tale
 * @returns {Object|null} The resume point { chapterIndex, scrollPercent, updatedAt } or null if none found
 */
export async function resolveResumePoint({ userId, taleId }) {
  if (!userId || !taleId) return null;

  const candidates = [];

  // -------------------- LOCAL CHAPTERS --------------------
  const localChapters = readStorage()[userId]?.[taleId]?.chapters;

  if (localChapters) {
    // Include only chapters not fully read (<100%)
    for (const [chapterIndex, data] of Object.entries(localChapters)) {
      if (data.scrollPercent < 100) {
        candidates.push({ chapterIndex: +chapterIndex, ...data });
      }
    }
  }

  // -------------------- CLOUD CHAPTERS --------------------
  const cloud = await getCloudProgress({ userId, taleId });

  if (cloud?.chapters) {
    for (const [chapterIndex, data] of Object.entries(cloud.chapters)) {
      if (data.scrollPercent < 100) {
        candidates.push({ chapterIndex: +chapterIndex, ...data });
      }
    }
  }

  // -------------------- RESUME POINT SELECTION --------------------
  // Pick the most recently updated chapter among all candidates
  return candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
}
