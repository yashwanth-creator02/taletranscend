import { db, appId, getDocs, collection } from '../../firebase/index.js';

/**
 * Retrieves all community tales stored in Firestore for this app.
 *
 * Each tale object includes its document ID as `id` along with metadata fields.
 *
 * @returns {Promise<Array<Object>>} Array of tale objects, empty if none exist
 */
export async function getTales() {
  // Reference the collection of all community tales
  const ref = collection(db, 'artifacts', appId, 'public', 'data', 'community_tales');

  // Fetch all documents in the collection
  const snap = await getDocs(ref);

  // Map documents to plain JS objects with id included, or return empty array
  return snap.empty ? [] : snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
