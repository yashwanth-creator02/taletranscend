// src/pages/contribution/cloud.js
// Saves the current tale draft to Firestore under the authenticated user's drafts.

import { auth, db, doc, setDoc, serverTimestamp, appId } from '@fb/index.js';
import { state } from './state.js';

/**
 * Persists the current tale draft to Firestore.
 * Uses a fixed document ID of 'current' to represent the active working draft.
 * Silently exits if the user is not authenticated.
 */
export async function saveToCloud() {
  if (!auth.currentUser) return;

  const taleTitle = document.getElementById('tale-title').value;

  // Draft is stored under the user's private drafts collection
  const ref = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid, 'drafts', 'current');

  await setDoc(
    ref,
    {
      title: taleTitle,
      chapters: state.chapters,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const status = document.getElementById('stat-status');
  if (status) status.textContent = 'Saved to Cloud';
}
