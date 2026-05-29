// src/services/reader/localProgress.service.js
// Manages reader progress in localStorage for offline-first persistence.
// All cloud syncing is handled separately in cloudProgress.service.js.

import { timeAgo } from '@/utils/ui.utils';

const STORAGE_KEY = 'taletranscend:reader-progress';

/* ================= Storage Helpers ================= */

/**
 * Reads the entire progress store from localStorage.
 * Returns an empty object if nothing is stored or if parsing fails.
 *
 * @returns {Object} Full progress store keyed by userId
 */
export function readStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Return empty store if data is corrupted
    return {};
  }
}

/**
 * Writes the full progress store back to localStorage.
 * Internal helper — do not call this directly outside this module.
 *
 * @param {Object} data - Full progress store
 */
function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ================= Progress ================= */

/**
 * Saves scroll progress for a specific chapter to localStorage.
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

  // Initialize nested structure if it does not exist
  store[userId] ??= {};
  store[userId][taleId] ??= { chapters: {}, totalReadTimeMs: 0 };

  store[userId][taleId].chapters[chapterIndex] = {
    scrollPercent,
    updatedAt: Date.now(),
  };

  writeStorage(store);
}

/**
 * Retrieves stored progress for a specific chapter.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {number} params.chapterIndex
 * @returns {Object|null} Progress object with scrollPercent and updatedAt, or null
 */
export function getChapterProgress({ userId, taleId, chapterIndex }) {
  return readStorage()[userId]?.[taleId]?.chapters?.[chapterIndex] || null;
}

/**
 * Returns the index of the most recently read chapter based on updatedAt timestamp.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {number|null} Chapter index or null if no progress exists
 */
export function getLastReadChapter({ userId, taleId }) {
  const chapters = readStorage()[userId]?.[taleId]?.chapters;
  if (!chapters) return null;

  return Number(Object.entries(chapters).sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0]?.[0]);
}

/**
 * Determines the reading state of a chapter based on its scroll progress.
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
 * Adds a reading session duration to a tale's cumulative read time in localStorage.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {number} params.durationMs - Duration of the session in milliseconds
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
 * Returns the total read time for a tale from localStorage.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {number} Total read time in milliseconds, 0 if none recorded
 */
export function getLocalTotalReadTime({ userId, taleId }) {
  return readStorage()[userId]?.[taleId]?.totalReadTimeMs || 0;
}

/**
 * Returns all chapter progress entries for a tale from localStorage.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @returns {Object} Map of chapterIndex => { scrollPercent, updatedAt }
 */
export function getAllLocalChapters({ userId, taleId }) {
  return readStorage()[userId]?.[taleId]?.chapters || {};
}
