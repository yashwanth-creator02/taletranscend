// js/core/services/reader.service.js

import { db, appId, doc, getDoc, collection, getDocs } from '../../firebase/index.js';

/* ================= Tale Metadata ================= */

/**
 * Fetches metadata for a specific tale.
 *
 * @param {string} taleId - ID of the tale to fetch
 * @returns {Object} { title, description, authorName }
 * @throws {Error} If taleId is missing or the tale does not exist
 */
export async function getTaleMeta(taleId) {
  if (!taleId) throw new Error('getTaleMeta: taleId is required');

  // Reference to the specific tale document in Firestore
  const taleRef = doc(db, 'artifacts', appId, 'public', 'data', 'community_tales', taleId);

  const snap = await getDoc(taleRef);

  if (!snap.exists()) throw new Error(`Tale not found: ${taleId}`);

  const data = snap.data();

  // Return sanitized metadata with fallback values
  return {
    title: data.title || 'Untitled Tale',
    description: data.description || '',
    authorName: data.authorName || 'Unknown Scribe',
  };
}

/* ================= Chapter Fetching ================= */

/**
 * Fetches a single chapter and provides navigation context.
 *
 * @param {Object} params
 * @param {string} params.taleId - Tale ID
 * @param {number} params.chapterIndex - Index of the chapter to fetch
 * @returns {Object} { chapter: {index, title, content}, navigation: {...} }
 * @throws {Error} If taleId is missing or chapterIndex is invalid/missing
 */
export async function getChapter({ taleId, chapterIndex }) {
  if (!taleId) throw new Error('getChapter: taleId is required');
  if (typeof chapterIndex !== 'number')
    throw new Error('getChapter: chapterIndex must be a number');

  // Reference to the chapters collection for this tale
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

  // Fetch all chapters for the tale
  const snap = await getDocs(chaptersRef);

  // Map Firestore docs to JS objects and sort by chapter number
  const chapters = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0));

  const total = chapters.length;
  const chapter = chapters[chapterIndex];

  if (!chapter) throw new Error(`Chapter not found at index ${chapterIndex}`);

  // Return the chapter content and navigation info
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
