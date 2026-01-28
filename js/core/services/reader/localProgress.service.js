// Key used to store reader progress in localStorage
const STORAGE_KEY = 'taletranscend:reader-progress';

/* ================= Helpers ================= */

/**
 * Reads the entire reader progress store from localStorage.
 * Returns an empty object if nothing is stored or parsing fails.
 */
export function readStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback to empty object if stored data is corrupted
    return {};
  }
}

/**
 * Writes the provided data object to localStorage.
 * Internal helper; should not be called directly outside this module.
 *
 * @param {Object} data - The full reader progress store
 */
function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ================= Progress ================= */

/**
 * Saves a user's scroll progress for a specific chapter locally.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {number} params.chapterIndex
 * @param {number} params.scrollPercent
 */
export function saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent }) {
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  const store = readStorage();

  // Initialize nested objects if they do not exist
  store[userId] ??= {};
  store[userId][taleId] ??= { chapters: {}, totalReadTimeMs: 0 };

  // Save chapter scroll progress with timestamp
  store[userId][taleId].chapters[chapterIndex] = {
    scrollPercent,
    updatedAt: Date.now(),
  };

  writeStorage(store);
}

/**
 * Retrieves the local progress for a specific chapter.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {number} params.chapterIndex
 * @returns {Object|null} Progress object or null if not found
 */
export function getChapterProgress({ userId, taleId, chapterIndex }) {
  const store = readStorage();
  return store[userId]?.[taleId]?.chapters?.[chapterIndex] || null;
}

/**
 * Returns the last chapter the user read (based on latest updatedAt timestamp).
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {number|null} Last read chapter index or null
 */
export function getLastReadChapter({ userId, taleId }) {
  const chapters = readStorage()[userId]?.[taleId]?.chapters;
  if (!chapters) return null;

  // Sort chapters by last updated timestamp descending and pick the first
  return Number(Object.entries(chapters).sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0]?.[0]);
}

/**
 * Determines the state of a chapter based on scrollPercent.
 *
 * @param {Object|null} progress - Progress object from getChapterProgress
 * @returns {'not_started'|'in_progress'|'completed'}
 */
export function getChapterState(progress) {
  if (!progress) return 'not_started';
  if (progress.scrollPercent >= 95) return 'completed';
  if (progress.scrollPercent > 0) return 'in_progress';
  return 'not_started';
}

/* ================= Read Time ================= */

/**
 * Adds reading duration (in ms) to a tale's total read time locally.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {number} params.durationMs - Duration in milliseconds
 */
export function addReadTime({ userId, taleId, durationMs }) {
  if (!userId || !taleId || durationMs <= 0) return;

  const store = readStorage();
  store[userId] ??= {};
  store[userId][taleId] ??= { chapters: {}, totalReadTimeMs: 0 };

  store[userId][taleId].totalReadTimeMs += durationMs;
  store[userId][taleId].updatedAt = Date.now();

  writeStorage(store);
}

/**
 * Retrieves total read time for a tale from local storage.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {number} Total read time in milliseconds
 */
export function getLocalTotalReadTime({ userId, taleId }) {
  return readStorage()[userId]?.[taleId]?.totalReadTimeMs || 0;
}

/**
 * Retrieves all chapter progress objects for a tale from local storage.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {Object} Mapping of chapterIndex => progress object
 */
export function getAllLocalChapters({ userId, taleId }) {
  return readStorage()[userId]?.[taleId]?.chapters || {};
}
