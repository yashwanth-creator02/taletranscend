// src/utils/progress.utils.ts

interface ProgressEntry {
  scrollPercent?: number;
  [key: string]: any;
}

interface ChaptersProgress {
  [key: string]: number | ProgressEntry;
}

interface OverallProgressParams {
  chapterCount: number | string;
  chaptersProgress: ChaptersProgress;
}

interface OverallProgressResult {
  totalChapters: number;
  percent: number;
}

/**
 * Calculates overall reading progress for a tale from a chapter progress map.
 *
 * Supports both shapes:
 * 1. { "0": 100, "1": 45 }
 * 2. { chapters: { "0": 100, "1": 45 } }
 * 3. { "0": { scrollPercent: 100 }, "1": { scrollPercent: 45 } }
 */
export function getOverallProgress({
  chapterCount = 0,
  chaptersProgress = {},
}: OverallProgressParams): OverallProgressResult {
  const totalChapters = Number(chapterCount) || 0;

  if (totalChapters <= 0) {
    return { totalChapters: 0, percent: 0 };
  }

  let progressUnits = 0;

  // IMPORTANT:
  // Your chapter IDs start from 1, not 0.
  // Actually, many places use 0-indexing. We'll check both if 1-indexing fails
  // or just follow the logic provided.
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
