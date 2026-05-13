// src/services/profile.service.js
// Fetches profile-specific data: reading history, published tales, and drafts.

import {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  PATHS,
} from '@fb/index.js';

import { readStorage } from '@services/index.js';

/* ─────────────────────────────────────────────
   Continue Reading
   ───────────────────────────────────────────── */

/**
 * Fetches the tales the user has started reading, sorted by most recently read.
 * Combines localStorage progress data with Firestore tale metadata.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getContinueReading(userId) {
  if (!userId) return [];

  const store = readStorage();
  const userProgress = store[userId];

  if (!userProgress) return [];

  const taleIds = Object.keys(userProgress).filter(
    (id) => Object.keys(userProgress[id]?.chapters || {}).length > 0
  );

  if (!taleIds.length) return [];

  const tales = await Promise.all(
    taleIds.map(async (taleId) => {
      try {
        const ref = doc(db, PATHS.publicTale(taleId));
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;

        const data = snap.data();
        const chapters = userProgress[taleId]?.chapters || {};

        const lastChapterEntry = Object.entries(chapters).sort(
          (a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)
        )[0];

        const lastChapterIndex = lastChapterEntry ? Number(lastChapterEntry[0]) : 0;
        const lastUpdatedAt = lastChapterEntry?.[1]?.updatedAt || 0;

        const chapterCount = data.chapterCount || 1;
        const progressUnits = Object.values(chapters).reduce(
          (acc, ch) => acc + Math.min(100, Math.max(0, ch.scrollPercent || 0)) / 100,
          0
        );
        const percent = Math.min(100, Math.round((progressUnits / chapterCount) * 100));

        return { id: taleId, ...data, lastChapterIndex, lastUpdatedAt, percent };
      } catch {
        return null;
      }
    })
  );

  return tales
    .filter(Boolean)
    .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
    .slice(0, 5);
}

/* ─────────────────────────────────────────────
   Published Tales
   ───────────────────────────────────────────── */

/**
 * Fetches all published tales authored by the user from community_tales.
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getUserPublishedTales(userId) {
  if (!userId) return [];

  const q = query(collection(db, PATHS.publicTales()), where('authorId', '==', userId));

  const snap = await getDocs(q);
  return snap.empty ? [] : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ─────────────────────────────────────────────
   Drafts
   ───────────────────────────────────────────── */

/**
 * Fetches all drafts for the user, ordered by most recently updated.
 * Returns a lightweight list (no chapter content — just metadata).
 *
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getUserDrafts(userId) {
  if (!userId) return [];

  try {
    const draftsCol = collection(db, PATHS.drafts(userId));
    const snap = await getDocs(draftsCol);

    if (snap.empty) return [];

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds ?? 0;
        const bTime = b.updatedAt?.seconds ?? 0;
        return bTime - aTime;
      });
  } catch (err) {
    console.error('[profile.service] getUserDrafts error:', err);
    return [];
  }
}
