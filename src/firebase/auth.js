// src/firebase/auth.js
// Firebase Authentication setup and initialization helper.
// Uses anonymous authentication only — custom token dead code has been removed.

import { getAuth, signOut, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import app from './app.js';

// Single shared Auth instance used across the entire application.
export const auth = getAuth(app);

/**
 * Initializes authentication for the application.
 * Signs in anonymously if no session exists, then fires onReady once a
 * valid user session is confirmed via the onAuthStateChanged listener.
 *
 * @param {(user: import('firebase/auth').User) => void} onReady
 */
export function initAuth(onReady) {
  // Register a state listener — fires on load and on every auth change.
  // This is the primary mechanism for notifying pages that auth is ready.
  onAuthStateChanged(auth, (user) => {
    if (user) onReady(user);
  });

  // Immediately attempt anonymous sign-in if no session exists.
  // Runs in parallel with the state listener to minimise auth latency.
  (async () => {
    if (auth.currentUser) return;
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.error('[auth] Anonymous sign-in failed:', err);
    }
  })();
}

export { onAuthStateChanged, signOut };
