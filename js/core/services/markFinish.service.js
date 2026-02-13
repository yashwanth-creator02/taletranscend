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
} from '../firebase/index.js';

export async function markTaleFinished({ userId, taleId }) {
  if (!userId || !taleId) return;

  const taleRef = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);
  const snap = await getDoc(taleRef);

  // =========================
  // Ensure parent document exists
  // =========================
  if (!snap.exists()) {
    await setDoc(taleRef, {
      status: 'finished',
      finishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  // =========================
  // Update ALL chapters sub collection
  // =========================
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

  if (!chaptersSnap.empty) {
    const batch = writeBatch(db);

    chaptersSnap.forEach((chapterDoc) => {
      batch.update(chapterDoc.ref, {
        scrollProgress: 100,
      });
    });

    await batch.commit();
  }

  // =========================
  // Mark tale as finished
  // =========================
  await updateDoc(taleRef, {
    status: 'finished',
    finishedAt: serverTimestamp(),
  });
}
