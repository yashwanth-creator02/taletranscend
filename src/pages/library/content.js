// src/pages/library/content.js
// Manages real-time subscription to the public tales collection.
// Normalizes every incoming document through createTale before storing.

import { onSnapshot, query, where, refs } from '@fb/index.js';
import { createTale } from '@state/index.js';
import { libraryState } from './state.js';

let _unsubscribe = null;

/**
 * Subscribes to real-time updates for published community tales.
 * Normalizes all documents through createTale before storing in libraryState.
 * Guards against duplicate listeners on hot reload.
 *
 * @param {(tales: import('@state/schemas/tale.schema.js').Tale[]) => void} onUpdate
 * @param {(err: Error) => void} onError
 */
export function subscribeToTales(onUpdate, onError) {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
  const q = query(refs.tales(), where('status', '==', 'published'));

  _unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const tales = snapshot.docs.map((d) => createTale(d.id, d.data()));
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
