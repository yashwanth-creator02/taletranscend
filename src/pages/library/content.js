// src/pages/library/content.js
// Manages real-time subscription to the community tales collection in Firestore.

import { db, appId, collection, onSnapshot, auth } from '@fb/index.js';

// Holds the active Firestore listener unsubscribe function
let unsubscribe = null;

/**
 * Subscribes to real-time updates for the public community tales collection.
 * Calls onUpdate with the latest tales array on every change.
 * Calls onError if a permission or network error occurs.
 *
 * @param {Function} onUpdate - Callback invoked with an array of tale objects
 * @param {Function} onError - Callback invoked with the Firestore error
 */
export function subscribeToTales(onUpdate, onError) {
  const talesCol = collection(db, 'artifacts', appId, 'public', 'data', 'community_tales');

  unsubscribe = onSnapshot(
    talesCol,
    (snap) => {
      const tales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  if (unsubscribe) unsubscribe();
}
