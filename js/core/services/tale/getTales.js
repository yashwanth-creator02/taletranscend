import { db, appId, getDocs, collection } from '../../firebase/index.js';

/**
 * Retrieves all tales recorded in the database.
 * Returns an array of objects containing the taleId and metadata.
 */
export async function getTales() {
  const ref = collection(db, 'artifacts', appId, 'public', 'data', 'community_tales');
  const snap = await getDocs(ref);

  return snap.empty ? [] : snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
