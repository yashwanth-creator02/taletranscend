import { readStorage } from "./localProgress.service.js";
import { getCloudProgress } from "./cloudProgress.service.js";

export async function resolveResumePoint({ userId, taleId }) {
  if (!userId || !taleId) return null;

  const candidates = [];
  const localChapters = readStorage()[userId]?.[taleId]?.chapters;

  if (localChapters) {
    for (const [chapterIndex, data] of Object.entries(localChapters)) {
      if (data.scrollPercent < 100) {
        candidates.push({ chapterIndex: +chapterIndex, ...data });
      }
    }
  }

  const cloud = await getCloudProgress({ userId, taleId });
  if (cloud?.chapters) {
    for (const [chapterIndex, data] of Object.entries(cloud.chapters)) {
      if (data.scrollPercent < 100) {
        candidates.push({ chapterIndex: +chapterIndex, ...data });
      }
    }
  }

  return candidates.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
}
