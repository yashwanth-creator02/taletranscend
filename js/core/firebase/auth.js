import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import app from './app.js';

// Initialize and export the Firebase Auth instance
// This single instance is shared across the application
export const auth = getAuth(app);

/**
 * Initializes authentication for the application.
 * Supports:
 *  - Custom token authentication (server-provided)
 *  - Anonymous authentication (fallback)
 *  - Auth state synchronization via listener
 *
 * @param {Function} onReady - Callback invoked once a user is authenticated
 */
export function initAuth(onReady) {
  // 1. Register an authentication state listener
  // This fires on initial load and whenever auth state changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Notify the application that authentication is ready
      onReady(user);
    }
  });

  // 2. Immediate authentication check using an IIFE
  // Ensures the user is signed in as early as possible
  (async () => {
    // Exit early if a user session already exists
    if (auth.currentUser) return;

    try {
      // Prefer custom token authentication when available
      // Commonly injected by server-side rendering or secure bootstrapping
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        // Fallback to anonymous authentication
        await signInAnonymously(auth);
      }
    } catch (err) {
      // Log authentication failures for debugging and monitoring
      console.error('Core Auth initialization failed:', err);
    }
  })();
}
