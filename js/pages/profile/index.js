import { db, auth, appId, doc, onSnapshot, setDoc } from '@core/firebase/index.js';
import { updateProfileUI, showNotification } from './ui.js';
export * from './ui.js';
let unsubscribe = null;

/**
 * Starts real-time synchronization
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
      console.error('Sync Error:', error);
      showNotification('Sync failed. Check connection.', 'error');
    }
  );
}

/**
 * Saves profile data to Firestore
 */
export async function saveProfile() {
  if (!auth.currentUser) {
    showNotification('You must be logged in to save.', 'error');
    return;
  }

  const name = document.getElementById('input-name')?.value.trim() || '';
  const bio = document.getElementById('input-bio')?.value.trim() || '';

  const ref = doc(db, 'artifacts', appId, 'users', auth.currentUser.uid);

  try {
    await setDoc(ref, { name, bio }, { merge: true });
    // Notification is handled in the UI form submit listener
  } catch (error) {
    console.error('Save Error:', error);
    showNotification('Failed to save profile.', 'error');
  }
}
