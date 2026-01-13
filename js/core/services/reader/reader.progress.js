/**
 *\js\core\services\reader\reader.progress.js
 */
import { getCloudProgress } from "./readerProgress.service.js";

// ================= Helper Functions =================


// ================= Resolve Progress =================
export async function resolveProgress({ userId, taleId, chapterIndex }) {
  if (!userId || !taleId) return null;

  const local = getChapterProgress({ userId, taleId });
  const cloud = await getCloudProgress({ userId, taleId });

  const localChapter = local?.chapters?.[chapterIndex];
  const cloudChapter = cloud?.chapters?.[chapterIndex];

  if (!localChapter && !cloudChapter) return null;
  if (!cloudChapter) return { source: "local", ...localChapter };
  if (!localChapter) return { source: "cloud", ...cloudChapter };

  return cloudChapter.updatedAt > localChapter.updatedAt
    ? { source: "cloud", ...cloudChapter }
    : { source: "local", ...localChapter };
}

// ================= Local Storage =================

const STORAGE_KEY = "taletranscend:reader-progress";

/* =========================================================
   Internal helpers
   ========================================================= */

/**
 * Safely read the entire progress store
 */
function readStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const data = JSON.parse(raw);
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

/**
 * Persist the full progress store
 */
function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* =========================================================
   Public API
   ========================================================= */

/**
 * Save progress for a single chapter
 */
export function saveReaderProgress({ userId , taleId, chapterIndex, scrollPercent }) {
    if (!taleId) return;
    
    const store = readStorage();
    
    // Structure: store[userId][taleId].chapters[index]
    if (!store[userId]) store[userId] = {};
    if (!store[userId][taleId]) store[userId][taleId] = { chapters: {} };
    
    store[userId][taleId].chapters[chapterIndex] = {
        scrollPercent,
        updatedAt: Date.now()
    };

    writeStorage(store);
    console.log(`Saved: ${scrollPercent}% of chapter ${chapterIndex}`);
}

/**
 * Get progress for a specific chapter
 */
export function getChapterProgress({ userId , taleId, chapterIndex }) {
    if (!taleId) return null;
    const store = readStorage();
    return store[userId]?.[taleId]?.chapters?.[chapterIndex] || null;
}

/**
 * Get all progress for a tale
 */
export function getTaleProgress({ taleId }) {
  if (!taleId) return null;

  const store = readStorage();
  return store[taleId] || null;
}
