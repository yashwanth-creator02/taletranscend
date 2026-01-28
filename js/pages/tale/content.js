import { db, appId, doc, getDoc, collection, getDocs } from '@core/firebase/index.js';

/**
 * Load a tale from Firestore.
 *
 * First tries to fetch the public version of the tale.
 * If not found, checks the user's draft version.
 *
 * @param {string} taleId - ID of the tale to fetch
 * @param {object} user - Current authenticated user
 * @returns {object|null} Tale data if found, otherwise null
 */
export async function loadTale(taleId, user) {
  // Reference to the public tale document
  const publicRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_tales', taleId);
  const snap = await getDoc(publicRef);

  // Return public tale data if it exists
  if (snap.exists()) return snap.data();

  // Reference to the user's draft of the tale
  const draftRef = doc(db, 'artifacts', appId, 'users', user.uid, 'drafts', taleId);
  const draftSnap = await getDoc(draftRef);

  // Return draft data if it exists, otherwise null
  return draftSnap.exists() ? draftSnap.data() : null;
}

/**
 * Load all chapters for a specific tale.
 *
 * Fetches chapters from the public tale collection, sorts them by chapter number.
 *
 * @param {string} taleId - ID of the tale whose chapters to fetch
 * @returns {Array} Array of chapter objects sorted by chapterNum
 */
export async function loadChapters(taleId) {
  // Reference to the chapters subcollection for the tale
  const ref = collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'community_tales',
    taleId,
    'chapters'
  );
  const snap = await getDocs(ref);

  // Map documents to objects with their ID and data, then sort by chapter number
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0));
}
