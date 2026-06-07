// src/state/schemas/bookmark.schema.js
// Canonical shape for bookmark documents.
// users/{uid}/bookmarks/{taleId}

/* ─────────────────────────────────────────────
   Bookmark — users/{uid}/bookmarks/{taleId}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} Bookmark
 * @property {string}   taleId
 * @property {string}   taleTitle
 * @property {string}   coverUrl
 * @property {string}   authorName
 * @property {number}   chapterCount
 * @property {string}   era
 * @property {import('firebase/firestore').Timestamp|null} bookmarkedAt
 */

/**
 * Merges raw Firestore bookmark document data with safe defaults.
 * taleId comes from the document ID (snap.id), not snap.data().
 *
 * @param {string} userId
 * @param {string} taleId
 * @param {Partial<Bookmark>} data
 * @returns {Bookmark}
 */
export function createBookmark(userId, taleId, data = {}) {
  return {
    userId,
    taleId,
    taleTitle: data.taleTitle || data.title || '',
    title: data.taleTitle || data.title || '',
    coverUrl: data.coverUrl ?? '',
    authorName: data.authorName ?? '',
    chapterCount: Number(data.chapterCount ?? 0),
    era: data.era ?? '',
    createdAt: data.createdAt
      ? data.createdAt.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt)
      : new Date(),
    bookmarkedAt: data.bookmarkedAt ?? null,
  };
}

/**
 * Builds the Firestore payload for writing a new bookmark.
 * Caches key tale fields to avoid extra reads on the shelf page.
 *
 * @param {string} taleId
 * @param {import('./tale.schema.js').Tale} tale
 * @param {import('firebase/firestore').FieldValue} serverTimestamp
 * @returns {Object}
 */
export function bookmarkToFirestore(taleId, tale, serverTimestamp) {
  return {
    taleId,
    taleTitle: tale.title ?? '',
    coverUrl: tale.coverUrl ?? '',
    authorName: tale.authorName ?? '',
    chapterCount: tale.chapterCount ?? 0,
    era: tale.era ?? '',
    bookmarkedAt: serverTimestamp,
  };
}
