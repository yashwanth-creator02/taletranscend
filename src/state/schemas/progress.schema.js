// src/state/schemas/progress.schema.js
// Canonical shape for all reading progress data from Firestore and localStorage.
// users/{uid}/readerProgress/{taleId} and .../chapters/{index}

/* ─────────────────────────────────────────────
   Tale-level Progress — readerProgress/{taleId}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} TaleProgress
 * @property {string}   taleId
 * @property {number}   totalReadTimeMs
 * @property {string}   status           - 'in_progress' | 'finished' | 'abandoned'
 * @property {import('firebase/firestore').Timestamp|null} finishedAt
 * @property {import('firebase/firestore').Timestamp|null} lastReadAt
 * @property {string}   taleTitle
 * @property {string}   coverUrl
 * @property {number}   chapterCount
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 * @property {Object}   chapters         - Map of chapterIndex => ChapterProgress
 */

/**
 * @param {string} taleId
 * @param {Partial<TaleProgress>} data
 * @returns {TaleProgress}
 */
export function createTaleProgress(taleId, data = {}) {
  return {
    taleId,
    totalReadTimeMs: data.totalReadTimeMs ?? 0,
    status:          data.status          ?? 'in_progress',
    finishedAt:      data.finishedAt      ?? null,
    lastReadAt:      data.lastReadAt      ?? null,
    taleTitle:       data.taleTitle       ?? '',
    coverUrl:        data.coverUrl        ?? '',
    chapterCount:    data.chapterCount    ?? 0,
    createdAt:       data.createdAt       ?? null,
    updatedAt:       data.updatedAt       ?? null,
    chapters:        data.chapters        ?? {},
  };
}

/* ─────────────────────────────────────────────
   Chapter-level Progress — readerProgress/{taleId}/chapters/{index}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} ChapterProgress
 * @property {number} scrollPercent        - 0–100 coarse scroll position
 * @property {number} lastCharacterOffset  - Precise character position for exact resume
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 */

/**
 * @param {Partial<ChapterProgress>} data
 * @returns {ChapterProgress}
 */
export function createChapterProgress(data = {}) {
  return {
    scrollPercent:       data.scrollPercent       ?? 0,
    lastCharacterOffset: data.lastCharacterOffset ?? 0,
    updatedAt:           data.updatedAt           ?? null,
  };
}

/* ─────────────────────────────────────────────
   Local Progress — shape stored in localStorage
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} LocalChapterProgress
 * @property {number} scrollPercent
 * @property {number} updatedAt    - Unix timestamp (Date.now())
 */

/**
 * @typedef {Object} LocalTaleProgress
 * @property {Object.<string, LocalChapterProgress>} chapters - chapterIndex => progress
 * @property {number} totalReadTimeMs
 * @property {number} updatedAt    - Unix timestamp (Date.now())
 */

/**
 * @typedef {Object} LocalProgressStore
 * @property {Object.<string, Object.<string, LocalTaleProgress>>} [uid] - uid => taleId => progress
 */

/**
 * Creates a safe local chapter progress entry.
 *
 * @param {Partial<LocalChapterProgress>} data
 * @returns {LocalChapterProgress}
 */
export function createLocalChapterProgress(data = {}) {
  return {
    scrollPercent: data.scrollPercent ?? 0,
    updatedAt:     data.updatedAt     ?? Date.now(),
  };
}

/**
 * Creates a safe local tale progress entry.
 *
 * @param {Partial<LocalTaleProgress>} data
 * @returns {LocalTaleProgress}
 */
export function createLocalTaleProgress(data = {}) {
  return {
    chapters:        data.chapters        ?? {},
    totalReadTimeMs: data.totalReadTimeMs ?? 0,
    updatedAt:       data.updatedAt       ?? Date.now(),
  };
}

/* ─────────────────────────────────────────────
   Reading History — users/{uid}/readingHistory/{taleId}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} ReadingHistoryEntry
 * @property {string} taleId
 * @property {string} taleTitle
 * @property {string} coverUrl
 * @property {string} authorName
 * @property {import('firebase/firestore').Timestamp|null} firstReadAt
 * @property {import('firebase/firestore').Timestamp|null} lastReadAt
 * @property {number} visitCount
 */

/**
 * @param {string} taleId
 * @param {Partial<ReadingHistoryEntry>} data
 * @returns {ReadingHistoryEntry}
 */
export function createReadingHistoryEntry(taleId, data = {}) {
  return {
    taleId,
    taleTitle:   data.taleTitle   ?? '',
    coverUrl:    data.coverUrl    ?? '',
    authorName:  data.authorName  ?? '',
    firstReadAt: data.firstReadAt ?? null,
    lastReadAt:  data.lastReadAt  ?? null,
    visitCount:  data.visitCount  ?? 1,
  };
}
