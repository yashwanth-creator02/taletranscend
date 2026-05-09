// src/pages/profile/sync.js
// Manages real-time Firestore sync and save operations for the user profile.

import { db, auth, appId, doc, onSnapshot, setDoc, serverTimestamp, getDoc } from '@fb/index.js';

import { updateProfileUI, showNotification } from './ui.js';

export * from './ui.js';

// Holds the active Firestore listener unsubscribe function
let unsubscribe = null;

/**
 * Starts real-time synchronization of the user's profile from Firestore.
 * Replaces any existing listener before creating a new one.
 * Updates the profile UI whenever the Firestore document changes.
 *
 * @param {string} uid - Firebase Auth user ID
 */
export function startProfileSync(uid) {
  const ref = doc(db, 'artifacts', appId, 'users', uid);

  if (unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        updateProfileUI(snap.data());
      }
    },
    (error) => {
      console.error('Profile sync error:', error);
      showNotification('Failed to sync profile. Check your connection.', 'error');
    }
  );
}

/**
 * Saves the user's profile data to Firestore.
 * Adds a createdAt timestamp on first save.
 * Uses merge to preserve any existing fields not in this form.
 */
export async function saveProfile() {
  if (!auth.currentUser) {
    showNotification('You must be logged in to save.', 'error');
    return;
  }

  const ref = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid);
  const snap = await getDoc(ref);

  const data = {
    name: document.getElementById('input-name')?.value.trim() || '',
    bio: document.getElementById('input-bio')?.value.trim() || '',
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    data.createdAt = serverTimestamp();
  }

  try {
    await setDoc(ref, data, { merge: true });
  } catch (error) {
    console.error('Profile save error:', error);
    showNotification('Failed to save profile.', 'error');
  }
}
