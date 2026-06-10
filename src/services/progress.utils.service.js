// src/services/progress.utils.service.js
// Fetches chapter-level progress data for a tale from Firestore.
// Used for rendering progress indicators across the UI.

import { getDocs, refs } from '@fb/index.js';
import { createLogger } from '@/utils';

const log = createLogger('ProgressUtils');

/**
 * Fetches scroll progress for all chapters of a tale from Firestore.
 * Returns a map of chapterIndex => scrollPercent.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {string} taleId - ID of the tale
 * @returns {Promise<Object>} Map of chapterIndex (string) to scrollPercent (number)
 */
export async function getTaleProgressData(userId, taleId) {
  log.debug('Fetching chapter progress data', { userId, taleId });
  try {
    const snap = await getDocs(refs.progressChapters(userId, taleId));
    const chaptersProgress = {};
    snap.forEach((d) => {
      chaptersProgress[d.id] = d.data().scrollPercent || 0;
    });
    log.info(`Found progress for ${snap.docs.length} chapters`);
    return chaptersProgress;
  } catch (err) {
    log.error('Failed to fetch chapter progress', err);
    return {};
  }
}
