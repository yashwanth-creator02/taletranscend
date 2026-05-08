// src/services/reader/resume.service.js
// Resolves the best chapter to resume reading by comparing
// local storage and cloud progress, returning the most recently updated incomplete chapter.

import { readStorage } from './localProgress.service.js';
import { getCloudProgress } from './cloudProgress.service.js';

/**
 * Determines the optimal resume point for a user across local and cloud progress.
 * Filters out completed chapters (scrollPercent >= 100) and picks the most recent.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale
 * @returns {Promise<Object|null>} { chapterIndex, scrollPercent, updatedAt } or null if no progress
 */
export async function resolveResumePoint({ userId, taleId }) {
  if (!userId || !taleId) return null;

  const candidates = [];

  // -------------------- Local Progress --------------------
  const localChapters = readStorage()[userId]?.[taleId]?.chapters;

  if (localChapters && typeof localChapters === 'object') {
    for (const [chapterIndex, data] of Object.entries(localChapters)) {
      if (data?.scrollPercent < 100) {
        candidates.push({ chapterIndex: Number(chapterIndex), ...data });
      }
    }
  }

  // -------------------- Cloud Progress --------------------
  const cloud = await getCloudProgress({ userId, taleId });

  if (cloud?.chapters && typeof cloud.chapters === 'object') {
    // chapters is always an object map keyed by chapterIndex string
    // since getCloudProgress now builds it from the subcollection
    for (const [chapterIndex, data] of Object.entries(cloud.chapters)) {
      if (data?.scrollPercent < 100) {
        candidates.push({ chapterIndex: Number(chapterIndex), ...data });
      }
    }
  }

  // -------------------- Resume Selection --------------------
  // Sort by updatedAt descending and return the most recent incomplete chapter.
  // Firestore Timestamps have a toMillis() method; local timestamps are plain numbers.
  return (
    candidates
      .filter((c) => c.updatedAt != null)
      .sort((a, b) => {
        const aTime =
          typeof a.updatedAt?.toMillis === 'function' ? a.updatedAt.toMillis() : a.updatedAt;
        const bTime =
          typeof b.updatedAt?.toMillis === 'function' ? b.updatedAt.toMillis() : b.updatedAt;
        return bTime - aTime;
      })[0] || null
  );
}
