// src/pages/tale/content.js
// Fetches tale data and chapter list from Firestore.
// Falls back to the user's draft if the public tale is not found.

import { db, appId, doc, getDoc, collection, getDocs, PATHS } from '@fb/index.js';

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
  const publicRef = doc(db, PATHS.publicTale(taleId));
  const snap = await getDoc(publicRef);

  if (snap.exists()) return snap.data();

  // Fall back to user's draft if no public tale exists
  const draftRef = doc(db, PATHS.draft(user.uid, taleId));
  const draftSnap = await getDoc(draftRef);

  return draftSnap.exists() ? draftSnap.data() : null;
}

/**
 * Loads all chapters for a tale from the public collection.
 * Chapters are sorted by chapterNum field ascending.
 *
 * @param {string} taleId - ID of the tale whose chapters to fetch
 * @returns {Promise<Array<Object>>} Sorted array of chapter objects
 */
export async function loadChapters(taleId) {
  const ref = collection(db, PATHS.publicTaleChapters(taleId));
  const snap = await getDocs(ref);

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0));
}
