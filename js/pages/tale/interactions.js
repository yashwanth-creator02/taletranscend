import { resolveResumePoint } from '@services/index.js';

/* ======================================
   Chapter List Navigation
====================================== */

/**
 * Bind click events to chapter items in the chapter list.
 * Navigates the user to the selected chapter in the reader.
 *
 * @param {string} taleId - The unique ID of the tale to navigate within
 */
export function bindChapterClicks(taleId) {
  const list = document.getElementById('chapter-list');
  if (!list) return; // Exit if chapter list doesn't exist

  // Listen for click events on chapter items using event delegation
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.chapter-item'); // Get the clicked chapter item
    if (!item) return;

    const chapterId = item.dataset.chapterIndex; // Retrieve chapter index from data attribute
    window.location.href = `reader.html?taleId=${taleId}&chapterId=${chapterId}`; // Navigate to reader page
  });
}

/* ======================================
   Tab Switching
====================================== */

/**
 * Setup UI tabs for switching between sections like description, chapters, and comments.
 * Exposes a global function `switchTab` for HTML onclick handlers.
 */
export function setupTabs() {
  window.switchTab = (tabKey) => {
    // Deactivate all tab buttons visually
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));

    // Hide all tab content sections
    document.querySelectorAll('.tab-content').forEach((p) => p.classList.add('hidden'));

    // Activate the selected tab button and show corresponding content
    document.getElementById(`tab-${tabKey}`)?.classList.add('active');
    document.getElementById(`content-${tabKey}`)?.classList.remove('hidden');
  };
}

/* ======================================
   Start Reading Button
====================================== */

/**
 * Setup the "Start Reading" button to navigate to the first chapter.
 *
 * @param {string} taleId - The ID of the tale
 * @param {Array} chapters - Array of chapter objects for the tale
 */
export function setupStartReading(taleId, chapters) {
  const btn = document.getElementById('start-btn');
  if (!btn) return; // Exit if start button doesn't exist

  btn.addEventListener('click', () => {
    if (!chapters || !chapters.length) return; // Exit if there are no chapters

    const firstChapter = chapters[0]; // Take the first chapter
    window.location.href = `reader.html?taleId=${taleId}&chapterId=${firstChapter.id}`; // Navigate to reader
  });
}

/* ======================================
   Resume Reading Button
====================================== */

/**
 * Setup the "Resume Reading" button to navigate to the last unfinished chapter.
 * If no progress exists, starts from chapter 0.
 *
 * @param {string} userId - The ID of the current user
 * @param {string} taleId - The ID of the tale
 */
export function setupResumeReading(userId, taleId) {
  const btn = document.getElementById('resume-btn');
  if (!btn) return; // Exit if resume button doesn't exist

  btn.addEventListener('click', () => {
    const resume = resolveResumePoint({ userId, taleId }); // Get the last unfinished chapter

    if (!resume) {
      // No saved progress found; start from the first chapter
      window.location.href = `reader.html?taleId=${taleId}&chapterId=0`;
      return;
    }

    // Navigate to the last unfinished chapter
    window.location.href = `reader.html?taleId=${taleId}&chapterId=${resume.chapterIndex}`;
  });
}
