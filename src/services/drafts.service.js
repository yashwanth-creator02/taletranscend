// src/services/drafts.service.js
// Fetches the user's tale drafts from Firestore.

import { db, appId, collection, getDocs } from '@fb/index.js';

/**
 * Retrieves all draft tales saved by the user.
 * Each draft includes its document ID as the id field.
 *
 * @param {string} userId - ID of the authenticated user
 * @returns {Promise<Array<Object>>} Array of draft objects
 */
export async function getUserDrafts(userId) {
  if (!userId) return [];

  const ref = collection(db, 'artifacts', appId, 'users', userId, 'drafts');
  const snap = await getDocs(ref);

  return snap.empty ? [] : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
