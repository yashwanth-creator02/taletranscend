import { state } from './state.js';

/* ================= Editor Auto-Save ================= */

/**
 * Automatically saves the current chapter content to local state.
 * Updates the word count and UI status indicator.
 */
export function autoSaveLocal() {
  // Get the current chapter from state
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  // Save content from textarea to state
  chapter.content = document.getElementById('chapter-content').value;

  // Update word count display
  updateWordCount();

  // Update status indicator in UI
  const status = document.getElementById('stat-status');
  if (status) status.textContent = 'Draft Saved';
}

/* ================= Word Count Update ================= */

/**
 * Calculates the number of words in the current chapter content
 * and updates the UI element displaying the count.
 */
function updateWordCount() {
  const text = document.getElementById('chapter-content').value || '';

  // Count words by splitting on whitespace
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  // Update the word count element in the UI
  const stat = document.getElementById('stat-words');
  if (stat) stat.textContent = `${words} Words`;
}
