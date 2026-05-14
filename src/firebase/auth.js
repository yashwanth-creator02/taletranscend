// src/firebase/auth.js
// Firebase Authentication setup and initialization helper.
// Supports custom token, anonymous auth, and auth state listening.

import {
  signOut,
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import app from './app.js';
// Single shared Auth instance used across the entire application.
export const auth = getAuth(app);

/**
 * Initializes authentication for the application.
 *
 * Authentication priority:
 *  1. Custom token (injected by server-side bootstrapping if available)
 *  2. Anonymous authentication (fallback for all other cases)
 *
 * The onReady callback fires once a valid user session exists,
 * either from a restored session or a fresh sign-in.
 *
 * @param {Function} onReady - Callback invoked with the authenticated user object
 */
export function initAuth(onReady) {
  // Register a state listener that fires on load and on every auth change.
  // This is the primary mechanism for notifying pages that auth is ready.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onReady(user);
    }
  });

  // Immediately attempt sign-in if no session exists.
  // Runs in parallel with the state listener to minimize auth latency.
  (async () => {
    if (auth.currentUser) return;

    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        // Use server-provided token when available
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        // Fall back to anonymous auth for unauthenticated visitors
        await signInAnonymously(auth);
      }
    } catch (err) {
      console.error('Auth initialization failed:', err);
    }
  })();
}

export { onAuthStateChanged, signOut };
