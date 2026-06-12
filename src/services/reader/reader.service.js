// src/services/reader/reader.service.js
// Fetches tale metadata and chapter content from Firestore.
// Primary data access layer for the reader page.

import { refs, getDoc, getDocs } from '@fb/index.js';
import { createTale, createChapter } from '@state/index.js';
import { safeCall, createLogger, saveTaleOffline, getTaleOffline } from '@/utils';

const log = createLogger('ReaderService');
log.debug('Module initialized');

/**
 * Fetches metadata for a specific tale.
 *
 * @param {string} taleId
 * @returns {Promise<import('@state/schemas/tale.schema.js').Tale|null>}
 */
export async function getTaleMeta(taleId) {
  if (!taleId) return null;

  // Try offline first if offline
  if (!navigator.onLine) {
    log.info('Offline: loading tale meta from local storage');
    const local = await getTaleOffline(taleId);
    if (local) return createTale(local.id, local);
  }

  log.debug('Fetching tale meta', { taleId });
  return safeCall(
    (async () => {
      const snap = await getDoc(refs.tale(taleId));
      if (!snap.exists()) {
        log.error(`Tale not found: ${taleId}`);
        throw new Error(`Tale not found: ${taleId}`);
      }
      log.info('Loaded tale meta', { taleId, title: snap.data()?.title });
      const tale = createTale(snap.id, snap.data());

      // Update offline cache partially
      const existing = await getTaleOffline(taleId);
      await saveTaleOffline({
        ...(existing || {}),
        id: tale.id,
        title: tale.title,
        authorName: tale.authorName,
        coverUrl: tale.coverUrl,
        synopsis: tale.synopsis,
        lastReadAt: Date.now(),
        chapters: existing?.chapters || [],
      });

      return tale;
    })(),
    null,
    'Failed to load tale.'
  );
}

/**
 * Fetches all chapters for a specific tale.
 * Used for the Table of Contents and navigation context.
 *
 * @param {string} taleId
 * @returns {Promise<import('@state/schemas/tale.schema.js').Chapter[]>}
 */
export async function getChapters(taleId) {
  if (!taleId) return [];

  // Try offline first if offline
  if (!navigator.onLine) {
    log.info('Offline: loading chapter list from local storage');
    const local = await getTaleOffline(taleId);
    return local?.chapters || [];
  }

  log.debug('Fetching chapter list', { taleId });
  return safeCall(
    (async () => {
      const snap = await getDocs(refs.chapters(taleId));
      const chapters = snap.docs
        .map((d) => createChapter(d.id, d.data()))
        .sort((a, b) => a.chapterNum - b.chapterNum);

      // Update offline cache with full chapter list
      const existing = await getTaleOffline(taleId);
      await saveTaleOffline({
        ...(existing || {
          id: taleId,
          title: '',
          authorName: '',
          coverUrl: '',
          synopsis: '',
        }),
        lastReadAt: Date.now(),
        chapters: chapters,
      });

      return chapters;
    })(),
    [],
    'Failed to load chapters.'
  );
}

/**
 * Fetches a single chapter and returns it alongside full navigation context.
 * Sorts all chapters by chapterNum before resolving the requested index.
 *
 * @param {Object} params
 * @param {string} params.taleId
 * @param {number} params.chapterIndex - Zero-based index
 * @returns {Promise<{ chapter: import('@state/schemas/tale.schema.js').Chapter, navigation: Object }|null>}
 */
export async function getChapter({ taleId, chapterIndex }) {
  if (!taleId || typeof chapterIndex !== 'number') return null;

  // Try offline first if offline
  if (!navigator.onLine) {
    log.info('Offline: loading chapter from local storage');
    const local = await getTaleOffline(taleId);
    if (local && local.chapters && local.chapters[chapterIndex]) {
      const chapters = local.chapters;
      const chapter = chapters[chapterIndex];
      const total = chapters.length;

      return {
        chapter,
        navigation: {
          hasPrev: chapterIndex > 0,
          hasNext: chapterIndex < total - 1,
          prevTitle: chapterIndex > 0 ? chapters[chapterIndex - 1].title : null,
          prevIndex: chapterIndex > 0 ? chapterIndex - 1 : null,
          nextTitle: chapterIndex < total - 1 ? chapters[chapterIndex + 1].title : null,
          nextIndex: chapterIndex < total - 1 ? chapterIndex + 1 : null,
          totalChapters: total,
        },
      };
    }
  }

  log.debug('Fetching chapter list', { taleId, chapterIndex });
  return safeCall(
    (async () => {
      const snap = await getDocs(refs.chapters(taleId));

      const chapters = snap.docs
        .map((d) => createChapter(d.id, d.data()))
        .sort((a, b) => a.chapterNum - b.chapterNum);

      const total = chapters.length;
      log.info(`Tale has ${total} chapters. Resolving index ${chapterIndex}...`);

      const chapter = chapters[chapterIndex];

      if (!chapter) {
        log.error(`Chapter not found at index ${chapterIndex}`, { total });
        throw new Error(`Chapter not found at index ${chapterIndex}`);
      }

      log.info('Chapter resolved', { title: chapter.title });

      // Update offline cache with full chapter list
      const existing = await getTaleOffline(taleId);
      await saveTaleOffline({
        ...(existing || { id: taleId, title: '', authorName: '', coverUrl: '', synopsis: '' }),
        lastReadAt: Date.now(),
        chapters: chapters,
      });

      return {
        chapter,
        navigation: {
          hasPrev: chapterIndex > 0,
          hasNext: chapterIndex < total - 1,
          prevTitle: chapterIndex > 0 ? chapters[chapterIndex - 1].title : null,
          prevIndex: chapterIndex > 0 ? chapterIndex - 1 : null,
          nextTitle: chapterIndex < total - 1 ? chapters[chapterIndex + 1].title : null,
          nextIndex: chapterIndex < total - 1 ? chapterIndex + 1 : null,
          totalChapters: total,
        },
      };
    })(),
    null,
    'Failed to load chapter.'
  );
}
