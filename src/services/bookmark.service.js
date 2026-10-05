// src/services/bookmark.service.js
// Manages user bookmarks stored in Firestore.
// Bookmarks are private to each user under users/{uid}/bookmarks/{taleId}.
// Key tale fields are cached on the bookmark document to avoid extra reads on the shelf page.

import { getDoc, getDocs, deleteDoc, setDoc, serverTimestamp, refs, auth } from '@fb/index.js';
import { appState, createBookmark } from '@state/index.js';
import {
  safeAsync,
  guardOffline,
  createLogger,
  checkRateLimit,
  saveBookmarkOffline,
  removeBookmarkOffline,
  syncBookmarksOffline,
  getBookmarksOffline,
} from '@/utils';
import { cacheService } from './cache.service.js';

const log = createLogger('BookmarkService');
log.debug('Module initialized');

export const BOOKMARK_COOLDOWN_MS = 5000; // 5s

/**
 * Adds a tale to a user's bookmark collection.
 * Caches title, cover, author, chapterCount, and era so the shelf page
 * can render without fetching the full tale document.
 *
 * @param {Object} params
 * @param {string} [params.userId]
 * @param {string} params.taleId
 * @param {import('@state/schemas/tale.schema.js').Tale} [params.tale] - Optional tale object for caching fields
 */
export async function addToBookmarks({ userId, taleId, tale = {} }) {
  const uid = userId || auth?.currentUser?.uid || appState?.userId;
  if (!uid || !taleId) return;
  if (guardOffline()) return;

  if (!checkRateLimit(`bookmark:${uid}`, BOOKMARK_COOLDOWN_MS)) {
    const { showToast } = await import('@ui/components/toast.js');
    showToast('Soul link unstable. Please wait.', 'warning');
    return { status: 'rate-limited' };
  }

  log.info('Adding bookmark', { userId: uid, taleId });

  let resolvedTale = { ...tale };
  if (!resolvedTale.title) {
    try {
      const snap = await getDoc(refs.tale(taleId));
      if (snap && typeof snap.exists === 'function' && snap.exists()) {
        const data = typeof snap.data === 'function' ? snap.data() : snap;
        resolvedTale = { ...data, ...resolvedTale };
      }
    } catch (err) {
      log.warn('Could not fetch tale metadata for bookmark', err);
    }
  }

  const bookmarkData = {
    taleId,
    taleTitle: resolvedTale.title ?? '',
    coverUrl: resolvedTale.coverUrl ?? '',
    authorName: resolvedTale.authorName ?? '',
    chapterCount: Number(resolvedTale.chapterCount) || 0,
    era: resolvedTale.era ?? '',
    synopsis: resolvedTale.synopsis || resolvedTale.description || '',
    bookmarkedAt: Date.now(),
  };

  // Optimistically save offline
  await saveBookmarkOffline(bookmarkData);
  cacheService.invalidateBookmarks(uid);

  return safeAsync(
    setDoc(
      refs.bookmark(uid, taleId),
      {
        ...bookmarkData,
        bookmarkedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    {
      errorMessage: 'Failed to save bookmark. Please try again.',
      logContext: 'services.bookmark.addToBookmarks',
    }
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
  const uid = userId || auth?.currentUser?.uid || appState?.userId;
  if (!uid || !taleId) return;
  if (guardOffline()) return;

  if (!checkRateLimit(`bookmark:${uid}`, BOOKMARK_COOLDOWN_MS)) {
    const { showToast } = await import('@ui/components/toast.js');
    showToast('Soul link unstable. Please wait.', 'warning');
    return { status: 'rate-limited' };
  }

  log.info('Removing bookmark', { userId: uid, taleId });
  await removeBookmarkOffline(taleId);
  cacheService.invalidateBookmarks(uid);

  return safeAsync(deleteDoc(refs.bookmark(uid, taleId)), {
    errorMessage: 'Failed to remove bookmark.',
    logContext: 'services.bookmark.removeFromBookmarks',
  });
}

/**
 * Retrieves all bookmarked tales for a user.
 * Returns normalized Bookmark objects via the schema factory.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @returns {Promise<import('@state/schemas/bookmark.schema.js').Bookmark[]>}
 */
export async function getBookmarks({ userId, onBackgroundUpdate = null } = {}) {
  if (!userId) return [];

  // If offline, return local cache
  if (!navigator.onLine) {
    log.info('Offline: loading bookmarks from local storage');
    const local = await getBookmarksOffline();
    return local.map((b) => createBookmark(userId, b.taleId, b));
  }

  return cacheService.fetchWithCache(
    `user:bookmarks:${userId}`,
    async () => {
      log.debug('Fetching bookmarks', { userId });
      return safeAsync(
        (async () => {
          const snap = await getDocs(refs.bookmarks(userId));
          if (snap.empty) {
            log.info('No bookmarks found', { userId });
            await syncBookmarksOffline([]);
            return [];
          }
          log.info(`Loaded ${snap.docs.length} bookmarks`, { userId });
          const bookmarks = snap.docs.map((d) => createBookmark(userId, d.id, d.data()));

          // Sync to offline storage
          await syncBookmarksOffline(
            bookmarks.map((b) => ({
              taleId: b.taleId,
              taleTitle: b.taleTitle,
              coverUrl: b.coverUrl,
              authorName: b.authorName,
              chapterCount: b.chapterCount,
              era: b.era,
              synopsis: b.synopsis,
              bookmarkedAt: b.bookmarkedAt?.seconds ? b.bookmarkedAt.seconds * 1000 : Date.now(),
            }))
          );

          return bookmarks;
        })(),
        {
          fallback: [],
          errorMessage: 'Failed to load bookmarks.',
          logContext: 'services.bookmark.getBookmarks',
        }
      );
    },
    {
      ttl: 2 * 60 * 1000,
      pageUrl: typeof window !== 'undefined' ? window.location.href : null,
      onBackgroundUpdate,
    }
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

  return cacheService.fetchWithCache(
    `user:bookmark:${userId}:${taleId}`,
    async () => {
      log.debug('Checking bookmark status', { userId, taleId });
      return safeAsync(
        (async () => {
          const { getDoc } = await import('@fb/index.js');
          const snap = await getDoc(refs.bookmark(userId, taleId));
          const exists = snap.exists();
          log.debug('Bookmark status resolved', { userId, taleId, exists });
          return exists;
        })(),
        {
          fallback: false,
          logContext: 'services.bookmark.isBookmarked',
        }
      );
    },
    { ttl: 2 * 60 * 1000 }
  );
}
