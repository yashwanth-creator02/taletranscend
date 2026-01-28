// \js\pages\reader\progress.utils.js

export function getOverallProgress({ chapterIndex, totalChapters }) {
  if (typeof chapterIndex !== 'number') throw new Error('chapterIndex must be a number');
  if (typeof totalChapters !== 'number' || totalChapters <= 0)
    return { current: 0, total: totalChapters || 0, percent: 0 };

  const current = chapterIndex + 1;
  const percent = Math.round((current / totalChapters) * 100);

  return { current, total: totalChapters, percent };
}
