// src/pages/library/content.js
// Manages real-time subscription to the community tales collection.

import { onSnapshot, refs } from '@fb/index.js';
import { libraryState } from './state.js';

let _unsubscribe = null;

/**
 * Subscribes to real-time updates for the public community tales collection.
 * Stores the full tales array in libraryState.allTales on every update.
 *
 * @param {(tales: Array<Object>) => void} onUpdate - Called with the fresh tales array
 * @param {(err: Error) => void}           onError  - Called on Firestore error
 */
export function subscribeToTales(onUpdate, onError) {
  // Guard against duplicate listeners on hot reload
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  _unsubscribe = onSnapshot(
    refs.tales(),
    (snapshot) => {
      const tales = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      libraryState.allTales = tales;
      onUpdate(tales);
    },
    (err) => {
      console.error('[library] subscribeToTales error:', err.code, err.message);
      onError(err);
    }
  );
}

/**
 * Stops the active Firestore subscription.
 * Call on page unload to prevent memory leaks.
 */
export function stopTalesSubscription() {
  _unsubscribe?.();
  _unsubscribe = null;
}
