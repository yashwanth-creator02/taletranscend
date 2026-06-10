// src/pages/profile/sync.js
// Manages real-time Firestore sync and save operations for the user profile.
// All incoming Firestore data is normalized through createUserProfile before
// being stored in profileState. computeAndSyncStats delegates to profile.service.js.

import { auth, onSnapshot, setDoc, serverTimestamp, getDoc, refs } from '@fb/index.js';

import { createLogger } from '@/utils';
import { createUserProfile } from '@state/index.js';
import { updateProfileUI, showNotification } from './ui.js';
import { profileState } from './state.js';

const log = createLogger('ProfileSync');

// Re-export UI utilities so profile/index.js barrel works without changing
export * from './ui.js';

/* ─────────────────────────────────────────────
   Real-time Sync
   ───────────────────────────────────────────── */

/**
 * Starts real-time synchronisation of the user profile from Firestore.
 * Normalizes the incoming document through createUserProfile so profileState
 * always has a consistent shape with safe defaults for every field.
 * Cleans up any existing listener before creating a new one.
 *
 * @param {string} uid
 */
export function startProfileSync(uid) {
  // Clean up stale listener — prevents duplicate listeners on hot reload
  if (profileState.unsubscribeProfile) {
    log.debug('Cleaning up existing profile sync listener');
    profileState.unsubscribeProfile();
    profileState.unsubscribeProfile = null;
  }

  log.info('Starting real-time profile sync', { uid });
  profileState.uid = uid;

  profileState.unsubscribeProfile = onSnapshot(
    refs.user(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        log.warn('Profile snapshot received but document does not exist', { uid });
        return;
      }

      log.debug('Profile snapshot received', { uid });

      // Normalize through schema — guarantees every field is present with safe defaults
      const normalized = createUserProfile(uid, snapshot.data());

      // Mirror all schema fields into profileState
      Object.assign(profileState, {
        name: normalized.name,
        bio: normalized.bio,
        pronouns: normalized.pronouns,
        avatarUrl: normalized.avatarUrl,
        location: normalized.location,
        website: normalized.website,
        twitterHandle: normalized.twitterHandle,
        instagramHandle: normalized.instagramHandle,
        readingGoal: normalized.readingGoal,
        favouriteGenres: normalized.favouriteGenres,
        joinedAt: normalized.joinedAt
          ? new Date(normalized.joinedAt.seconds * 1000).toISOString()
          : '',
        totalWordsWritten: normalized.totalWordsWritten,
        totalReaders: normalized.totalReaders,
        writingStreak: normalized.writingStreak,
      });

      updateProfileUI(profileState);
    },
    (error) => {
      log.error('Sync error:', error);
      showNotification('Failed to sync profile. Check your connection.', 'error');
    }
  );
}

/**
 * Stops the active Firestore profile listener.
 * Call on page teardown or sign-out.
 */
export function stopProfileSync() {
  profileState.unsubscribeProfile?.();
  profileState.unsubscribeProfile = null;
}

/* ─────────────────────────────────────────────
   Save Profile
   ───────────────────────────────────────────── */

/**
 * Reads all modal input fields and persists the full profile to Firestore.
 * Uses merge:true to preserve any fields not in this form (stats, counts etc.).
 * Creates a createdAt timestamp on first save.
 */
export async function saveProfile() {
  if (!auth.currentUser) {
    showNotification('You must be signed in to save.', 'error');
    return;
  }

  const uid = auth.currentUser.uid;
  log.info('Saving profile...', { uid });

  const userRef = refs.user(uid);
  const snapshot = await getDoc(userRef);

  const data = {
    name: _getVal('input-name'),
    bio: _getVal('input-bio'),
    pronouns: _getVal('input-pronouns'),
    avatarUrl: _getVal('input-avatar-url'),
    location: _getVal('input-location'),
    website: _getVal('input-website'),
    twitterHandle: _getVal('input-twitter'),
    instagramHandle: _getVal('input-instagram'),
    readingGoal: Number(_getVal('input-reading-goal')) || 30,
    favouriteGenres: [...profileState.favouriteGenres],
    updatedAt: serverTimestamp(),
  };

  // Stamp createdAt and joinedAt on first save only
  if (!snapshot.exists()) {
    log.info('First-time profile save; stamping creation dates');
    data.createdAt = serverTimestamp();
    data.joinedAt = serverTimestamp();
    data.role = 'reader';
    data.isBanned = false;
  }

  try {
    await setDoc(userRef, data, { merge: true });
    log.info('Profile saved successfully');
    showNotification('Profile saved.', 'success');
  } catch (error) {
    log.error('Save error:', error);
    showNotification('Failed to save profile. Please try again.', 'error');
  }
}

/* ─────────────────────────────────────────────
   Computed Stats
   ───────────────────────────────────────────── */

/**
 * Delegates to profile.service.js to avoid duplicating the word-count
 * logic that already lives there. The service handles Firestore writes.
 *
 * @param {string} uid
 * @returns {Promise<{ wordsWritten: number, readers: number, readingTime: number, streak: number }>}
 */
export async function computeAndSyncStats(uid) {
  // Lazy import to avoid circular dependency: profile.js -> sync.js -> profile.service.js
  const { computeAndSyncStats: _compute, getUserPublishedTales } =
    await import('@services/index.js');

  try {
    const [totalWords, tales] = await Promise.all([_compute(uid), getUserPublishedTales(uid)]);

    const readers = tales.reduce((acc, t) => acc + (t.readCount || 0), 0);

    return {
      wordsWritten: totalWords,
      readers,
      readingTime: totalWords * 0.3,
      streak: profileState.writingStreak,
    };
  } catch (err) {
    log.error('computeAndSyncStats error:', err);
    return { wordsWritten: 0, readers: 0, readingTime: 0, streak: 0 };
  }
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _getVal(id) {
  return document.getElementById(id)?.value.trim() ?? '';
}
