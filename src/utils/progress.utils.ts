// src/utils/progress.utils.ts
// Reading progress calculation utilities.
//
// Chapter progress documents are stored in Firestore with document IDs
// that are the zero-based chapter index as a string: "0", "1", "2", etc.
// chapterNum is a separate 1-based display field, not used for keying.
//
// All functions here operate on the document ID strings (0-based).

interface ProgressEntry {
  scrollPercent?: number;
  [key: string]: unknown;
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
 * Supports both flat and nested shapes:
 *   { "0": 100, "1": 45 }
 *   { "0": { scrollPercent: 100 }, "1": { scrollPercent: 45 } }
 *
 * Bug fix: loop was `i = 1; i <= totalChapters` (1-based) which skipped
 * chapter "0" and read chapter N+1 that doesn't exist.
 * Corrected to `i = 0; i < totalChapters` to match 0-based document IDs.
 *
 * @param chapterCount - Total number of chapters
 * @param chaptersProgress - Map of chapter index string => scrollPercent or progress object
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

  // Loop over 0-based document IDs: "0", "1", ..., "totalChapters - 1"
  for (let i = 0; i < totalChapters; i++) {
    const entry = chaptersProgress?.[String(i)];

    const scrollPercent =
      typeof entry === 'object' && entry !== null
        ? Number((entry as ProgressEntry).scrollPercent) || 0
        : Number(entry) || 0;

    progressUnits += Math.min(100, Math.max(0, scrollPercent)) / 100;
  }

  return {
    totalChapters,
    percent: Math.min(100, Math.round((progressUnits / totalChapters) * 100)),
  };
}
