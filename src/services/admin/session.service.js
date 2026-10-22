// src/services/admin/session.service.js
// Resolve the acting staff identity for privileged writes.
//
// Firestore rules require reviewedBy / actorId to equal the caller's UID and
// actorRole to match the caller's custom claim. This helper is the single
// client-side source for that identity. It never grants access: a caller
// without a staff claim is rejected here and by the rules.

import { auth } from '@fb/index.js';
import { createLogger } from '@/utils';

const log = createLogger('AdminSession');

/** @typedef {{ uid: string, role: 'admin' | 'moderator', email: string, displayName: string }} StaffIdentity */

/**
 * @returns {import('firebase/auth').User | null}
 */
export function getSignedInUser() {
  return auth.currentUser ?? null;
}

/**
 * Resolve the signed-in staff account and its claim-derived role.
 * Refreshes the ID token so a role granted in another session is visible
 * without waiting for the normal token rotation.
 *
 * @returns {Promise<StaffIdentity>}
 */
export async function getStaffIdentity() {
  const user = getSignedInUser();
  if (!user) {
    throw new Error('Sign in with a staff account before performing this action.');
  }

  let tokenResult;
  try {
    tokenResult = await user.getIdTokenResult(true);
  } catch (err) {
    log.warn('Could not refresh the staff token', err);
    throw new Error('Could not verify staff credentials. Try signing in again.');
  }

  const claims = tokenResult?.claims ?? {};
  /** @type {'admin' | 'moderator' | null} */
  const role = claims.admin === true ? 'admin' : claims.moderator === true ? 'moderator' : null;
  if (!role) {
    throw new Error('This account does not hold an archive staff claim.');
  }

  return {
    uid: user.uid,
    role,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
  };
}

/**
 * Require any signed-in account. Used by author-owned actions where the rules
 * check ownership rather than a staff claim.
 *
 * @returns {import('firebase/auth').User}
 */
export function requireSignedInUser() {
  const user = getSignedInUser();
  if (!user) throw new Error('Sign in before performing this action.');
  return user;
}
