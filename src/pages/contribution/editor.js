// src/pages/contribution/editor.js
// Handles auto-saving chapter content to local state and updating the word count.
// Auto-save is debounced to avoid excessive writes on every keystroke.

import { state } from './state.js';

/* ==================== Debounce Helper ==================== */

/**
 * Returns a debounced version of the provided function.
 * The function only executes after the specified delay has passed
 * without it being called again.
 *
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ==================== Auto-Save ==================== */

/**
 * Saves the current chapter content from the textarea into local state.
 * Updates the word count display immediately on every keystroke.
 * The actual state save and status update are debounced at 800ms.
 */
export const autoSaveLocal = debounce(function () {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  // Sync textarea content into current chapter in state
  chapter.content = document.getElementById('chapter-content').value;

  updateWordCount();

  const status = document.getElementById('stat-status');
  if (status) status.textContent = 'Draft Saved';
}, 800);

/* ==================== Word Count ==================== */

/**
 * Counts words in the current chapter textarea and updates the word count element.
 * Called immediately on every keystroke so the count stays responsive.
 */
function updateWordCount() {
  const text = document.getElementById('chapter-content').value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const stat = document.getElementById('stat-words');
  if (stat) stat.textContent = `${words} Words`;
}
