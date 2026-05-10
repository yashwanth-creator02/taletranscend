// src/utils/progress.utils.js

// Pure utility for calculating overall reading progress across all chapters.
// Used by the library and shelf card renderers to show per-tale progress.

/**
 * Calculates overall reading progress for a tale from a chapter progress map.
 * Aggregates fractional progress across all chapters into a single percentage.
 *
 * Aggregation logic:
 * Each chapter contributes a fractional unit based on scroll progress.
 * A fully read chapter (100%) adds 1.0 units.
 * A half-read chapter (50%) adds 0.5 units.
 * Overall percent = (sum of units / total chapters) * 100
 *
 * @param {Object} params
 * @param {number} params.chapterCount - Total number of chapters in the tale
 * @param {Object} params.chaptersProgress - Map of chapterIndex => scrollPercent (0-100)
 * @returns {{ totalChapters: number, percent: number }}
 */
export function getOverallProgress({ chapterCount = 0, chaptersProgress = {} }) {
  if (chapterCount <= 0) {
    return { totalChapters: 0, percent: 0 };
  }

  let progressUnits = 0;

  for (let i = 0; i < chapterCount; i++) {
    const p = Math.min(100, Math.max(0, chaptersProgress[String(i)] ?? 0));
    progressUnits += p / 100;
  }

  const percent = Math.min(100, Math.round((progressUnits / chapterCount) * 100));

  return { totalChapters: chapterCount, percent };
}
