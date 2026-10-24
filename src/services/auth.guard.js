// src/services/auth.guard.js
// Shared client-side gate for guest (anonymous Firebase session) visitors.
//
// Guests may read every public surface. Any action that creates content,
// engagement, or a contribution must come from a registered account. The
// Firestore rules enforce the same boundary; this module only explains the
// refusal and offers the sign-in / sign-up path.

import { auth } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';

const REGISTRATION_TITLE = 'Registration required';

/**
 * Returns true when the current Firebase user is a real account.
 *
 * Anonymous Firebase sessions are the app's guests. A missing `isAnonymous`
 * flag is treated as registered so unit-test doubles that only provide a uid
 * keep working; real Firebase users always expose a boolean.
 *
 * @param {{ isAnonymous?: boolean } | null} [user]
 * @returns {boolean}
 */
export function isRegisteredUser(user = auth?.currentUser) {
  return Boolean(user && user.isAnonymous !== true);
}

/**
 * Builds the login URL that returns the visitor to the current page.
 *
 * @param {{ pathname?: string, search?: string, hash?: string } | null} [location]
 * @returns {string}
 */
export function buildLoginUrl(location = typeof window !== 'undefined' ? window.location : null) {
  if (!location) return '/login.html';

  const returnUrl = `${location.pathname || '/'}${location.search || ''}${location.hash || ''}`;
  return `/login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
}

/**
 * Shows the guest read-only toast with a sign-in / sign-up action.
 *
 * @param {string} [action] Short verb phrase, e.g. "post a comment".
 */
export function showGuestGateToast(action = 'join the chronicle') {
  showToast(
    `Only registered readers can ${action}. Guests can read every tale, but must sign in or create an account to join the chronicle.`,
    {
      type: 'warning',
      title: REGISTRATION_TITLE,
      duration: 8000,
      action: {
        label: 'Sign in or sign up',
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.assign(buildLoginUrl());
          }
        },
      },
    }
  );
}

/**
 * Returns true when the visitor may perform a write action. Otherwise shows
 * the registration toast and returns false.
 *
 * @param {string} [action]
 * @returns {boolean}
 */
export function requireRegisteredUser(action = 'join the chronicle') {
  if (isRegisteredUser()) return true;
  showGuestGateToast(action);
  return false;
}
