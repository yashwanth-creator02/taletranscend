// js/core/services/reader/readerProgress.service.js

import { db, appId, doc, getDoc, setDoc } from "../../firebase/index.js";

/* ================= Cloud Sync ================= */
export async function syncChapterProgressToCloud({ userId, taleId, chapterIndex, scrollPercent }) {
  if (!userId || !taleId) return;

  const ref = doc(db, "artifacts", appId, "users", userId, "readerProgress", taleId);

  await setDoc(ref, {
    chapters: {
      [chapterIndex]: { scrollPercent, updatedAt: Date.now() }
    }
  }, { merge: true });
}

export async function getCloudChapterProgress({ userId, taleId, chapterIndex }) {
  if (!userId || !taleId) return null;
  const ref = doc(db, "artifacts", appId, "users", userId, "readerProgress", taleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data.chapters?.[chapterIndex] || null;
}

export async function getCloudProgress({ userId, taleId }) {
  if (!userId || !taleId) return null;
  const ref = doc(db, "artifacts", appId, "users", userId, "readerProgress", taleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

// ================= Debounced Sync =================
const userTimers = new Map();

export function scheduleProgressSync({ userId, taleId, delay = 5000 }) {
  if (!userId || !taleId) return;

  // Clear previous timer for this user
  const key = `${userId}:${taleId}`;
  if (userTimers.has(key)) clearTimeout(userTimers.get(key));

  const timer = setTimeout(async () => {
    try {
      // ✅ Use local storage function directly
      const local = JSON.parse(localStorage.getItem(`reader-progress:${userId}:${taleId}`) || "{}");
      if (!local) return;

      await syncChapterProgressToCloud({
        userId,
        taleId,
        chapterIndex: Object.keys(local.chapters || {})[0] || 0, // simple sync of first chapter
        scrollPercent: Object.values(local.chapters || {})[0]?.scrollPercent || 0
      });
    } catch (err) {
      console.warn("Progress sync failed:", err);
    }
  }, delay);

  userTimers.set(key, timer);
}
