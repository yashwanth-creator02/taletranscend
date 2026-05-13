// src/services/bookmark.service.js
// Manages user bookmarks stored in Firestore.
// Bookmarks are private to each user and scoped under their user document.

import { getDocs, deleteDoc, setDoc, serverTimestamp, refs } from '@fb/index.js';

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
  await setDoc(refs.bookmark(userId, taleId), { bookmarkedAt: serverTimestamp() }, { merge: true });
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
  await deleteDoc(refs.bookmark(userId, taleId));
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
  const snap = await getDocs(refs.bookmarks(userId));
  return snap.empty ? [] : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
