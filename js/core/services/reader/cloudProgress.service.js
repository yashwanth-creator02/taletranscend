import { db, appId, doc, getDoc, setDoc } from '../../firebase/index.js';

/* ================= Cloud API ================= */

export async function syncChapterProgressToCloud({
  userId,
  taleId,
  chapterIndex,
  scrollPercent,
  totalReadTimeMs,
}) {
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  const ref = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);

  await setDoc(
    ref,
    {
      chapters: {
        [chapterIndex]: {
          scrollPercent,
          updatedAt: Date.now(),
        },
      },
      totalReadTimeMs,
    },
    { merge: true }
  );
}

export async function getCloudProgress({ userId, taleId }) {
  const ref = doc(db, 'artifacts', appId, 'users', userId, 'readerProgress', taleId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/* ================= Debounced Sync ================= */

const timers = new Map();

export function scheduleProgressSync(payload) {
  const { userId, taleId, chapterIndex } = payload;
  if (!userId || !taleId || typeof chapterIndex !== 'number') return;

  const key = `${userId}:${taleId}:${chapterIndex}`;
  clearTimeout(timers.get(key));

  timers.set(
    key,
    setTimeout(() => syncChapterProgressToCloud(payload).catch(console.warn), 4000)
  );
}
