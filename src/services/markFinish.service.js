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

  const progressRef = refs.progress(userId, taleId);
  const progressSnap = await getDoc(progressRef);

  // Optionally fetch tale metadata to cache taleTitle on the progress doc
  let taleTitle = '';
  let coverUrl  = '';
  try {
    const taleSnap = await getDoc(refs.tale(taleId));
    if (taleSnap.exists()) {
      taleTitle = taleSnap.data().title   || '';
      coverUrl  = taleSnap.data().coverUrl || '';
    }
  } catch {
    // Non-critical — proceed without cached fields
  }

  // Create progress document if it does not exist yet
  if (!progressSnap.exists()) {
    await setDoc(progressRef, {
      status:          'finished',
      finishedAt:      serverTimestamp(),
      lastReadAt:      serverTimestamp(),
      totalReadTimeMs: 0,
      taleTitle,
      coverUrl,
      createdAt:       serverTimestamp(),
      updatedAt:       serverTimestamp(),
    });
  }

  // Mark all saved chapter progress documents as fully read
  const chaptersSnap = await getDocs(refs.progressChapters(userId, taleId));

  if (!chaptersSnap.empty) {
    const batch = writeBatch(db);
    chaptersSnap.forEach((chapterDoc) => {
      batch.update(chapterDoc.ref, {
        scrollPercent:       100,
        lastCharacterOffset: 0,
        updatedAt:           serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // Ensure tale-level progress is marked finished
  await updateDoc(progressRef, {
    status:     'finished',
    finishedAt: serverTimestamp(),
    lastReadAt: serverTimestamp(),
    taleTitle,
    coverUrl,
    updatedAt:  serverTimestamp(),
  });
}
