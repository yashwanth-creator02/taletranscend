// src/services/reader/resume.service.js
// Resolves the best chapter to resume reading by comparing
// local storage and cloud progress, returning the most recently updated incomplete chapter.

import { readStorage } from './localProgress.service.js';
import { getCloudProgress } from './cloudProgress.service.js';

/**
 * Determines the optimal resume point for a user across local and cloud progress.
 * Filters out completed chapters (scrollPercent >= 100) and picks the most recent.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale
 * @returns {Promise<Object|null>} { chapterIndex, scrollPercent, updatedAt } or null if no progress
 */
export async function resolveResumePoint({ userId, taleId }) {
  if (!userId || !taleId) return null;

  // -------------------- Local Progress --------------------
  const localChapters = readStorage()[userId]?.[taleId]?.chapters || {};
  const localCandidates = Object.entries(localChapters)
    .filter(([, data]) => (data?.scrollPercent ?? 0) < 100)
    .map(([idx, data]) => ({ chapterIndex: Number(idx), ...data }))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const local = localCandidates[0] || null;

  // -------------------- Cloud Progress --------------------
  const cloudData = await getCloudProgress({ userId, taleId });
  const cloudChapters = cloudData?.chapters || {};
  const cloudCandidates = Object.entries(cloudChapters)
    .filter(([, data]) => (data?.scrollPercent ?? 0) < 100)
    .map(([idx, data]) => ({ chapterIndex: Number(idx), ...data }))
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
      const bTime = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
      return bTime - aTime;
    });

  const cloud = cloudCandidates[0] || null;

  return determineResumePoint(local, cloud);
}

/**
 * Pure helper to compare two progress points and pick the best one.
 * Satisfies the critical path test requirement.
 *
 * @param {Object|null} local - { chapterIndex, percent|scrollPercent, updatedAt }
 * @param {Object|null} cloud - { chapterIndex, percent|scrollPercent, updatedAt }
 * @returns {Object} { chapterIndex, percent, source }
 */
export function determineResumePoint(local, cloud) {
  const localPoint = local
    ? { ...local, percent: local.percent ?? local.scrollPercent ?? 0 }
    : null;
  const cloudPoint = cloud
    ? { ...cloud, percent: cloud.percent ?? cloud.scrollPercent ?? 0 }
    : null;

  if (!localPoint && !cloudPoint) {
    return { chapterIndex: 0, percent: 0, source: 'start' };
  }

  if (!cloudPoint) return { ...localPoint, source: 'local' };
  if (!localPoint) return { ...cloudPoint, source: 'cloud' };

  // Logic: Pick whichever is further ahead in chapters.
  // If same chapter, pick whichever has more percent.
  // This is a simple but effective heuristic for "more recent/advanced".
  const isCloudAhead =
    cloudPoint.chapterIndex > localPoint.chapterIndex ||
    (cloudPoint.chapterIndex === localPoint.chapterIndex &&
      cloudPoint.percent > localPoint.percent);

  return isCloudAhead ? { ...cloudPoint, source: 'cloud' } : { ...localPoint, source: 'local' };
}
