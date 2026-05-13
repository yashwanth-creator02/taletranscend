// src/pages/tale/content.js
// Fetches tale data and chapter list from Firestore.
// Falls back to the user's draft if the public tale is not found.

import { getDoc, getDocs, refs } from '@fb/index.js';

/**
 * Loads a tale from Firestore.
 * First checks the public community tales collection.
 * Falls back to the user's personal drafts if not found publicly.
 *
 * @param {string} taleId - ID of the tale to fetch
 * @param {Object} user - Authenticated Firebase user object
 * @returns {Promise<Object|null>} Tale data or null if not found in either location
 */
export async function loadTale(taleId, user) {
  if (!taleId) return null;

  // Attempt to load from the public tales collection first
  const publicRef = refs.tale(taleId);

  const publicSnap = await getDoc(publicRef);

  if (publicSnap.exists()) {
    return {
      id: publicSnap.id,
      ...publicSnap.data(),
    };
  }

  // No authenticated user means draft fallback is impossible
  if (!user?.uid) {
    return null;
  }

  // Fall back to the user's private draft
  const draftRef = refs.draft(user.uid, taleId);

  const draftSnap = await getDoc(draftRef);

  if (!draftSnap.exists()) {
    return null;
  }

  return {
    id: draftSnap.id,
    ...draftSnap.data(),
  };
}

/**
 * Loads all chapters for a tale from the public collection.
 * Chapters are sorted by chapterNum field ascending.
 *
 * @param {string} taleId - ID of the tale whose chapters to fetch
 * @returns {Promise<Array<Object>>} Sorted array of chapter objects
 */
export async function loadChapters(taleId) {
  if (!taleId) return [];

  // Public chapters collection reference
  const chaptersRef = refs.chapters(taleId);

  const snapshot = await getDocs(chaptersRef);

  // Normalize and sort chapters
  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
    .sort((a, b) => {
      const aNum = a.chapterNum || 0;
      const bNum = b.chapterNum || 0;

      return aNum - bNum;
    });
}
