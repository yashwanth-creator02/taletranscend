// src/services/reader/reader.service.js
// Fetches tale metadata and chapter content from Firestore.
// This is the primary data access layer for the reader page.

import { db, appId, doc, getDoc, collection, getDocs } from '@firebase/index.js';

/* ================= Firestore Structure Reference =================
artifacts (collection)
 └─ {appId} (document)
     └─ public (collection)
         └─ data (document)
             └─ community_tales (collection)
                 └─ {taleId} (document)
                     └─ chapters (subcollection)
                         └─ {chapterId} (document)
==================================================================== */

/**
 * Fetches metadata for a specific tale.
 * Returns sanitized fields with fallback values for missing data.
 *
 * @param {string} taleId - ID of the tale to fetch
 * @returns {Promise<Object>} { title, description, authorName }
 * @throws {Error} If taleId is missing or the tale document does not exist
 */
export async function getTaleMeta(taleId) {
  if (!taleId) throw new Error('getTaleMeta: taleId is required');

  const taleRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_tales', taleId);
  const snap = await getDoc(taleRef);

  if (!snap.exists()) throw new Error(`Tale not found: ${taleId}`);

  const data = snap.data();

  return {
    title: data.title || 'Untitled Tale',
    description: data.description || '',
    authorName: data.authorName || 'Unknown Scribe',
  };
}

/**
 * Fetches a single chapter and returns it alongside navigation context.
 * Sorts all chapters by chapterNum before resolving the requested index.
 *
 * @param {Object} params
 * @param {string} params.taleId - ID of the tale
 * @param {number} params.chapterIndex - Zero-based index of the chapter to fetch
 * @returns {Promise<Object>} { chapter: { index, title, content }, navigation: { ... } }
 * @throws {Error} If taleId is missing, chapterIndex is not a number, or chapter is not found
 */
export async function getChapter({ taleId, chapterIndex }) {
  if (!taleId) throw new Error('getChapter: taleId is required');
  if (typeof chapterIndex !== 'number')
    throw new Error('getChapter: chapterIndex must be a number');

  const chaptersRef = collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'community_tales',
    taleId,
    'chapters'
  );

  const snap = await getDocs(chaptersRef);

  // Sort chapters by chapterNum field to ensure correct ordering
  const chapters = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0));

  const total = chapters.length;
  const chapter = chapters[chapterIndex];

  if (!chapter) throw new Error(`Chapter not found at index ${chapterIndex}`);

  return {
    chapter: {
      index: chapterIndex,
      title: chapter.title || 'Untitled Chapter',
      content: chapter.content || '',
    },
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
