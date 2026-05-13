// src/services/markFinish.service.js
// Marks a tale as fully finished in Firestore.
// Sets scrollPercent to 100 on all chapter documents and updates the tale status.

import {
  db,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  refs,
} from '@fb/index.js';

/**
 * Marks a tale as finished for a given user.
 * Creates the tale progress document if it does not exist,
 * then sets all chapter scroll positions to 100 and updates the status.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale to mark as finished
 */
export async function markTaleFinished({ userId, taleId }) {
  // Guard against invalid calls
  if (!userId || !taleId) return;

  // Main progress document reference
  const progressRef = refs.progress(userId, taleId);

  // Check whether the progress document already exists
  const progressSnap = await getDoc(progressRef);

  // First completion: create the document
  if (!progressSnap.exists()) {
    await setDoc(progressRef, {
      status: 'finished',
      finishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  // Fetch all saved chapter progress docs
  const chaptersRef = refs.progressChapters(userId, taleId);

  const chaptersSnap = await getDocs(chaptersRef);

  // Mark every chapter as fully read
  if (!chaptersSnap.empty) {
    const batch = writeBatch(db);

    chaptersSnap.forEach((chapterDoc) => {
      batch.update(chapterDoc.ref, {
        scrollPercent: 100,
      });
    });

    await batch.commit();
  }

  // Ensure the parent progress doc is marked finished
  await updateDoc(progressRef, {
    status: 'finished',
    finishedAt: serverTimestamp(),
  });
}
