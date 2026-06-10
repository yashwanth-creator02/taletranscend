// src/services/profile.service.js
// Profile-specific data fetching: reading history, published tales, drafts.
// All returned objects are normalized through schema factories.

import { getDocs, getDoc, refs } from '@fb/index.js';
import { readStorage } from '@services/index.js';
import { createTale, createDraft } from '@state/index.js';
import { getTalesByAuthor } from './tale/getTales.js';
import { safeAsync, createLogger } from '@/utils';

const log = createLogger('ProfileService');
log.debug('Module initialized');

/* ─────────────────────────────────────────────
   Continue Reading
   ───────────────────────────────────────────── */

/**
 * Builds the "continue reading" list from localStorage progress + Firestore tale metadata.
 * Sorts by most recently read, returns max 5 entries.
 *
 * @param {string} userId
 * @returns {Promise<Array<import('@state/schemas/tale.schema.js').Tale & { lastChapterIndex: number, lastUpdatedAt: number, percent: number }>>}
 */
export async function getContinueReading(userId) {
  if (!userId) return [];

  log.debug('Fetching continue reading list', { userId });
  const store = readStorage();
  const userProgress = store[userId];
  if (!userProgress) {
    log.info('No local progress found for user', { userId });
    return [];
  }

  // Only include tales where at least one chapter has been started
  const taleIds = Object.keys(userProgress).filter(
    (id) => Object.keys(userProgress[id]?.chapters || {}).length > 0
  );
  if (!taleIds.length) {
    log.info('No tales with started chapters found', { userId });
    return [];
  }

  log.info(`Found ${taleIds.length} tales in progress. Fetching metadata...`, { taleIds });
  const tales = await Promise.all(
    taleIds.map(async (taleId) => {
      const snap = await safeAsync(getDoc(refs.tale(taleId)), {
        fallback: { exists: () => false },
        logContext: `services.profile.getContinueReading.${taleId}`,
      });

      if (!snap.exists()) {
        log.warn(`Tale ${taleId} found in local progress but not in Firestore`);
        return null;
      }

      const tale = createTale(snap.id, snap.data());
      const chapters = userProgress[taleId]?.chapters || {};

      // Most recently read chapter
      const lastEntry = Object.entries(chapters).sort(
        (a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)
      )[0];

      const lastChapterIndex = lastEntry ? Number(lastEntry[0]) : 0;
      const lastUpdatedAt = lastEntry?.[1]?.updatedAt || 0;

      // Overall tale progress as a percentage
      const chapterCount = tale.chapterCount || 1;
      const progressUnits = Object.values(chapters).reduce(
        (acc, ch) => acc + Math.min(100, Math.max(0, ch.scrollPercent || 0)) / 100,
        0
      );
      const percent = Math.min(100, Math.round((progressUnits / chapterCount) * 100));

      return { ...tale, lastChapterIndex, lastUpdatedAt, percent };
    })
  );

  return tales
    .filter(Boolean)
    .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)
    .slice(0, 5);
}

/* ─────────────────────────────────────────────
   Published Tales
   ───────────────────────────────────────────── */

/**
 * Fetches all tales authored by the user.
 * Delegates to getTalesByAuthor which normalizes via createTale.
 *
 * @param {string} userId
 * @returns {Promise<import('@state/schemas/tale.schema.js').Tale[]>}
 */
export async function getUserPublishedTales(userId) {
  if (!userId) return [];
  log.debug('Fetching user published tales', { userId });
  return getTalesByAuthor(userId);
}

/* ─────────────────────────────────────────────
   Drafts
   ───────────────────────────────────────────── */

/**
 * Fetches all drafts for the user, ordered by most recently updated.
 * Returns lightweight metadata only — no chapter content.
 *
 * @param {string} userId
 * @returns {Promise<import('@state/schemas/draft.schema.js').Draft[]>}
 */
export async function getUserDrafts(userId) {
  if (!userId) return [];

  log.debug('Fetching user drafts', { userId });
  const snapshot = await safeAsync(getDocs(refs.drafts(userId)), {
    fallback: { empty: true, docs: [] },
    logContext: 'services.profile.getUserDrafts',
  });

  if (snapshot.empty) {
    log.info('No drafts found for user', { userId });
    return [];
  }

  log.info(`Found ${snapshot.docs.length} drafts`, { userId });
  return snapshot.docs
    .map((d) => createDraft(d.id, d.data()))
    .sort((a, b) => {
      const aTime = a.updatedAt?.seconds ?? 0;
      const bTime = b.updatedAt?.seconds ?? 0;
      return bTime - aTime;
    });
}

/* ─────────────────────────────────────────────
   Stats — word count across all draft chapters
   ───────────────────────────────────────────── */

/**
 * Computes total words written across all draft chapters and syncs to the user profile.
 * Called after any draft save to keep the profile stats current.
 *
 * @param {string} userId
 * @returns {Promise<number>} Total word count
 */
export async function computeAndSyncStats(userId) {
  if (!userId) return 0;

  log.debug('Computing stats', { userId });
  const draftsSnap = await safeAsync(getDocs(refs.drafts(userId)), {
    fallback: { empty: true, docs: [] },
    logContext: 'services.profile.computeAndSyncStats.drafts',
  });

  if (draftsSnap.empty) return 0;

  let totalWords = 0;

  await Promise.all(
    draftsSnap.docs.map(async (draftDoc) => {
      const chaptersSnap = await safeAsync(getDocs(refs.draftChapters(userId, draftDoc.id)), {
        fallback: { forEach: () => {} },
        logContext: `services.profile.computeAndSyncStats.chapters.${draftDoc.id}`,
      });
      chaptersSnap.forEach((ch) => {
        totalWords += ch.data().wordCount || 0;
      });
    })
  );

  // Sync to user profile document
  const { updateDoc, serverTimestamp } = await import('@fb/index.js');
  await safeAsync(
    updateDoc(refs.user(userId), {
      totalWordsWritten: totalWords,
      updatedAt: serverTimestamp(),
    }),
    { logContext: 'services.profile.computeAndSyncStats.sync' }
  );

  return totalWords;
}
