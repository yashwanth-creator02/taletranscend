// src/services/reader/cloudProgress.service.js
// Handles syncing and retrieving reader progress from Firestore.
// Chapter progress is stored in a subcollection for efficient per-chapter reads.

import { getDoc, setDoc, serverTimestamp, getDocs, PATHS, refs } from '@fb/index.js';

import { PROGRESS_SYNC_DELAY_MS } from '@config/app.config.js';

/* ================= Firestore Structure Reference =================
artifacts (collection)
 └─ {appId} (document)
     └─ users (collection)
         └─ {userId} (document)
             └─ readerProgress (collection)
                 └─ {taleId} (document)
                     ├─ totalReadTimeMs
                     └─ chapters (subcollection)
                         └─ {chapterIndex} (document)
                             ├─ scrollPercent
                             └─ updatedAt
==================================================================== */

/**
 * Syncs a user's chapter scroll progress and total read time to Firestore.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale being read
 * @param {number} params.chapterIndex - Index of the current chapter
 * @param {number} params.scrollPercent - Current scroll position as a percentage
 * @param {number} params.totalReadTimeMs - Cumulative read time in milliseconds
 */
export async function syncChapterProgressToCloud({
  userId,
  taleId,
  chapterIndex,
  scrollPercent,
  totalReadTimeMs,
}) {
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  await setDoc(
    refs.progressChapter(userId, taleId, chapterIndex),
    { scrollPercent, updatedAt: serverTimestamp() },
    { merge: true }
  );

  if (typeof totalReadTimeMs === 'number') {
    await setDoc(refs.progress(userId, taleId), { totalReadTimeMs }, { merge: true });
  }
}
/**
 * Retrieves a user's full progress for a tale from Firestore.
 * Fetches both the tale-level document and the chapters subcollection.
 * Returns a combined object so resume logic can access cloud.chapters[chapterIndex].
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale
 * @returns {Promise<Object|null>} Tale progress with chapters map, or null if none exists
 */
export async function getCloudProgress({ userId, taleId }) {
  const snap = await getDoc(refs.progress(userId, taleId));
  if (!snap.exists()) return null;

  const taleData = snap.data();
  const chaptersSnap = await getDocs(refs.progressChapters(userId, taleId));

  const chapters = {};
  chaptersSnap.forEach((d) => {
    chapters[d.id] = d.data();
  });

  return { ...taleData, chapters };
}

/* ================= Debounced Sync ================= */

// Tracks pending sync timers keyed by userId:taleId:chapterIndex
const timers = new Map();

/**
 * Schedules a debounced cloud sync for chapter progress.
 * Resets the timer on every call so only one write fires after the user stops scrolling.
 * Delay is controlled by PROGRESS_SYNC_DELAY_MS in app.config.js.
 *
 * @param {Object} payload - Same shape as syncChapterProgressToCloud params
 */
export function scheduleProgressSync(payload) {
  const { userId, taleId, chapterIndex } = payload;
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  const key = `${userId}:${taleId}:${chapterIndex}`;
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(
      () => syncChapterProgressToCloud(payload).catch(console.warn),
      PROGRESS_SYNC_DELAY_MS
    )
  );
}
