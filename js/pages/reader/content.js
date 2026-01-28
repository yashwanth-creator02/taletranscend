// js/reader/content.js

import { getTaleMeta, getChapter } from '@services/index.js';

/* ==================== Reader Metadata ==================== */

/**
 * Loads metadata for a tale and updates the reader UI.
 *
 * @param {string} taleId - The ID of the tale to load
 */
export async function loadReaderMeta(taleId) {
  try {
    const meta = await getTaleMeta(taleId);

    // Update UI elements with metadata
    setText('header-story-title', meta.title);
    setText('sidebar-story-name', meta.title);
    setText('sidebar-description', meta.description);
    setText('author-name', meta.authorName);
  } catch (err) {
    console.error('Failed to load tale metadata', err);
  }
}

/* ==================== Reader Chapter ==================== */

/**
 * Loads a specific chapter and renders its content.
 *
 * @param {Object} params
 * @param {string} params.taleId - The tale ID
 * @param {number} params.chapterIndex - The index of the chapter to load
 * @returns {Object|null} Navigation info (hasPrev, hasNext, prevIndex, nextIndex, etc.) or null on failure
 */
export async function loadReaderChapter({ taleId, chapterIndex }) {
  try {
    const { chapter, navigation } = await getChapter({
      taleId,
      chapterIndex,
    });

    // Update chapter label and title
    setText('chapter-label', `Fragment ${String(chapter.index + 1).padStart(2, '0')}`);
    setText('chapter-title', chapter.title);

    // Render chapter content with paragraphs
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
    console.error('Failed to load chapter', err);
    return null;
  }
}

/* ==================== Helpers ==================== */

/**
 * Sets the textContent of an element if it exists.
 *
 * @param {string} id - Element ID
 * @param {string} value - Text to set
 */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
