// src/services/tale/getTales.js
// Fetches all community tales from Firestore.
// Used by the library and shelf pages to populate tale listings.

import { getDocs, refs } from '@fb/index.js';

/**
 * Retrieves all community tales for this application from Firestore.
 * Each returned object includes the Firestore document ID as the id field.
 *
 * @returns {Promise<Array<Object>>} Array of tale objects, empty array if none exist
 */
export async function getTales() {
  const snap = await getDocs(refs.tales());
  return snap.empty ? [] : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
