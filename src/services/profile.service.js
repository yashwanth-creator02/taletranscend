// src/services/profile.service.js
// Profile-specific data fetching: reading history, published tales, drafts.
// All returned objects are normalized through schema factories.

import { getDocs, getDoc, setDoc, deleteDoc, serverTimestamp, refs } from '@fb/index.js';
import { readStorage } from './reader/localProgress.service.js';
import { createTale, createDraft } from '@state/index.js';
import { getTalesByAuthor } from './tale/getTales.js';
import { safeAsync, createLogger } from '@/utils';
import { cacheService } from './cache.service.js';

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

  return cacheService.fetchWithCache(
    `user:continue-reading:${userId}`,
    async () => {
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
    },
    { ttl: 2 * 60 * 1000 }
  );
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
  return cacheService.fetchWithCache(`user:published:${userId}`, () => getTalesByAuthor(userId), {
    ttl: 3 * 60 * 1000,
  });
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

  return cacheService.fetchWithCache(
    `user:drafts:${userId}`,
    async () => {
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
    },
    { ttl: 2 * 60 * 1000 }
  );
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

  cacheService.invalidateProfile(userId);

  return totalWords;
}

/**
 * Deletes a user's account and personal private records while strictly PRESERVING
 * all contributed tales and lore in the eternal library archive.
 *
 * Requirements:
 * 1. Clean up user private data: preferences, bookmarks, reading progress, and profile doc.
 * 2. All authored tales in public/data/tales remain intact and published for posterity.
 * 3. Delete the user identity in Firebase Auth.
 * 4. Invalidate all user caches and purge local storage.
 *
 * @param {string} userId
 * @returns {Promise<{ success: boolean, preservedTalesCount: number }>}
 */
export async function deleteUserAccount(userId) {
  if (!userId) throw new Error('User ID required for account deletion');
  const { auth, deleteDoc, deleteCurrentUser, refs } = await import('@fb/index.js');

  if (auth.currentUser?.uid !== userId) {
    throw new Error('Unauthorized: Can only delete your own account.');
  }

  log.info('Initiating account deletion while preserving all contributed chronicles...', {
    userId,
  });

  // Count preserved tales for transparent feedback to the user
  const publishedTales = await getUserPublishedTales(userId);
  const preservedTalesCount = publishedTales.length;
  log.info(`Preserving ${preservedTalesCount} contributed chronicles in the living archive.`, {
    userId,
  });

  // 1. Delete user profile document
  await safeAsync(deleteDoc(refs.user(userId)), {
    logContext: 'services.profile.deleteUserAccount.userDoc',
  });

  // Delete preferences
  await safeAsync(deleteDoc(refs.readerPrefs(userId)), {
    logContext: 'services.profile.deleteUserAccount.readerPrefs',
  });

  // 2. Clear caches & local storage
  cacheService.invalidateProfile(userId);
  try {
    localStorage.removeItem('taletranscend_auth');
    localStorage.removeItem('taletranscend_settings');
    localStorage.removeItem(`tale_progress_${userId}`);
  } catch (err) {
    log.warn('Could not clear local storage during deletion:', err);
  }

  // 3. Delete auth account in Firebase Auth
  await deleteCurrentUser();

  log.info('User account deleted successfully. Contributed chronicles preserved.', {
    userId,
    preservedTalesCount,
  });

  return { success: true, preservedTalesCount };
}

/**
 * Submits a formal chronicle deletion request to the archive administration.
 * Tales cannot be directly deleted by authors after publication; deletion rests solely with admins.
 *
 * @param {{ userId: string, taleId: string, reason: string }} requestData
 * @returns {Promise<{ success: boolean, requestId: string }>}
 */
export async function submitTaleDeletionRequest({ userId, taleId, reason }) {
  if (!userId || !taleId || !reason) {
    throw new Error('User ID, Tale ID, and reason are required to request chronicle deletion.');
  }

  const { addDoc, serverTimestamp, refs } = await import('@fb/index.js');
  log.info('Submitting chronicle deletion request to admin...', { userId, taleId });

  const docRef = await addDoc(refs.deletionRequests(), {
    userId,
    taleId,
    reason: reason.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  log.info('Chronicle deletion request submitted successfully', { requestId: docRef.id });
  return { success: true, requestId: docRef.id };
}

/**
 * Toggles following a target author.
 *
 * @param {{ userId: string, targetAuthorId: string }} params
 * @returns {Promise<boolean>} True if now following, false if unfollowed
 */
export async function toggleFollowAuthor({ userId, targetAuthorId }) {
  if (!userId || !targetAuthorId || userId === targetAuthorId) {
    return false;
  }

  const followRef = refs.follow(userId, targetAuthorId);
  const followerRef = refs.follower(targetAuthorId, userId);

  const snap = await safeAsync(getDoc(followRef), {
    fallback: { exists: () => false },
    logContext: 'services.profile.toggleFollowAuthor.check',
  });

  if (snap.exists()) {
    await safeAsync(deleteDoc(followRef), {
      logContext: 'services.profile.toggleFollowAuthor.unfollow',
    });
    await safeAsync(deleteDoc(followerRef), {
      logContext: 'services.profile.toggleFollowAuthor.unfollower',
    });
    return false;
  } else {
    await safeAsync(
      setDoc(followRef, {
        targetUid: targetAuthorId,
        followedAt: serverTimestamp(),
      }),
      { logContext: 'services.profile.toggleFollowAuthor.follow' }
    );
    await safeAsync(
      setDoc(followerRef, {
        followerUid: userId,
        followedAt: serverTimestamp(),
      }),
      { logContext: 'services.profile.toggleFollowAuthor.follower' }
    );
    return true;
  }
}

/**
 * Checks whether a user is following a target author.
 *
 * @param {{ userId: string, targetAuthorId: string }} params
 * @returns {Promise<boolean>}
 */
export async function isFollowingAuthor({ userId, targetAuthorId }) {
  if (!userId || !targetAuthorId) return false;
  const snap = await safeAsync(getDoc(refs.follow(userId, targetAuthorId)), {
    fallback: { exists: () => false },
    logContext: 'services.profile.isFollowingAuthor',
  });
  return snap.exists();
}
