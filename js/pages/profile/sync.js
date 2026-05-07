// js/pages/profile/sync.js
import {
  db,
  auth,
  appId,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getDoc,
} from '@core/firebase/index.js';

import { updateProfileUI, showNotification } from './ui.js';

export * from './ui.js';

/* ==================== Real-Time Profile Sync ==================== */

// Holds the current Firestore listener unsubscribe function
let unsubscribe = null;

/**
 * Starts real-time synchronization of the user's profile.
 * Updates the UI whenever Firestore data changes.
 *
 * @param {string} uid - Firebase Auth User ID
 */
export function startProfileSync(uid) {
  // Reference to user's Firestore document
  const ref = doc(db, 'artifacts', appId, 'users', uid);

  // Remove previous listener before creating a new one
  if (unsubscribe) unsubscribe();

  // Listen for real-time updates
  unsubscribe = onSnapshot(
    ref,

    // Success callback
    (snap) => {
      if (snap.exists()) {
        updateProfileUI(snap.data());
      }
    },

    // Error callback
    (error) => {
      console.error('Profile Sync Error:', error);

      showNotification('Failed to sync profile. Check your connection.', 'error');
    }
  );
}

/* ==================== Save Profile ==================== */

/**
 * Saves the user's profile data to Firestore.
 * Uses merge:true to preserve existing fields.
 */
export async function saveProfile() {
  // Ensure user is authenticated
  if (!auth.currentUser) {
    showNotification('You must be logged in to save.', 'error');
    return;
  }
  // Firestore document reference
  const ref = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid);
  const snap = await getDoc(ref);
  const data = {
    name: document.getElementById('input-name')?.value.trim() || '',

    bio: document.getElementById('input-bio')?.value.trim() || '',

    updatedAt: serverTimestamp(),
  };
  try {
    // Save profile data
    if (!snap.exists()) {
      data.createdAt = serverTimestamp();
    }

    await setDoc(ref, data, { merge: true });
  } catch (error) {
    console.error('Profile Save Error:', error);

    showNotification('Failed to save profile.', 'error');
  }
}
