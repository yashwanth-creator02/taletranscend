// src/services/bookmark.service.js
// Manages user bookmarks stored in Firestore.
// Bookmarks are private to each user under users/{uid}/bookmarks/{taleId}.
// Key tale fields are cached on the bookmark document to avoid extra reads on the shelf page.

import { getDocs, deleteDoc, setDoc, serverTimestamp, refs } from '@fb/index.js';
import { createBookmark } from '@state/index.js';
import { safeCall, guardOffline } from '@/utils';

/**
 * Adds a tale to a user's bookmark collection.
 * Caches title, cover, author, chapterCount, and era so the shelf page
 * can render without fetching the full tale document.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {import('@state/schemas/tale.schema.js').Tale} [params.tale] - Optional tale object for caching fields
 */
export async function addToBookmarks({ userId, taleId, tale = {} }) {
  if (!userId || !taleId) return;
  if (guardOffline()) return;

  return safeCall(
    setDoc(
      refs.bookmark(userId, taleId),
      {
        taleId,
        taleTitle: tale.title ?? '',
        coverUrl: tale.coverUrl ?? '',
        authorName: tale.authorName ?? '',
        chapterCount: tale.chapterCount ?? 0,
        era: tale.era ?? '',
        bookmarkedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    undefined,
    'Failed to save bookmark. Please try again.'
  );
}

/**
 * Removes a tale from a user's bookmark collection.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 */
export async function removeFromBookmarks({ userId, taleId }) {
  if (!userId || !taleId) return;
  if (guardOffline()) return;

  return safeCall(
    deleteDoc(refs.bookmark(userId, taleId)),
    undefined,
    'Failed to remove bookmark.'
  );
}

/**
 * Retrieves all bookmarked tales for a user.
 * Returns normalized Bookmark objects via the schema factory.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @returns {Promise<import('@state/schemas/bookmark.schema.js').Bookmark[]>}
 */
export async function getBookmarks({ userId }) {
  if (!userId) return [];

  return safeCall(
    (async () => {
      const snap = await getDocs(refs.bookmarks(userId));
      if (snap.empty) return [];
      return snap.docs.map((d) => createBookmark(d.id, d.data()));
    })(),
    [],
    'Failed to load bookmarks.'
  );
}

/**
 * Checks if a specific tale is bookmarked by the user.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {Promise<boolean>}
 */
export async function isBookmarked({ userId, taleId }) {
  if (!userId || !taleId) return false;

  return safeCall(
    (async () => {
      const { getDoc } = await import('@fb/index.js');
      const snap = await getDoc(refs.bookmark(userId, taleId));
      return snap.exists();
    })(),
    false,
    'Failed to check bookmark status.',
    true // silent
  );
}
