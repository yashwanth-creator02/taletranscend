import {
  db,
  appId,
  doc,
  getDocs,
  deleteDoc,
  setDoc,
  collection,
  serverTimestamp,
} from '../firebase/index.js';

/* ================= Bookmarks Service ================= */

/**
 * Adds a tale to a user's private bookmark collection in Firestore.
 * Uses the taleId as the document ID for easy lookup and management.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the user
 * @param {string} params.taleId - ID of the tale to bookmark
 */
export async function addToBookmarks({ userId, taleId }) {
  if (!userId || !taleId) return;

  // Reference to the specific bookmark document
  const ref = doc(db, 'artifacts', appId, 'users', userId, 'bookmarks', taleId);

  // Set or merge the bookmark with timestamp
  await setDoc(
    ref,
    {
      bookmarkedAt: serverTimestamp(), // Track when the story was bookmarked
    },
    { merge: true }
  );
}

/**
 * Removes a tale from a user's private bookmark collection.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 */
export async function removeFromBookmarks({ userId, taleId }) {
  if (!userId || !taleId) return;

  const ref = doc(db, 'artifacts', appId, 'users', userId, 'bookmarks', taleId);

  // Delete the document representing the bookmark
  await deleteDoc(ref);
}

/**
 * Retrieves all bookmarked tales for a specific user.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @returns {Promise<Array<Object>>} Array of bookmarked tales, each containing id and metadata
 */
export async function getBookmarks({ userId }) {
  if (!userId) return [];

  // Reference to the user's bookmarks collection
  const ref = collection(db, 'artifacts', appId, 'users', userId, 'bookmarks');

  // Fetch all bookmarks
  const snap = await getDocs(ref);

  // Map Firestore documents to plain objects with ID included
  return snap.empty ? [] : snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
