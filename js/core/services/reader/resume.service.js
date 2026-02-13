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

  if (localChapters && typeof localChapters === 'object') {
    for (const [chapterIndex, data] of Object.entries(localChapters)) {
      if (data?.scrollPercent < 100) {
        candidates.push({
          chapterIndex: Number(chapterIndex),
          ...data,
        });
      }
    }
  }

  // -------------------- CLOUD CHAPTERS --------------------
  const cloud = await getCloudProgress({ userId, taleId });

  /**
   * Supports BOTH:
   * 1. Legacy object-based chapters
   * 2. New subcollection-based array of chapters
   */

  // Case 1: chapters is an ARRAY (subcollection)
  if (Array.isArray(cloud?.chapters)) {
    for (const chapter of cloud.chapters) {
      if (chapter?.scrollProgress < 100) {
        candidates.push({
          chapterIndex: chapter.chapterIndex,
          scrollPercent: chapter.scrollProgress,
          updatedAt: chapter.updatedAt,
        });
      }
    }
  }

  // Case 2: chapters is an OBJECT (legacy)
  else if (cloud?.chapters && typeof cloud.chapters === 'object') {
    for (const [chapterIndex, data] of Object.entries(cloud.chapters)) {
      if (data?.scrollPercent < 100) {
        candidates.push({
          chapterIndex: Number(chapterIndex),
          ...data,
        });
      }
    }
  }

  // -------------------- RESUME POINT SELECTION --------------------
  return (
    candidates
      .filter((c) => typeof c.updatedAt === 'number')
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] || null
  );
}
