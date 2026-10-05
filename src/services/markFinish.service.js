// src/services/markFinish.service.js
// Marks a tale as fully finished in Firestore and local storage.
// Sets scrollPercent to 100 on all chapter progress documents and
// updates the tale-level progress document with status and timestamps.

import { getDoc, getDocs, writeBatch, serverTimestamp, refs, db, auth } from '@fb/index.js';
import { appState } from '@state/index.js';
import { markAllChaptersRead } from '@services/reader/localProgress.service.js';
import { cacheService } from '@services/cache.service.js';
import { createLogger } from '@/utils';

const log = createLogger('MarkFinishService');

/**
 * Marks a tale as finished for a given user.
 *
 * Flow:
 *   1. Resolves active user ID.
 *   2. Fetches tale metadata (chapterCount, title, coverUrl).
 *   3. Writes scrollPercent: 100 for all chapters (0 to chapterCount - 1) via writeBatch.
 *   4. Writes tale-level progress document with status='finished', timestamps, and metadata.
 *   5. Updates local storage reader progress so local/offline views are immediately 100%.
 *   6. Invalidates progress and tale caches.
 *
 * @param {Object} params
 * @param {string} [params.userId]
 * @param {string} params.taleId
 */
export async function markTaleFinished({ userId, taleId }) {
  const uid = userId || auth?.currentUser?.uid || appState?.userId;
  if (!uid || !taleId) return;

  log.info('Marking tale as finished', { userId: uid, taleId });
  const progressRef = refs.progress(uid, taleId);

  // 1. Fetch tale metadata to get chapterCount, title, coverUrl
  let taleTitle = '';
  let coverUrl = '';
  let chapterCount = 0;
  try {
    log.debug('Fetching tale metadata for caching', { taleId });
    const taleSnap = await getDoc(refs.tale(taleId));
    if (taleSnap && typeof taleSnap.exists === 'function' && taleSnap.exists()) {
      const data = typeof taleSnap.data === 'function' ? taleSnap.data() : taleSnap;
      taleTitle = data?.title || '';
      coverUrl = data?.coverUrl || '';
      chapterCount = Number(data?.chapterCount) || 0;
      log.debug('Tale metadata resolved', { taleTitle, chapterCount });
    }
  } catch (err) {
    log.warn('Non-critical metadata fetch failed', err);
  }

  // 2. Query any existing chapter progress documents
  log.debug('Retrieving existing chapter progress documents');
  const existingDocIds = new Set();
  try {
    const existingChaptersSnap = await getDocs(refs.progressChapters(uid, taleId));
    if (existingChaptersSnap && !existingChaptersSnap.empty) {
      existingChaptersSnap.forEach((docSnap) => {
        existingDocIds.add(docSnap.id);
      });
    }
  } catch (err) {
    log.warn('Could not query existing progress chapters', err);
  }

  // If chapterCount is still 0, check existing docs count or public chapters collection
  if (chapterCount <= 0 && existingDocIds.size > 0) {
    chapterCount = existingDocIds.size;
  }
  if (chapterCount <= 0) {
    try {
      const publicChaptersSnap = await getDocs(refs.chapters(taleId));
      if (publicChaptersSnap && !publicChaptersSnap.empty) {
        chapterCount = publicChaptersSnap.size || publicChaptersSnap.docs?.length || 0;
      }
    } catch (err) {
      log.warn('Could not query public chapters count', err);
    }
  }
  if (chapterCount <= 0) {
    chapterCount = 1;
  }

  // 3. Batch update all chapters to 100% and update tale progress document
  const batch = writeBatch(db);

  // Set all chapters 0 to chapterCount - 1
  for (let i = 0; i < chapterCount; i++) {
    const chRef = refs.progressChapter(uid, taleId, i);
    batch.set(
      chRef,
      {
        scrollPercent: 100,
        lastCharacterOffset: 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Also ensure any existing chapter progress docs beyond chapterCount are set to 100%
  for (const docId of existingDocIds) {
    const numericId = Number(docId);
    if (isNaN(numericId) || numericId >= chapterCount) {
      const chRef = refs.progressChapter(uid, taleId, docId);
      batch.set(
        chRef,
        {
          scrollPercent: 100,
          lastCharacterOffset: 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  // Ensure tale-level progress document is set to finished
  batch.set(
    progressRef,
    {
      status: 'finished',
      finishedAt: serverTimestamp(),
      lastReadAt: serverTimestamp(),
      taleTitle,
      coverUrl,
      chapterCount,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  // 4. Update local storage reader progress so local/offline views are immediately in sync
  try {
    markAllChaptersRead({ userId: uid, taleId, chapterCount });
  } catch (err) {
    log.warn('Could not update local chapters progress', err);
  }

  // 5. Invalidate caches
  cacheService.invalidateProgress(uid, taleId);
  cacheService.invalidateTale(taleId);
  cacheService.invalidateTales();

  log.info('Tale successfully marked as finished in backend and local store', {
    userId: uid,
    taleId,
    chapterCount,
  });
}
