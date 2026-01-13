// js/core/services/reader/readerProgress.service.js

/**
 * js/core/services/reader/readerProgress.service.js
 * Firebase cloud progress sync
 */

import { db, appId, doc, getDoc, setDoc } from "../../firebase/index.js";

/* ================= Cloud API ================= */

export async function syncChapterProgressToCloud({
  userId,
  taleId,
  chapterIndex,
  scrollPercent
}) {
  if (!userId || !taleId || typeof chapterIndex !== "number") return;

  const ref = doc(db, "artifacts", appId, "users", userId, "readerProgress", taleId);

  await setDoc(
    ref,
    {
      chapters: {
        [chapterIndex]: {
          scrollPercent,
          updatedAt: Date.now()
        }
      }
    },
    { merge: true }
  );
}

export async function getCloudChapterProgress({ userId, taleId, chapterIndex }) {
  if (!userId || !taleId || typeof chapterIndex !== "number") return null;

  const ref = doc(db, "artifacts", appId, "users", userId, "readerProgress", taleId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data()?.chapters?.[chapterIndex] || null;
}

export async function getCloudProgress({ userId, taleId }) {
  if (!userId || !taleId) return null;

  const ref = doc(db, "artifacts", appId, "users", userId, "readerProgress", taleId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data();
}

/* ================= Debounced Sync ================= */

const timers = new Map();

export function scheduleProgressSync({
  userId,
  taleId,
  chapterIndex,
  scrollPercent,
  delay = 4000
}) {
  if (!userId || !taleId || typeof chapterIndex !== "number") return;

  const key = `${userId}:${taleId}:${chapterIndex}`;
  if (timers.has(key)) clearTimeout(timers.get(key));

  const timer = setTimeout(() => {
    syncChapterProgressToCloud({
      userId,
      taleId,
      chapterIndex,
      scrollPercent
    }).catch(console.warn);
  }, delay);

  timers.set(key, timer);
}
