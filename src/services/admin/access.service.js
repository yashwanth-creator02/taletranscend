// src/services/admin/access.service.js
// Resolve who may enter the admin dashboard and which modules they may open.
//
// Authority is the Firebase Auth custom claim, never the users/{uid}.role
// profile field. The profile is consulted only to recognise an author, because
// author status is application data rather than a staff claim.
//
// This service is a UI convenience, not a security boundary. Every module is
// backed by Firestore rules that re-check the claim on every read and write.

import { auth } from '@fb/index.js';
import { createLogger } from '@/utils';
import { getAuthorStatus } from '../author.service.js';

const log = createLogger('AdminAccess');

/** @typedef {'guest' | 'user' | 'author' | 'moderator' | 'admin'} DashboardRole */

/**
 * The dashboard's module registry. Order is the sidebar order.
 * @type {ReadonlyArray<{id: string, label: string, icon: string, roles: DashboardRole[]}>}
 */
export const DASHBOARD_MODULES = Object.freeze([
  { id: 'overview', label: 'Overview', icon: 'layout-dashboard', roles: ['admin', 'moderator'] },
  { id: 'users', label: 'Users & Roles', icon: 'users', roles: ['admin'] },
  { id: 'deletions', label: 'Tale Deletions', icon: 'book-x', roles: ['admin', 'moderator'] },
  { id: 'reports', label: 'Reports', icon: 'flag', roles: ['admin', 'moderator'] },
  {
    id: 'applications',
    label: 'Author Applications',
    icon: 'file-text',
    roles: ['admin', 'moderator'],
  },
  { id: 'audit', label: 'Audit Log', icon: 'scroll-text', roles: ['admin'] },
  { id: 'settings', label: 'Site Settings', icon: 'settings', roles: ['admin'] },
  { id: 'author', label: 'Author Studio', icon: 'feather', roles: ['author', 'admin'] },
]);

/**
 * @param {DashboardRole} role
 * @returns {{role: DashboardRole, isAdmin: boolean, isModerator: boolean, isAuthor: boolean, isStaff: boolean, canEnter: boolean}}
 */
function makeAccess(role) {
  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const isAuthor = role === 'author';
  return {
    role,
    isAdmin,
    isModerator,
    isAuthor,
    isStaff: isAdmin || isModerator,
    canEnter: isAdmin || isModerator || isAuthor,
  };
}

/**
 * Resolve the current user's dashboard access.
 *
 * Staff resolve from the cached ID token (0 Firestore reads). Everyone else
 * resolves through the cached author-status lookup (at most 1 profile read per
 * two minutes). A failed token read is a denial, never an elevation.
 *
 * @param {import('firebase/auth').User | null} [user]
 * @returns {Promise<ReturnType<typeof makeAccess>>}
 */
export async function resolveDashboardAccess(user = auth.currentUser) {
  if (!user) return makeAccess('guest');

  try {
    // Force-fetch the latest ID token so custom claims set while this
    // session was idle are reflected without waiting for a 60-minute
    // token rotation. forceRefresh: true is safe — it simply re-fetches.
    const tokenResult = await user.getIdTokenResult?.(true);
    const claims = tokenResult?.claims ?? {};
    if (claims.admin === true) return makeAccess('admin');
    if (claims.moderator === true) return makeAccess('moderator');
  } catch (err) {
    log.warn('Could not read custom claims; denying dashboard access', err);
    return makeAccess('user');
  }

  try {
    const author = await getAuthorStatus(user.uid);
    if (author?.isAuthor) return makeAccess('author');
  } catch (err) {
    log.warn('Could not resolve author status', err);
  }

  return makeAccess('user');
}

/**
 * @param {ReturnType<typeof makeAccess>} access
 * @returns {typeof DASHBOARD_MODULES[number][]}
 */
export function getAllowedModules(access) {
  if (!access?.canEnter) return [];
  return DASHBOARD_MODULES.filter((module) => module.roles.includes(access.role));
}

/**
 * @param {ReturnType<typeof makeAccess>} access
 * @param {string} moduleId
 * @returns {boolean}
 */
export function canAccessModule(access, moduleId) {
  if (!access?.canEnter) return false;
  return DASHBOARD_MODULES.some(
    (module) => module.id === moduleId && module.roles.includes(access.role)
  );
}

/**
 * The first module the role may open, or null when the role cannot enter.
 * @param {ReturnType<typeof makeAccess>} access
 * @returns {string | null}
 */
export function defaultModuleFor(access) {
  return getAllowedModules(access)[0]?.id ?? null;
}

/**
 * Human label for a role, used by the shell and audit entries.
 * @param {DashboardRole} role
 * @returns {string}
 */
export function roleLabel(role) {
  return (
    {
      guest: 'Visitor',
      user: 'Reader',
      author: 'Chronicler',
      moderator: 'Moderator',
      admin: 'Administrator',
    }[role] ?? 'Reader'
  );
}
