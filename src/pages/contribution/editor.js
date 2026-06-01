// src/pages/contribution/editor.js
// Handles auto-saving chapter content to local state and updating all
// writing statistics (word count, character count, estimated reading time).
// Auto-save to state is debounced to avoid excessive writes on every keystroke.

import { state } from './state.js';
import { debounce } from '@/utils/function.utils';
import { setEl } from '@/utils/ui.utils';
import { countWords, estimateReadMins } from '@/utils/string.utils';

/* ── Auto-Save ────────────────────────────────────────────────────── */

/**
 * Saves the current chapter content from the textarea into local state.
 * Updates all stat displays immediately on every keystroke via updateStats().
 * The state write and status indicator update are debounced at 600ms.
 */
export const autoSaveLocal = debounce(function () {
  const chapter = state.chapters[state.currentChapterIndex];
  if (!chapter) return;

  const content = document.getElementById('chapter-content')?.value ?? '';
  chapter.content = content;
  state.isDirty = true;

  updateStats();

  const status = document.getElementById('stat-status');
  if (status) {
    status.className = status.className.replace(/text-(indigo|emerald|red|zinc)-\d+/g, '');
    status.classList.add('text-zinc-500');
    status.textContent = 'Unsaved changes';
  }
}, 600);

/* ── Statistics ───────────────────────────────────────────────────── */

/**
 * Counts words and characters in the chapter textarea and updates
 * every stat element on the page:
 *   #stat-words          (footer bar, bottom-center)
 *   #stat-words-right    (right analytics panel)
 *   #stat-chars          (footer bar)
 *   #stat-reading-time   (right analytics panel, if present)
 */
export function updateStats() {
  const content = document.getElementById('chapter-content')?.value ?? '';
  const trimmed = content.trim();
  const words = countWords(content);
  const chars = content.length;

  // Average reading speed: 200 wpm
  const readingMinutes = Math.ceil(words / 200);
  const readingLabel = readingMinutes < 1 ? '< 1m' : `${readingMinutes}m`;

  setEl('stat-words', `${words} Words`);
  setEl('stat-words-right', String(words));
  setEl('stat-chars', `${chars} Characters`);
  setEl('stat-reading-time', readingLabel);
}

/* ── Helpers ──────────────────────────────────────────────────────── */
