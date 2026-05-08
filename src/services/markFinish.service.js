// src/services/markFinish.service.js
// Marks a tale as fully finished in Firestore.
// Sets scrollPercent to 100 on all chapter documents and updates the tale status.

import {
  db,
  appId,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
} from '@firebase/index.js';

/* ================= Firestore Structure Reference =================
artifacts (collection)
 └─ {appId} (document)
     └─ users (collection)
         └─ {userId} (document)
             └─ readerProgress (collection)
                 └─ {taleId} (document)
                     ├─ status
                     ├─ finishedAt
                     └─ chapters (subcollection)
                         └─ {chapterIndex} (document)
                             └─ scrollPercent
==================================================================== */

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
  if (!userId || !taleId) return;

  const taleRef = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);
  const snap = await getDoc(taleRef);

  // Create the parent tale progress document if it does not exist yet
  if (!snap.exists()) {
    await setDoc(taleRef, {
      status: 'finished',
      finishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  // Fetch all chapter documents in the subcollection
  const chaptersRef = collection(
    db,
    'artifacts',
    appId,
    'users',
    userId,
    'readerProgress',
    taleId,
    'chapters'
  );
  const chaptersSnap = await getDocs(chaptersRef);

  // Batch update all chapters to scrollPercent 100 in a single write
  if (!chaptersSnap.empty) {
    const batch = writeBatch(db);
    chaptersSnap.forEach((chapterDoc) => {
      batch.update(chapterDoc.ref, { scrollPercent: 100 });
    });
    await batch.commit();
  }

  // Update tale-level status and finish timestamp
  await updateDoc(taleRef, {
    status: 'finished',
    finishedAt: serverTimestamp(),
  });
}
