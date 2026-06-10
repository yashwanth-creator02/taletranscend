// src/state/app.state.js
// Shared runtime state that is relevant across multiple pages.
// This is NOT persisted — it is rebuilt on every page load from Firebase.
//
// Page-specific state (readerState, libraryState etc.) stays in
// src/pages/{page}/state.js. This file holds only what crosses page boundaries:
// the authenticated user identity and loaded reader preferences.
//
// All modules that need the current user or preferences read from here
// after initAuth resolves, rather than each keeping their own local copy.

import { createUserProfile } from './schemas/user.schema.js';
import { createReaderPreferences } from './schemas/user.schema.js';
import { IS_DEV_MODE } from '@config/app.config.js';
import { createLogger } from '@/utils';

const log = createLogger('AppState');

/**
 * @typedef {Object} AppState
 * @property {string|null}                                        userId
 * @property {import('./schemas/user.schema.js').UserProfile|null} profile
 * @property {import('./schemas/user.schema.js').ReaderPreferences} readerPrefs
 * @property {boolean}                                            prefsLoaded
 * @property {boolean}                                            profileLoaded
 * @property {boolean}                                            isDev
 * @property {(() => void)|null}                                  unsubscribeProfile
 */

/** @type {AppState} */
export const appState = {
  // The Firebase anonymous (or future named) user ID.
  // Set by initAuth callback on every page.
  userId: null,

  // Full user profile document from users/{uid}.
  // null until the first Firestore fetch completes.
  profile: null,

  // Reader preferences from users/{uid}/preferences/reader.
  // Initialised with defaults immediately so the reader never reads undefined.
  readerPrefs: createReaderPreferences(),

  // True once preferences have been fetched from Firestore at least once.
  // Used by reader/theme.js to decide whether to apply cloud prefs or localStorage.
  prefsLoaded: false,

  // True once the user profile document has been fetched at least once.
  profileLoaded: false,

  // Global Dev Mode toggle.
  isDev: IS_DEV_MODE,

  // Firestore onSnapshot unsubscribe handle for the profile listener.
  // Stored here so any page can call appState.unsubscribeProfile?.() on teardown.
  unsubscribeProfile: null,
};

/* ─────────────────────────────────────────────
   Mutators
   Thin helpers so modules never write to appState fields directly in scattered
   ways. All writes go through these so the shape stays consistent.
   ───────────────────────────────────────────── */

/**
 * Sets the authenticated user ID and resets loaded flags.
 * Called once per page by the initAuth callback.
 *
 * @param {string} uid
 */
export function setAppUser(uid) {
  appState.userId = uid;
  appState.profileLoaded = false;
  appState.prefsLoaded = false;
}

/**
 * Stores the fetched user profile and marks profileLoaded.
 *
 * @param {string} uid
 * @param {Object} data - Raw Firestore snap.data()
 */
export function setAppProfile(uid, data) {
  appState.profile = createUserProfile(uid, data);
  appState.profileLoaded = true;
}

/**
 * Stores the fetched reader preferences and marks prefsLoaded.
 * Falls back to current readerPrefs defaults for any missing fields.
 *
 * @param {Object} data - Raw Firestore snap.data()
 */
export function setAppReaderPrefs(data) {
  appState.readerPrefs = createReaderPreferences(data);
  appState.prefsLoaded = true;
}

log.debug('AppState initialized');
