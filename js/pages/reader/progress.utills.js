// js/pages/reader/progress.utils.js

/**
 * Calculates overall reading progress from a tale object and chapter progress map.
 * This function is PURE and deterministic.
 */
export function getOverallProgress(tale) {
  if (!tale) {
    return { currentChapter: 0, totalChapters: 0, percent: 0 };
  }

  const {
    chapterCount = 0,
    chaptersProgress = {}, // Received from the service above
  } = tale;

  if (chapterCount <= 0) {
    return { currentChapter: 0, totalChapters: 0, percent: 0 };
  }

  let progressUnits = 0;

  /**
   * AGGREGATION LOGIC:
   * We iterate through the total count of chapters.
   * For each chapter, we check if there is a recorded scroll percentage.
   * A full chapter (100%) adds 1.0 units. A half chapter (50%) adds 0.5 units.
   */
  for (let i = 0; i < chapterCount; i++) {
    const p = Math.min(100, Math.max(0, chaptersProgress[i] ?? 0));
    progressUnits += p / 100;
  }

  // Calculate percentage: (Sum of units / Total Chapters) * 100
  const percent = Math.min(100, Math.round((progressUnits / chapterCount) * 100));

  return {
    totalChapters: chapterCount,
    percent: percent,
  };
}
