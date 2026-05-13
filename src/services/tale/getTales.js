// src/services/tale/getTales.js
// Fetches all community tales from Firestore.
// Used by the library and shelf pages to populate tale listings.

import { db, getDocs, collection, PATHS } from '@fb/index.js';

/**
 * Retrieves all community tales for this application from Firestore.
 * Each returned object includes the Firestore document ID as the id field.
 *
 * @returns {Promise<Array<Object>>} Array of tale objects, empty array if none exist
 */
export async function getTales() {
  const talesCol = collection(db, PATHS.publicTales());
  const snap = await getDocs(talesCol);

  return snap.empty ? [] : snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
