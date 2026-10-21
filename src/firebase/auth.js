// src/firebase/auth.js
// Firebase Authentication setup and initialization helper.
// Uses anonymous authentication only.

import {
  getAuth,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import app from './app.js';
import { createLogger } from '@/utils';
import {
  clearAuthMemory,
  isRememberedDurably,
  rememberAuth,
} from '@services/auth-memory.storage.js';

const log = createLogger('Auth');

export const auth = getAuth(app);

/**
 * Initializes authentication for the application.
 * Reuses an existing anonymous session if one exists in the browser;
 * otherwise creates a new one. Guarantees onReady fires exactly once.
 *
 * A session that Firebase restored from persistence predates this page load.
 * When it belongs to a real (non-anonymous) account it is remembered, so a
 * signed-in visitor is never asked to log in again even if the visit flags
 * were lost — using whatever durability the visitor already chose, so a
 * session-only login is not upgraded to a durable one just because another
 * page loaded. A freshly auto-created anonymous session is deliberately NOT
 * remembered — the app creates one on most pages, and treating that as
 * "returning visitor" would disarm the first-visit login gate.
 *
 * @param {(user: import('firebase/auth').User) => void} onReady
 */
export function initAuth(onReady) {
  log.info('Initialising authentication...');
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe(); // Prevent duplicate calls if auth state flips again
    if (user) {
      log.info('Existing session found', { uid: user.uid, isAnonymous: user.isAnonymous });
      if (!user.isAnonymous) {
        rememberAuth(
          { uid: user.uid, anonymous: false, method: 'restore' },
          { durable: isRememberedDurably() }
        );
      }
      onReady(user);
    } else {
      log.info('No session found. Creating anonymous identity...');
      signInAnonymously(auth)
        .then((credential) => {
          log.info('Anonymous session established', { uid: credential.user.uid });
          onReady(credential.user);
        })
        .catch((err) => {
          log.error('Anonymous sign-in failed:', err);
        });
    }
  });
}

/**
 * Applies the "Keep me signed in" preference to Firebase's own persistence
 * layer. Durable keeps the session across browser restarts; non-durable
 * scopes it to the current browser session.
 *
 * Must be called BEFORE signing in, because that is the moment Firebase
 * writes the session.
 *
 * @param {boolean} durable
 * @returns {Promise<boolean>} True when the preference was applied.
 */
export async function setRememberPreference(durable = true) {
  try {
    await setPersistence(auth, durable ? browserLocalPersistence : browserSessionPersistence);
    return true;
  } catch (err) {
    log.warn('Could not apply persistence preference:', err?.message || err);
    return false;
  }
}

/**
 * Signs out and forgets the remembered authentication, so the first-visit
 * login gate engages again on the next visit.
 *
 * The memory is forgotten only after Firebase confirms the sign-out: a failed
 * sign-out must not leave a still-signed-in visitor facing the gate.
 *
 * @returns {Promise<void>}
 */
export async function signOutAndForget() {
  await signOut(auth);
  clearAuthMemory();
}

/**
 * Signs in the user with Google.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Upgrades the current anonymous user to a Google account.
 * Links the current anonymous session with a Google identity.
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function upgradeAnonymousToGoogle() {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in.');
  }
  const provider = new GoogleAuthProvider();
  const result = await linkWithPopup(auth.currentUser, provider);
  return result.user;
}

/**
 * Signs in a user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Registers a new user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').User>}
 */
export async function registerWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

/**
 * Sends a password reset email.
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Deletes the currently authenticated user's account from Firebase Auth.
 * @returns {Promise<void>}
 */
export async function deleteCurrentUser() {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in.');
  }
  await deleteUser(auth.currentUser);
}

export {
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
};
