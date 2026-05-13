// src/pages/library/content.js
// Manages real-time subscription to the community tales collection in Firestore.

import { onSnapshot, auth, refs } from '@fb/index.js';

/* ─────────────────────────────────────────────
   Listener State
   ───────────────────────────────────────────── */

// Holds the active Firestore listener unsubscribe function
let unsubscribe = null;

/* ─────────────────────────────────────────────
   Real-time Tales Subscription
   ───────────────────────────────────────────── */

/**
 * Subscribes to real-time updates for the public community tales collection.
 * Calls onUpdate with the latest tales array on every change.
 * Calls onError if a permission or network error occurs.
 *
 * @param {Function} onUpdate - Callback invoked with an array of tale objects
 * @param {Function} onError - Callback invoked with the Firestore error
 */
export function subscribeToTales(onUpdate, onError) {
  // Prevent duplicate listeners during hot reloads
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  // Public tales collection reference
  const talesRef = refs.tales();

  unsubscribe = onSnapshot(
    talesRef,

    (snapshot) => {
      // Normalize Firestore documents
      const tales = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Push latest tales into the UI
      onUpdate(tales);
    },

    (error) => {
      console.error('subscribeToTales error:', error.code, error.message);

      console.error('Auth status at failure:', auth.currentUser ? 'logged in' : 'logged out');

      onError(error);
    }
  );
}

/**
 * Stops the active real-time subscription to the tales collection.
 * Should be called when the page unloads to prevent memory leaks.
 */
export function stopTalesSubscription() {
  unsubscribe?.();
  unsubscribe = null;
}
