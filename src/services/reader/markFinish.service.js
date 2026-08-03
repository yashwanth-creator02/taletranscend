// src/services/markFinish.service.js
// Marks a tale as fully finished in Firestore.
// Sets scrollPercent to 100 on all chapter progress documents and
// updates the tale-level progress document with status and timestamps.

import {
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  refs,
  db,
} from '@fb/index.js';
import { createLogger } from '@/utils';

const log = createLogger('MarkFinishService');

/**
 * Marks a tale as finished for a given user.
 *
 * Flow:
 *   1. Creates the tale progress document if it does not exist.
 *   2. Sets scrollPercent to 100 on all saved chapter progress documents.
 *   3. Updates tale-level progress: status='finished', finishedAt, lastReadAt.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 */
export async function markTaleFinished({ userId, taleId }) {
  if (!userId || !taleId) return;

  log.info('Marking tale as finished', { userId, taleId });
  const progressRef = refs.progress(userId, taleId);
  const progressSnap = await getDoc(progressRef);

  // Optionally fetch tale metadata to cache taleTitle on the progress doc
  let taleTitle = '';
  let coverUrl = '';
  try {
    log.debug('Fetching tale metadata for caching', { taleId });
    const taleSnap = await getDoc(refs.tale(taleId));
    if (taleSnap.exists()) {
      taleTitle = taleSnap.data().title || '';
      coverUrl = taleSnap.data().coverUrl || '';
      log.debug('Tale metadata resolved', { taleTitle });
    }
  } catch (err) {
    log.warn('Non-critical metadata fetch failed', err);
    // Non-critical — proceed without cached fields
  }

  // Create progress document if it does not exist yet
  if (!progressSnap.exists()) {
    log.info('Creating initial progress document');
    await setDoc(progressRef, {
      status: 'finished',
      finishedAt: serverTimestamp(),
      lastReadAt: serverTimestamp(),
      totalReadTimeMs: 0,
      taleTitle,
      coverUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Mark all saved chapter progress documents as fully read
  log.debug('Retrieving all chapter progress documents');
  const chaptersSnap = await getDocs(refs.progressChapters(userId, taleId));

  if (!chaptersSnap.empty) {
    log.info(`Updating ${chaptersSnap.docs.length} chapters to 100%`);
    const batch = writeBatch(db);
    chaptersSnap.forEach((chapterDoc) => {
      batch.update(chapterDoc.ref, {
        scrollPercent: 100,
        lastCharacterOffset: 0,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } else {
    log.info('No chapter progress documents found to update');
  }

  // Ensure tale-level progress is marked finished
  log.info('Updating tale-level status to finished');
  await updateDoc(progressRef, {
    status: 'finished',
    finishedAt: serverTimestamp(),
    lastReadAt: serverTimestamp(),
    taleTitle,
    coverUrl,
    updatedAt: serverTimestamp(),
  });
  log.info('Tale successfully marked as finished');
}
