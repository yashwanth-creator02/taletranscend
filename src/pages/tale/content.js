// src/pages/tale/content.js
// Fetches tale data and chapter list from Firestore.
// Falls back to the user's draft if the public tale is not found.

import { getDoc, getDocs, refs } from '@fb/index.js';
import { createTale, createChapter } from '@state/index.js';

/**
 * Loads a tale from Firestore.
 * First checks the public tales collection.
 * Falls back to the user's private drafts if not found publicly.
 *
 * @param {string} taleId
 * @param {Object} user - Authenticated Firebase user object
 * @returns {Promise<import('@state/schemas/tale.schema.js').Tale|null>}
 */
export async function loadTale(taleId, user) {
  if (!taleId) return null;

  const publicSnap = await getDoc(refs.tale(taleId));

  if (publicSnap.exists()) {
    return createTale(publicSnap.id, publicSnap.data());
  }

  if (!user?.uid) return null;

  // Fall back to the user's private draft
  const draftSnap = await getDoc(refs.draft(user.uid, taleId));

  if (!draftSnap.exists()) return null;

  return createTale(draftSnap.id, draftSnap.data());
}

/**
 * Loads all chapters for a tale, sorted by chapterNum ascending.
 *
 * @param {string} taleId
 * @returns {Promise<import('@state/schemas/tale.schema.js').Chapter[]>}
 */
export async function loadChapters(taleId) {
  if (!taleId) return [];

  const snapshot = await getDocs(refs.chapters(taleId));

  return snapshot.docs
    .map((snap) => createChapter(snap.id, snap.data()))
    .sort((a, b) => a.chapterNum - b.chapterNum);
}
