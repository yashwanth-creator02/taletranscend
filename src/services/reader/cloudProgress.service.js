// src/services/reader/cloudProgress.service.js
// Handles syncing and retrieving reader progress from Firestore.
// Chapter progress is stored in a subcollection for efficient per-chapter reads.
// All written objects conform to the ChapterProgress schema from progress.schema.js.

import { getDoc, setDoc, serverTimestamp, getDocs, refs } from '@fb/index.js';
import { createChapterProgress, createTaleProgress } from '@state/index.js';
import { PROGRESS_SYNC_DELAY_MS } from '@config/app.config.js';
import { safeCall } from '@/utils';

/* ─────────────────────────────────────────────
   Sync
   ───────────────────────────────────────────── */

/**
 * Syncs a user's chapter scroll progress and optional character offset to Firestore.
 * Also updates the tale-level progress document with lastReadAt and totalReadTimeMs.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {number} params.chapterIndex
 * @param {number} params.scrollPercent
 * @param {number} [params.lastCharacterOffset]
 * @param {number} [params.totalReadTimeMs]
 */
export async function syncChapterProgressToCloud({
  userId,
  taleId,
  chapterIndex,
  scrollPercent,
  lastCharacterOffset = 0,
  totalReadTimeMs,
}) {
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;
  if (!navigator.onLine) return; // Silently skip if offline

  // Update tale-level progress with lastReadAt and optional totalReadTimeMs
  const taleUpdate = { lastReadAt: serverTimestamp() };
  if (typeof totalReadTimeMs === 'number') {
    taleUpdate.totalReadTimeMs = totalReadTimeMs;
  }

  return safeCall(
    Promise.all([
      setDoc(
        refs.progressChapter(userId, taleId, chapterIndex),
        {
          scrollPercent,
          lastCharacterOffset,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      setDoc(refs.progress(userId, taleId), taleUpdate, { merge: true }),
    ]),
    undefined,
    'Failed to sync reading progress.',
    true // silent
  );
}

/* ─────────────────────────────────────────────
   Retrieve
   ───────────────────────────────────────────── */

/**
 * Retrieves a user's full progress for a tale from Firestore.
 * Fetches both the tale-level document and the chapters subcollection.
 * Normalizes both through schema factories.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {Promise<import('@state/schemas/progress.schema.js').TaleProgress|null>}
 */
export async function getCloudProgress({ userId, taleId }) {
  if (!userId || !taleId) return null;

  return safeCall(
    (async () => {
      const snap = await getDoc(refs.progress(userId, taleId));
      if (!snap.exists()) return null;

      const chaptersSnap = await getDocs(refs.progressChapters(userId, taleId));

      // Build chapters map normalized through createChapterProgress
      const chapters = {};
      chaptersSnap.forEach((d) => {
        chapters[d.id] = createChapterProgress(d.data());
      });

      return createTaleProgress(taleId, { ...snap.data(), chapters });
    })(),
    null,
    'Failed to load reading progress.',
    true // silent - let local progress be the fallback without annoying the user
  );
}

/* ─────────────────────────────────────────────
   Debounced Sync
   ───────────────────────────────────────────── */

// Tracks pending sync timers keyed by userId:taleId:chapterIndex
const _timers = new Map();

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
  clearTimeout(_timers.get(key));
  _timers.set(
    key,
    setTimeout(
      () => syncChapterProgressToCloud(payload).catch(console.warn),
      PROGRESS_SYNC_DELAY_MS
    )
  );
}
