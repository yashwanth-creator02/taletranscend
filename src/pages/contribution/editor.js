// src/pages/contribution/editor.js
// Handles auto-saving chapter content to local state and updating the word count.

import { state } from './state.js';

/**
 * Saves the current chapter content from the textarea into local state.
 * Updates the word count display and sets the status indicator to saved.
 */
export function autoSaveLocal() {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  // Sync textarea content into the current chapter in state
  chapter.content = document.getElementById('chapter-content').value;

  updateWordCount();

  const status = document.getElementById('stat-status');
  if (status) status.textContent = 'Draft Saved';
}

/**
 * Counts words in the current chapter textarea and updates the word count element.
 */
function updateWordCount() {
  const text = document.getElementById('chapter-content').value || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const stat = document.getElementById('stat-words');
  if (stat) stat.textContent = `${words} Words`;
}
