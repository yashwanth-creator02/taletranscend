// src/services/progress.utils.service.js
// Fetches chapter-level progress data for a tale from Firestore.
// Used for rendering progress indicators across the UI.

import { db, appId, collection, getDocs } from '@firebase/index.js';

/* ================= Firestore Structure Reference =================
artifacts (collection)
 └─ {appId} (document)
     └─ users (collection)
         └─ {userId} (document)
             └─ readerProgress (collection)
                 └─ {taleId} (document)
                     └─ chapters (subcollection)
                         └─ {chapterIndex} (document)
                             └─ scrollPercent
==================================================================== */

/**
 * Fetches scroll progress for all chapters of a tale from Firestore.
 * Returns a map of chapterIndex => scrollPercent.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {string} taleId - ID of the tale
 * @returns {Promise<Object>} Map of chapterIndex (string) to scrollPercent (number)
 */
export async function getTaleProgressData(userId, taleId) {
  try {
    const chaptersRef = collection(
      db,
      'artifacts',
      appId,
      'users',
      userId,
      'readerProgress',
      taleId,
      'chapters'
    );
    const snapshot = await getDocs(chaptersRef);

    const chaptersProgress = {};
    snapshot.forEach((doc) => {
      // doc.id is the chapter index as a string ('0', '1', '2' ...)
      chaptersProgress[doc.id] = doc.data().scrollPercent || 0;
    });

    return chaptersProgress;
  } catch (err) {
    console.error('Failed to fetch chapter progress from Firestore:', err);
    return {};
  }
}
