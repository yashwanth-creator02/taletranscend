// js/pages/reader/progress.utils.js

/**
 * Calculates overall reading progress based on the current chapter index.
 *
 * @param {Object} params
 * @param {number} params.chapterIndex - Zero-based index of the current chapter
 * @param {number} params.totalChapters - Total number of chapters in the tale
 * @returns {Object} - Progress info: { current, total, percent }
 */
export function getOverallProgress({ chapterIndex, totalChapters }) {
  if (typeof chapterIndex !== 'number') throw new Error('chapterIndex must be a number');

  // Validate totalChapters
  if (typeof totalChapters !== 'number' || totalChapters <= 0) {
    return { current: 0, total: totalChapters || 0, percent: 0 };
  }

  // Current chapter number (1-based)
  const current = chapterIndex + 1;

  // Calculate percentage completion
  const percent = Math.round((current / totalChapters) * 100);

  return { current, total: totalChapters, percent };
}
