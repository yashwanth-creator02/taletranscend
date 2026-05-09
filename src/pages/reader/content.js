// src/pages/reader/content.js
// Loads tale metadata and chapter content from Firestore
// and renders them into the reader page DOM.

import { getTaleMeta, getChapter } from '@services/index.js';

/* ==================== Tale Metadata ==================== */

/**
 * Fetches tale metadata and populates the reader header and sidebar.
 *
 * @param {string} taleId - ID of the tale to load
 */
export async function loadReaderMeta(taleId) {
  try {
    const meta = await getTaleMeta(taleId);

    setText('header-story-title', meta.title);
    setText('sidebar-story-name', meta.title);
    setText('sidebar-description', meta.description);
    setText('author-name', meta.authorName);
  } catch (err) {
    console.error('loadReaderMeta: failed to load tale metadata:', err);
  }
}

/* ==================== Chapter Content ==================== */

/**
 * Fetches a chapter and renders its title and content into the reader.
 * Splits content by newline and wraps each paragraph in a <p> tag.
 *
 * @param {Object} params
 * @param {string} params.taleId - ID of the tale
 * @param {number} params.chapterIndex - Zero-based index of the chapter to load
 * @returns {Promise<Object|null>} Navigation context object or null on failure
 */
export async function loadReaderChapter({ taleId, chapterIndex }) {
  try {
    const { chapter, navigation } = await getChapter({ taleId, chapterIndex });

    setText('chapter-label', `Fragment ${String(chapter.index + 1).padStart(2, '0')}`);
    setText('chapter-title', chapter.title);

    const story = document.getElementById('story-content');
    if (story) {
      story.innerHTML = chapter.content
        .split('\n')
        .filter((p) => p.trim())
        .map((p) => `<p class="mb-8">${p}</p>`)
        .join('');
    }

    return navigation;
  } catch (err) {
    console.error('loadReaderChapter: failed to load chapter:', err);
    return null;
  }
}

/* ==================== Helpers ==================== */

/**
 * Sets the textContent of a DOM element by ID.
 * Silently skips if the element is not found.
 *
 * @param {string} id - Element ID
 * @param {string} value - Text content to set
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
