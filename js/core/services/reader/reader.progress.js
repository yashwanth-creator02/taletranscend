/**
 * js/core/services/reader/reader.progress.js
 * Local (per-user, per-tale, per-chapter) progress storage
 */

const STORAGE_KEY = "taletranscend:reader-progress";

/* ================= Helpers ================= */

function readStorage() {
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

/* ================= Public API ================= */

export function saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent }) {
  if (!userId || !taleId || typeof chapterIndex !== "number") return;

  const store = readStorage();

  if (!store[userId]) store[userId] = {};
  if (!store[userId][taleId]) store[userId][taleId] = { chapters: {} };

  store[userId][taleId].chapters[chapterIndex] = {
    scrollPercent,
    updatedAt: Date.now()
  };

  writeStorage(store);
}

export function getChapterProgress({ userId, taleId, chapterIndex }) {
  if (!userId || !taleId || typeof chapterIndex !== "number") return null;

  const store = readStorage();
  return store[userId]?.[taleId]?.chapters?.[chapterIndex] || null;
}
