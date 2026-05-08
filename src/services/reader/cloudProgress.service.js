// src/services/reader/cloudProgress.service.js
// Handles syncing and retrieving reader progress from Firestore.
// Chapter progress is stored in a subcollection for efficient per-chapter reads.

import {
  db,
  appId,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from '@firebase/index.js';

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

  // Tale-level document stores aggregate data like totalReadTimeMs
  const taleRef = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);

  // Chapter-level document stores per-chapter scroll position
  const chapterRef = doc(
    db,
    'artifacts',
    appId,
    'users',
    userId,
    'readerProgress',
    taleId,
    'chapters',
    String(chapterIndex)
  );

  // Write chapter scroll progress
  await setDoc(chapterRef, { scrollPercent, updatedAt: serverTimestamp() }, { merge: true });

  // Write aggregate read time at the tale level
  if (typeof totalReadTimeMs === 'number') {
    await setDoc(taleRef, { totalReadTimeMs }, { merge: true });
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
  const taleRef = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);
  const snap = await getDoc(taleRef);

  if (!snap.exists()) return null;

  const taleData = snap.data();

  // Fetch chapters subcollection and build a chapterIndex => data map
  const chaptersRef = collection(
    db,
    'artifacts',
    appId,
    'users',
    userId,
    'readerProgress',
    taleId,
    'chapters'
  );
  const chaptersSnap = await getDocs(chaptersRef);

  const chapters = {};
  chaptersSnap.forEach((chapterDoc) => {
    // Each document id is the chapter index stored as a string
    chapters[chapterDoc.id] = chapterDoc.data();
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
