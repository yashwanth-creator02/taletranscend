import { db, appId, doc, getDocs, deleteDoc, setDoc, collection } from '../firebase/index.js';

/**
 * Adds a story to the user's private bookmark collection.
 * Uses the taleId as the document name for easy lookup.
 */
export async function addToBookmarks({ userId, taleId }) {
  if (!userId || !taleId) return;

  const ref = doc(db, 'artifacts', appId, 'users', userId, 'bookmarks', taleId);

  await setDoc(
    ref,
    {
      bookmarkedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Removes a story from the user's private bookmark collection.
 */
export async function removeFromBookmarks({ userId, taleId }) {
  if (!userId || !taleId) return;

  const ref = doc(db, 'artifacts', appId, 'users', userId, 'bookmarks', taleId);

  await deleteDoc(ref);
}

/**
 * Retrieves all bookmarked stories for a specific user.
 * Returns an array of objects containing the taleId and metadata.
 */
export async function getBookmarks({ userId }) {
  if (!userId) return [];

  const ref = collection(db, 'artifacts', appId, 'users', userId, 'bookmarks');
  const snap = await getDocs(ref);

  return snap.empty ? [] : snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
