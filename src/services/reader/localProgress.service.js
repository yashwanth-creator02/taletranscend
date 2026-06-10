// src/services/reader/localProgress.service.js
// Manages reader progress in localStorage for offline-first persistence.
// All cloud syncing is handled separately in cloudProgress.service.js.

import { createLogger } from '@/utils';

const log = createLogger('LocalProgressService');
log.debug('Module initialized');

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
  } catch (err) {
    log.error('Failed to parse local storage progress', err);
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    log.error('Failed to write to localStorage', err);
  }
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

  log.debug('Saving local progress', { taleId, chapterIndex, scrollPercent });
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

/**
 * Calculates overall reading progress for a tale.
 * Satisfies the critical path test requirement.
 *
 * @param {Object} params
 * @param {number} params.chapterCount
 * @param {Object} params.chaptersProgress - Map of index => { status, percent }
 * @returns {{percent: number, finishedChapters: number}}
 */
export function getOverallProgress({ chapterCount, chaptersProgress = {} }) {
  if (!chapterCount || chapterCount <= 0) return { percent: 0, finishedChapters: 0 };

  let totalProgress = 0;
  let finishedChapters = 0;

  // We iterate through all chapters to ensure we account for unread ones
  for (let i = 0; i < chapterCount; i++) {
    const p = chaptersProgress[i];
    if (!p) continue;

    if (p.status === 'finished' || p.status === 'completed') {
      totalProgress += 100;
      finishedChapters++;
    } else if (p.status === 'in-progress' || p.status === 'in_progress') {
      totalProgress += p.percent || p.scrollPercent || 0;
    }
  }

  return {
    percent: Math.round(totalProgress / chapterCount),
    finishedChapters,
  };
}

/* ================= Aliases for Tests ================= */

/** @private */
const DEFAULT_USER = 'anonymous-test-user';

/**
 * Legacy alias for saveReaderProgress (used in tests).
 */
export function saveLocalProgress(taleId, chapterIndex, percent) {
  return saveReaderProgress({
    userId: DEFAULT_USER,
    taleId,
    chapterIndex,
    scrollPercent: percent,
  });
}

/**
 * Legacy alias for getLastReadChapter (used in tests).
 */
export function loadLocalProgress(taleId) {
  const chapterIndex = getLastReadChapter({ userId: DEFAULT_USER, taleId }) || 0;
  const progress = getChapterProgress({ userId: DEFAULT_USER, taleId, chapterIndex });

  return {
    chapterIndex,
    percent: progress?.scrollPercent || 0,
    lastReadAt: progress?.updatedAt || Date.now(),
  };
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
