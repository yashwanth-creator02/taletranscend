// src/pages/tale/interactions.js
// Handles user interactions on the tale page:
// chapter navigation, tab switching, and reading start/resume.

import { resolveResumePoint } from '@services/index.js';

/**
 * Binds click events to chapter list items using event delegation.
 * Navigates to the reader page for the clicked chapter.
 *
 * @param {string} taleId - ID of the tale
 */
export function bindChapterClicks(taleId) {
  const list = document.getElementById('chapter-list');
  if (!list) return;

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.chapter-item');
    if (!item) return;

    const chapterId = item.dataset.chapterIndex;
    window.location.href = `reader.html?taleId=${taleId}&chapterId=${chapterId}`;
  });
}

/**
 * Sets up tab switching for the tale page sections.
 * Uses event delegation on data-tab buttons instead of window.switchTab.
 */
export function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabKey = btn.dataset.tab;

      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((p) => p.classList.add('hidden'));

      btn.classList.add('active');
      document.getElementById(`content-${tabKey}`)?.classList.remove('hidden');
    });
  });
}

/**
 * Sets up the Start Reading button to navigate to the first chapter.
 *
 * @param {string} taleId - ID of the tale
 * @param {Array<Object>} chapters - Array of chapter objects
 */
export function setupStartReading(taleId, chapters) {
  const btn = document.getElementById('start-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!chapters?.length) return;
    window.location.href = `reader.html?taleId=${taleId}&chapterId=${chapters[0].id}`;
  });
}

/**
 * Sets up the Resume Reading button to navigate to the last unfinished chapter.
 * Falls back to chapter 0 if no saved progress is found.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {string} taleId - ID of the tale
 */
export function setupResumeReading(userId, taleId) {
  const btn = document.getElementById('resume-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const resume = await resolveResumePoint({ userId, taleId });

    const chapterId = resume?.chapterIndex ?? 0;
    window.location.href = `reader.html?taleId=${taleId}&chapterId=${chapterId}`;
  });
}
