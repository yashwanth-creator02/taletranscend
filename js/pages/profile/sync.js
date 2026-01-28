import { db, auth, appId, doc, onSnapshot, setDoc } from '@core/firebase/index.js';
import { updateProfileUI } from './ui.js';

/* ==================== Real-Time Profile Sync ==================== */

// Holds the unsubscribe function for Firestore listener
let unsubscribe = null;

/**
 * Starts real-time synchronization of a user's profile.
 * Updates the UI whenever the profile document changes in Firestore.
 *
 * @param {string} uid - User ID
 */
export function startProfileSync(uid) {
  const ref = doc(db, 'artifacts', appId, 'users', uid);

  // Unsubscribe previous listener if any
  if (unsubscribe) unsubscribe();

  // Listen for changes on the user's profile document
  unsubscribe = onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      // Update the UI with the latest profile data
      updateProfileUI(snap.data());
    }
  });
}

/* ==================== Save Profile ==================== */

/**
 * Saves the current profile data (name and bio) to Firestore.
 * Uses merge to preserve any other existing fields in the document.
 */
export async function saveProfile() {
  // Only allow saving if user is logged in
  if (!auth.currentUser) return;

  // Get values from input fields
  const name = document.getElementById('input-name')?.value || '';
  const bio = document.getElementById('input-bio')?.value || '';

  const ref = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid);

  // Save profile data to Firestore (merge with existing data)
  await setDoc(ref, { name, bio }, { merge: true });
}
