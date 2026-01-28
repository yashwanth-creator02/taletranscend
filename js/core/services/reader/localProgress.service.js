const STORAGE_KEY = 'taletranscend:reader-progress';

/* ================= Helpers ================= */

export function readStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ================= Progress ================= */

export function saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent }) {
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  const store = readStorage();
  store[userId] ??= {};
  store[userId][taleId] ??= { chapters: {}, totalReadTimeMs: 0 };

  store[userId][taleId].chapters[chapterIndex] = {
    scrollPercent,
    updatedAt: Date.now(),
  };

  writeStorage(store);
}

export function getChapterProgress({ userId, taleId, chapterIndex }) {
  const store = readStorage();
  return store[userId]?.[taleId]?.chapters?.[chapterIndex] || null;
}

export function getLastReadChapter({ userId, taleId }) {
  const chapters = readStorage()[userId]?.[taleId]?.chapters;
  if (!chapters) return null;

  return Number(Object.entries(chapters).sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0]?.[0]);
}

export function getChapterState(progress) {
  if (!progress) return 'not_started';
  if (progress.scrollPercent >= 95) return 'completed';
  if (progress.scrollPercent > 0) return 'in_progress';
  return 'not_started';
}

/* ================= Read Time ================= */

export function addReadTime({ userId, taleId, durationMs }) {
  if (!userId || !taleId || durationMs <= 0) return;

  const store = readStorage();
  store[userId] ??= {};
  store[userId][taleId] ??= { chapters: {}, totalReadTimeMs: 0 };

  store[userId][taleId].totalReadTimeMs += durationMs;
  store[userId][taleId].updatedAt = Date.now();

  writeStorage(store);
}

export function getLocalTotalReadTime({ userId, taleId }) {
  return readStorage()[userId]?.[taleId]?.totalReadTimeMs || 0;
}

export function getAllLocalChapters({ userId, taleId }) {
  return readStorage()[userId]?.[taleId]?.chapters || {};
}
