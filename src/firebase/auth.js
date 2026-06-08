// src/firebase/auth.js
// Firebase Authentication setup and initialization helper.
// Uses anonymous authentication only.

import {
  getAuth,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
} from 'firebase/auth';
import app from './app.js';

export const auth = getAuth(app);

/**
 * Initializes authentication for the application.
 * Reuses an existing anonymous session if one exists in the browser;
 * otherwise creates a new one. Guarantees onReady fires exactly once.
 *
 * @param {(user: import('firebase/auth').User) => void} onReady
 */
export function initAuth(onReady) {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe(); // Prevent duplicate calls if auth state flips again
    if (user) {
      onReady(user);
    } else {
      signInAnonymously(auth)
        .then((credential) => onReady(credential.user))
        .catch((err) => console.error('[auth] Anonymous sign-in failed:', err));
    }
  });
}

/**
 * Signs in the user with Google.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Upgrades the current anonymous user to a Google account.
 * Links the current anonymous session with a Google identity.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function upgradeAnonymousToGoogle() {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in.');
  }
  const provider = new GoogleAuthProvider();
  const result = await linkWithPopup(auth.currentUser, provider);
  return result.user;
}

export { onAuthStateChanged, signOut, signInAnonymously };
