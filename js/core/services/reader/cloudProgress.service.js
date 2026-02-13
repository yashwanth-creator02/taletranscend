import { db, appId, doc, getDoc, setDoc, serverTimestamp } from '../../firebase/index.js';

/* ================= Firestore Structure Reference =================
artifacts (collection)
 └─ taletranscend-pro (document / appId)
     └─ users (collection)
         └─ <userId> (document)
             └─ readerProgress (collection)
                 └─ <taleId> (document)
                     ├─ totalReadTimeMs
                     └─ chapters (subcollection)
                          └─ <chapterIndex> (document)
                              ├─ scrollPercent
                              └─ updatedAt
==================================================================== */

/* ================= Cloud API ================= */

/**
 * Syncs a user's chapter progress to Firestore.
 *
 * @param {Object} payload
 * @param {string} payload.userId - Current user ID
 * @param {string} payload.taleId - Tale ID being read
 * @param {number} payload.chapterIndex - Chapter number/index
 * @param {number} payload.scrollPercent - How far the user scrolled
 * @param {number} payload.totalReadTimeMs - Total read time in milliseconds
 */
export async function syncChapterProgressToCloud({
  userId,
  taleId,
  chapterIndex,
  scrollPercent,
  totalReadTimeMs,
}) {
  // Validate required parameters
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  // Tale-level progress document
  const taleRef = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);

  // Chapter-level progress document (subcollection)
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

  // Persist chapter progress
  await setDoc(
    chapterRef,
    {
      scrollPercent,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Persist aggregate tale-level data
  if (typeof totalReadTimeMs === 'number') {
    await setDoc(taleRef, { totalReadTimeMs }, { merge: true });
  }
}

/**
 * Retrieves a user's progress for a specific tale from Firestore.
 * (Tale-level data only; chapters are read separately)
 *
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.taleId
 * @returns {Object|null} Tale-level progress or null
 */
export async function getCloudProgress({ userId, taleId }) {
  const ref = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);

  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/* ================= Debounced Sync ================= */

// Map to hold timers for debounced writes to Firestore
const timers = new Map();

/**
 * Schedules a debounced sync of chapter progress to Firestore.
 * Prevents excessive writes when user scrolls frequently.
 *
 * @param {Object} payload - Same shape as syncChapterProgressToCloud
 */
export function scheduleProgressSync(payload) {
  const { userId, taleId, chapterIndex } = payload;
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  const key = `${userId}:${taleId}:${chapterIndex}`;

  // Clear any existing scheduled sync for this chapter
  clearTimeout(timers.get(key));

  // Schedule a new sync after 4 seconds of inactivity
  timers.set(
    key,
    setTimeout(() => syncChapterProgressToCloud(payload).catch(console.warn), 4000)
  );
}
