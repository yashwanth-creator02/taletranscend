// src/services/bookmark.service.js
// Manages user bookmarks stored in Firestore.
// Bookmarks are private to each user and scoped under their user document.

import {
  db,
  appId,
  doc,
  getDocs,
  deleteDoc,
  setDoc,
  collection,
  serverTimestamp,
  PATHS,
} from '@fb/index.js';

/* ================= Firestore Structure Reference =================
artifacts (collection)
 └─ {appId} (document)
     └─ users (collection)
         └─ {userId} (document)
             └─ bookmarks (collection)
                 └─ {taleId} (document)
                     └─ bookmarkedAt
==================================================================== */

/**
 * Adds a tale to a user's private bookmark collection in Firestore.
 * Uses taleId as the document ID for easy lookup and deduplication.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale to bookmark
 */
export async function addToBookmarks({ userId, taleId }) {
  if (!userId || !taleId) return;

  const ref = doc(db, PATHS.bookmark(userId, taleId));

  // Merge to avoid overwriting if the bookmark already exists
  await setDoc(ref, { bookmarkedAt: serverTimestamp() }, { merge: true });
}

/**
 * Removes a tale from a user's private bookmark collection.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale to remove
 */
export async function removeFromBookmarks({ userId, taleId }) {
  if (!userId || !taleId) return;

  const ref = doc(db, PATHS.bookmark(userId, taleId));
  await deleteDoc(ref);
}

/**
 * Retrieves all bookmarked tales for a specific user.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @returns {Promise<Array<Object>>} Array of bookmark objects each containing id and metadata
 */
export async function getBookmarks({ userId }) {
  if (!userId) return [];

  const ref = collection(db, PATHS.bookmarks(userId));
  const snap = await getDocs(ref);

  return snap.empty ? [] : snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
