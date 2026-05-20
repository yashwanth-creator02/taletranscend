// src/services/resonance.service.js
import { db, auth } from '@fb/index.js';
import { 
  doc, 
  updateDoc, 
  increment, 
  setDoc, 
  getDoc,
  deleteDoc,
  collection
} from 'firebase/firestore';

/**
 * Toggles "Soul Resonance" (like) for a tale.
 * Updates both the global resonance count and user-specific status.
 * 
 * @param {string} taleId 
 * @returns {Promise<{ active: boolean, count: number }>} New state
 */
export async function toggleResonance(taleId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const taleRef = doc(db, 'tales', taleId);
  const resonanceRef = doc(db, 'users', user.uid, 'resonances', taleId);
  
  const resonanceSnap = await getDoc(resonanceRef);
  const isActive = resonanceSnap.exists();

  if (isActive) {
    // Decouple resonance
    await deleteDoc(resonanceRef);
    await updateDoc(taleRef, {
      resonanceCount: increment(-1)
    });
  } else {
    // Establish resonance
    await setDoc(resonanceRef, {
      at: new Date().toISOString()
    });
    await updateDoc(taleRef, {
      resonanceCount: increment(1)
    });
  }

  // Get fresh count
  const updatedTale = await getDoc(taleRef);
  return {
    active: !isActive,
    count: updatedTale.data()?.resonanceCount || 0
  };
}

/**
 * Checks if the current user has resonance with a tale.
 */
export async function getResonanceStatus(taleId) {
  const user = auth.currentUser;
  if (!user) return false;
  
  const resonanceRef = doc(db, 'users', user.uid, 'resonances', taleId);
  const snap = await getDoc(resonanceRef);
  return snap.exists();
}
