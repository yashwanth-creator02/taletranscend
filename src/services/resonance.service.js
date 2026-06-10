// src/services/resonance.service.js
// Manages tale reactions (Soul Resonance) stored in Firestore.
// Reactions live at tales/{taleId}/reactions/{userId} per the finalized schema.
// Reaction count on the tale document is synced by the onReactionCreate/Delete Cloud Function.

import {
  auth,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  refs,
} from '@fb/index.js';
import { safeCall, guardOffline, createLogger } from '@/utils';

const log = createLogger('ResonanceService');

/**
 * Toggles a user's Soul Resonance (reaction) on a tale.
 * Creates or deletes the reaction document and optimistically updates
 * the tale's reactionCount via increment.
 *
 * @param {string} taleId
 * @returns {Promise<{ active: boolean, count: number, status?: string }>}
 */
export async function toggleResonance(taleId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  if (guardOffline()) return { status: 'error' };

  log.log('Toggling resonance', { userId: user.uid, taleId });
  return safeCall(
    (async () => {
      const reactionRef = refs.taleReaction(taleId, user.uid);
      const taleRef = refs.tale(taleId);

      const reactionSnap = await getDoc(reactionRef);
      const wasActive = reactionSnap.exists();

      if (wasActive) {
        // Remove reaction
        await deleteDoc(reactionRef);
        await updateDoc(taleRef, { reactionCount: increment(-1) });
      } else {
        // Add reaction
        await setDoc(reactionRef, {
          userId: user.uid,
          type: 'like',
          reactedAt: serverTimestamp(),
        });
        await updateDoc(taleRef, { reactionCount: increment(1) });
      }

      // Return the fresh count from the tale document
      const updatedSnap = await getDoc(taleRef);
      return {
        active: !wasActive,
        count: updatedSnap.data()?.reactionCount ?? 0,
      };
    })(),
    { status: 'error' },
    'Failed to update resonance.'
  );
}

/**
 * Checks whether the current user has reacted to a tale.
 *
 * @param {string} taleId
 * @returns {Promise<boolean>}
 */
export async function getResonanceStatus(taleId) {
  const user = auth.currentUser;
  if (!user) return false;

  return safeCall(
    (async () => {
      const snap = await getDoc(refs.taleReaction(taleId, user.uid));
      return snap.exists();
    })(),
    false,
    'Failed to check resonance status.',
    true // silent
  );
}
