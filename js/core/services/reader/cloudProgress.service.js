import { db, appId, doc, getDoc, setDoc } from '../../firebase/index.js';

/* ================= Firestore Structure Reference =================
artifacts (collection)
 └─ taletranscend-pro (document / appId)
     └─ users (collection)
         └─ <userId> (document)
             └─ readerProgress (collection)
                 └─ <taleId> (document)
                     ├─ chapters (map/object)
                     │    ├─ 0: { scrollPercent, updatedAt }
                     │    ├─ 1: { scrollPercent, updatedAt }
                     │    └─ ...
                     └─ totalReadTimeMs
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

  // Reference to the user's progress document in Firestore
  const ref = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);

  // Merge the chapter progress into Firestore document
  await setDoc(
    ref,
    {
      chapters: {
        [chapterIndex]: {
          scrollPercent,
          updatedAt: Date.now(), // Track last updated timestamp
        },
      },
      totalReadTimeMs, // Aggregate read time
    },
    { merge: true } // Keep existing data intact
  );
}

/**
 * Retrieves a user's progress for a specific tale from Firestore.
 *
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.taleId
 * @returns {Object|null} Progress data or null if none exists
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
