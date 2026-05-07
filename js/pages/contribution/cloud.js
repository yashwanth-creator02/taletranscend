// js/pages/contribution/cloud.js

import { auth, db, doc, setDoc, serverTimestamp, appId } from '@core/firebase/index.js';
import { state } from './state.js';

/**
 * Saves the current tale draft to Firestore under the logged-in user's drafts.
 * Updates the title, chapters, and timestamp.
 */
export async function saveToCloud() {
  // Only save if the user is logged in
  if (!auth.currentUser) return;

  // Get the current tale title from the input field
  const taleTitle = document.getElementById('tale-title').value;

  // Firestore document reference for the current draft
  const ref = doc(
    db,
    'artifacts',
    appId, // App ID
    'users',
    auth.currentUser.uid, // Current user
    'drafts',
    'current' // Use a fixed ID for the current draft
  );

  // Save the draft to Firestore
  await setDoc(
    ref,
    {
      title: taleTitle, // Draft title
      chapters: state.chapters, // Current chapters from local state
      updatedAt: serverTimestamp(), // Server timestamp for last update
    },
    { merge: true } // Merge with any existing draft data
  );

  // Update UI status indicator
  const status = document.getElementById('stat-status');
  if (status) status.textContent = 'Saved to Cloud';
}
