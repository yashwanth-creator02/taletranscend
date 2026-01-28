// js/pages/reader/reader.js

import {
  getChapterProgress,
  getCloudProgress,
  updateReaderProgress,
  bindScrollProgress,
  restoreScrollProgress,
  initAuth,
  initMobileDrawer,
  initTheme,
  initFont,
  setTheme,
  updateSize,
  loadReaderMeta,
  loadReaderChapter,
  applyNavigation,
  goBackToTale,
  saveReaderProgress,
  scheduleProgressSync,
  getLocalTotalReadTime,
  addReadTime,
} from './index.js';

/* ==================== URL Parameters ==================== */
// Extract taleId and chapterId from query parameters
const params = new URLSearchParams(window.location.search);
const taleId = params.get('taleId');
const chapterIndex = parseInt(params.get('chapterId')) || 0;

/* ==================== Theme & Font ==================== */
initTheme(); // Initialize reader theme
initFont(); // Apply selected font

// Expose setters to window for HTML controls
window.setTheme = setTheme;
window.updateSize = updateSize;

/* ==================== Progress Resolver ==================== */

/**
 * Resolves the most up-to-date progress for a chapter by comparing
 * local storage and cloud progress.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.taleId
 * @param {number} params.chapterIndex
 * @returns {Object|null} - Progress object or null if no progress exists
 */
async function resolveProgress({ userId, taleId, chapterIndex }) {
  const local = getChapterProgress({ userId, taleId, chapterIndex });
  const cloud = await getCloudProgress({ userId, taleId });

  const cloudChapter = cloud?.chapters?.[chapterIndex];

  if (!local && !cloudChapter) return null;
  if (!cloudChapter) return local;
  if (!local) return cloudChapter;

  // Return the newer progress
  return cloudChapter.updatedAt > local.updatedAt ? cloudChapter : local;
}

/* ==================== Initialization ==================== */
initAuth(async (user) => {
  const userId = user.uid;
  let sessionStart = Date.now();

  // Track reading time when user switches tabs or hides page
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const duration = Date.now() - sessionStart;
      if (duration > 1000) {
        addReadTime({ userId, taleId, durationMs: duration });
      }
      sessionStart = Date.now();
    }
  });

  // Resolve chapter progress
  const resolvedProgress = await resolveProgress({
    userId,
    taleId,
    chapterIndex,
  });

  // Load tale metadata and current chapter
  await loadReaderMeta(taleId);
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  // Apply previous/next chapter navigation links
  applyNavigation(navigation, taleId);

  // Update sidebar progress bar
  updateReaderProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters,
  });

  // Restore scroll position from progress
  restoreScrollProgress({
    scrollPercent: resolvedProgress?.scrollPercent,
  });

  // Bind scroll listener to update progress
  bindScrollProgress({
    onScroll(scrollPercent) {
      saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent });

      const totalReadTimeMs = getLocalTotalReadTime({ userId, taleId });

      // Debounced sync to cloud
      scheduleProgressSync({
        userId,
        taleId,
        chapterIndex,
        scrollPercent,
        totalReadTimeMs,
      });
    },
  });
});

/* ==================== Mobile & UI ==================== */
// Go back button
window.GoBack = () => goBackToTale(taleId);

// Mobile drawer toggle
initMobileDrawer();

// Initialize Lucide icons if available
if (window.lucide) {
  lucide.createIcons();
}
