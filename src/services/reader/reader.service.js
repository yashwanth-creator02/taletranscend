// src/services/reader/reader.service.js
// Fetches tale metadata and chapter content from Firestore.
// Primary data access layer for the reader page.

import { refs, getDoc, getDocs } from '@fb/index.js';
import { createTale, createChapter } from '@state/index.js';
import { safeCall } from '@/utils';

/**
 * Fetches metadata for a specific tale.
 *
 * @param {string} taleId
 * @returns {Promise<import('@state/schemas/tale.schema.js').Tale|null>}
 */
export async function getTaleMeta(taleId) {
  if (!taleId) return null;

  return safeCall(
    (async () => {
      const snap = await getDoc(refs.tale(taleId));
      if (!snap.exists()) throw new Error(`Tale not found: ${taleId}`);
      return createTale(snap.id, snap.data());
    })(),
    null,
    'Failed to load tale.'
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

  return safeCall(
    (async () => {
      const snap = await getDocs(refs.chapters(taleId));

      const chapters = snap.docs
        .map((d) => createChapter(d.id, d.data()))
        .sort((a, b) => a.chapterNum - b.chapterNum);

      const total = chapters.length;
      const chapter = chapters[chapterIndex];

      if (!chapter) throw new Error(`Chapter not found at index ${chapterIndex}`);

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
