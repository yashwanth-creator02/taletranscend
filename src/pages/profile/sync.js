// src/pages/profile/sync.js
// Manages real-time Firestore sync and save operations for the user profile.
// Handles all fields: name, bio, pronouns, avatar, location, website,
// social handles, reading goal, favourite genres.

import {
  db,
  auth,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  PATHS,
} from '@fb/index.js';

import { updateProfileUI, showNotification } from './ui.js';
import { profileState } from './state.js';

export * from './ui.js';

/* ─────────────────────────────────────────────
   Real-time Sync
   ───────────────────────────────────────────── */

/**
 * Starts real-time synchronisation of the user profile from Firestore.
 * Cleans up any existing listener before creating a new one.
 * Updates the entire profile UI whenever the document changes.
 *
 * @param {string} uid
 */
export function startProfileSync(uid) {
  // Clean up stale listener — prevents duplicate listeners on hot reload
  if (profileState.unsubscribeProfile) {
    profileState.unsubscribeProfile();
    profileState.unsubscribeProfile = null;
  }

  profileState.uid = uid;

  const userRef = doc(db, PATHS.user(uid));

  profileState.unsubscribeProfile = onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Mirror into local state so modal reads from it
      Object.assign(profileState, {
        name: data.name || '',
        bio: data.bio || '',
        pronouns: data.pronouns || '',
        avatarUrl: data.avatarUrl || '',
        location: data.location || '',
        website: data.website || '',
        twitterHandle: data.twitterHandle || '',
        instagramHandle: data.instagramHandle || '',
        readingGoal: data.readingGoal ?? 12,
        favouriteGenres: data.favouriteGenres || [],
        joinedAt: data.joinedAt || '',
        totalWordsWritten: data.totalWordsWritten || 0,
        totalReaders: data.totalReaders || 0,
        writingStreak: data.writingStreak || 0,
      });

      updateProfileUI(profileState);
    },
    (error) => {
      console.error('[profile] Sync error:', error);
      showNotification('Failed to sync profile. Check your connection.', 'error');
    }
  );
}

/**
 * Stops the active Firestore profile listener.
 * Call this on page teardown or sign-out.
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
 * Uses merge:true to preserve any fields not in this form.
 * Creates a createdAt timestamp on first save.
 */
export async function saveProfile() {
  if (!auth.currentUser) {
    showNotification('You must be signed in to save.', 'error');
    return;
  }

  const ref = doc(db, PATHS.user(auth.currentUser.uid));
  const snap = await getDoc(ref);

  const data = {
    name: getVal('input-name'),
    bio: getVal('input-bio'),
    pronouns: getVal('input-pronouns'),
    avatarUrl: getVal('input-avatar-url'),
    location: getVal('input-location'),
    website: getVal('input-website'),
    twitterHandle: getVal('input-twitter'),
    instagramHandle: getVal('input-instagram'),
    readingGoal: Number(getVal('input-reading-goal')) || 12,
    favouriteGenres: [...profileState.favouriteGenres],
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    // Capture join date on first profile creation
    data.createdAt = serverTimestamp();
    data.joinedAt = new Date().toISOString();
  }

  try {
    await setDoc(ref, data, { merge: true });
    showNotification('Profile saved.', 'success');
  } catch (error) {
    console.error('[profile] Save error:', error);
    showNotification('Failed to save profile. Please try again.', 'error');
  }
}

/* ─────────────────────────────────────────────
   Computed Stats
   ───────────────────────────────────────────── */

/**
 * Computes aggregate writing stats from the user's drafts and published tales.
 * Writes totalWordsWritten and totalReaders back to Firestore.
 *
 * @param {string} uid
 * @returns {Promise<{ wordsWritten: number, readers: number, readingTime: number, streak: number }>}
 */
export async function computeAndSyncStats(uid) {
  try {
    const [draftStats, publishedStats] = await Promise.all([
      _sumDraftWords(uid),
      _sumPublishedReaders(uid),
    ]);

    const stats = {
      wordsWritten: draftStats.words,
      readers: publishedStats.readers,
      readingTime: draftStats.words * 0.3, // ~0.3 seconds per word
      streak: profileState.writingStreak, // managed separately
    };

    // Persist computed stats back to the user doc
    const userRef = doc(db, PATHS.user(uid));
    await setDoc(
      userRef,
      {
        totalWordsWritten: stats.wordsWritten,
        totalReaders: stats.readers,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return stats;
  } catch (err) {
    console.error('[profile] computeAndSyncStats error:', err);
    return { wordsWritten: 0, readers: 0, readingTime: 0, streak: 0 };
  }
}

/**
 * Sums word counts across all draft chapters for a user.
 *
 * @param {string} uid
 * @returns {Promise<{ words: number }>}
 */
async function _sumDraftWords(uid) {
  try {
    const draftsSnap = await getDocs(collection(db, PATHS.drafts(uid)));
    if (draftsSnap.empty) return { words: 0 };

    let totalWords = 0;

    await Promise.all(
      draftsSnap.docs.map(async (draftDoc) => {
        const chaptersSnap = await getDocs(collection(db, PATHS.draftChapters(uid, draftDoc.id)));
        chaptersSnap.forEach((ch) => {
          const content = ch.data().content || '';
          const words = content.trim() ? content.trim().split(/\s+/).length : 0;
          totalWords += words;
        });
      })
    );

    return { words: totalWords };
  } catch {
    return { words: 0 };
  }
}

/**
 * Sums reader counts across all published tales by the user.
 *
 * @param {string} uid
 * @returns {Promise<{ readers: number }>}
 */
async function _sumPublishedReaders(uid) {
  try {
    const q = query(collection(db, PATHS.publicTales()), where('authorId', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return { readers: 0 };

    const total = snap.docs.reduce((acc, d) => acc + (d.data().readCount || 0), 0);
    return { readers: total };
  } catch {
    return { readers: 0 };
  }
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function getVal(id) {
  return document.getElementById(id)?.value.trim() ?? '';
}
