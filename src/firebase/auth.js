// src/firebase/auth.js
// Firebase Authentication setup and initialization helper.
// Uses anonymous authentication only.

import { getAuth, signOut, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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

export { onAuthStateChanged, signOut };
