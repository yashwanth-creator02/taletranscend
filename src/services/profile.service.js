// src/services/profile.service.js
// Fetches profile-specific data: reading history and published tales.

import { db, appId, collection, getDocs, doc, getDoc, query, where, PATHS } from '@fb/index.js';

import { readStorage, getTotalReadTime } from '@services/index.js';

/**
 * Fetches the tales the user has started reading, sorted by most recently read.
 * Combines localStorage progress data with Firestore tale metadata.
 *
 * @param {string} userId - ID of the authenticated user
 * @returns {Promise<Array<Object>>} Array of tale objects with progress data
 */
export async function getContinueReading(userId) {
  if (!userId) return [];

  const store = readStorage();
  const userProgress = store[userId];

  if (!userProgress) return [];

  // Get all taleIds the user has progress for
  const taleIds = Object.keys(userProgress).filter(
    (id) => Object.keys(userProgress[id]?.chapters || {}).length > 0
  );

  if (!taleIds.length) return [];

  // Fetch tale metadata for each taleId in parallel
  const tales = await Promise.all(
    taleIds.map(async (taleId) => {
      try {
        const ref = doc(db, PATHS.publicTale(taleId));
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;

        const data = snap.data();
        const chapters = userProgress[taleId]?.chapters || {};

        // Find the most recently read chapter
        const lastChapterEntry = Object.entries(chapters).sort(
          (a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)
        )[0];

        const lastChapterIndex = lastChapterEntry ? Number(lastChapterEntry[0]) : 0;
        const lastScrollPercent = lastChapterEntry?.[1]?.scrollPercent || 0;
        const lastUpdatedAt = lastChapterEntry?.[1]?.updatedAt || 0;

        // Calculate overall progress
        const chapterCount = data.chapterCount || 1;
        const progressUnits = Object.values(chapters).reduce(
          (acc, ch) => acc + Math.min(100, Math.max(0, ch.scrollPercent || 0)) / 100,
          0
        );
        const percent = Math.min(100, Math.round((progressUnits / chapterCount) * 100));

        return {
          id: taleId,
          ...data,
          lastChapterIndex,
          lastScrollPercent,
          lastUpdatedAt,
          percent,
        };
      } catch {
        return null;
      }
    })
  );

  // Filter nulls and sort by most recently read
  return tales
    .filter(Boolean)
    .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
    .slice(0, 5); // Show max 5 in continue reading
}

/**
 * Fetches all tales published by the user from community_tales.
 *
 * @param {string} userId - ID of the authenticated user
 * @returns {Promise<Array<Object>>} Array of published tale objects
 */
export async function getUserPublishedTales(userId) {
  if (!userId) return [];

  const talesCol = collection(db, PATHS.publicTales());

  const q = query(talesCol, where('authorId', '==', userId));
  const snap = await getDocs(q);

  return snap.empty ? [] : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
