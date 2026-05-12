// src/utils/progress.utils.js

/**
 * Calculates overall reading progress for a tale from a chapter progress map.
 *
 * Supports both shapes:
 * 1. { "0": 100, "1": 45 }
 * 2. { chapters: { "0": 100, "1": 45 } }
 * 3. { "0": { scrollPercent: 100 }, "1": { scrollPercent: 45 } }
 */
export function getOverallProgress({ chapterCount = 0, chaptersProgress = {} }) {
  const totalChapters = Number(chapterCount) || 0;

  if (totalChapters <= 0) {
    return { totalChapters: 0, percent: 0 };
  }

  let progressUnits = 0;

  // IMPORTANT:
  // Your chapter IDs start from 1, not 0.
  for (let i = 1; i <= totalChapters; i++) {
    const entry = chaptersProgress?.[String(i)];

    const scrollPercent =
      typeof entry === 'object' && entry !== null
        ? Number(entry.scrollPercent) || 0
        : Number(entry) || 0;

    const clamped = Math.min(100, Math.max(0, scrollPercent));

    progressUnits += clamped / 100;
  }

  const percent = Math.min(100, Math.round((progressUnits / totalChapters) * 100));

  return {
    totalChapters,
    percent,
  };
}
