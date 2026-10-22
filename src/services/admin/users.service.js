// src/services/admin/users.service.js
// Administrator reads and flag writes for real reader profiles.
//
// The users collection is the source of truth for profiles. Nothing here
// derives a user from tale authorship: a reader without a published tale is
// still a reader. Flag writes are deliberately narrow because firestore.rules
// rejects any key outside isBanned, isVerifiedWriter, role, and updatedAt.

import { getCountFromServer, getDoc, query, serverTimestamp, updateDoc, where } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { createLogger } from '@/utils';
import { ADMIN_PAGE_SIZE, fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

const log = createLogger('AdminUsers');

/** Roles accepted by the Firestore administrator update branch. */
export const USER_ROLES = Object.freeze(['user', 'author', 'moderator', 'admin']);

/** Firebase Auth UIDs and Firestore auto-ids are at least 20 characters. */
const UID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

/** @param {unknown} value @param {string} key */
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

/**
 * Shape a Firestore profile document for the admin UI. The document id is the
 * uid, so both names are exposed for callers that use either convention.
 *
 * @param {string} id
 * @param {Record<string, unknown>} [data]
 * @returns {Record<string, unknown> & { id: string, uid: string }}
 */
function normalizeUser(id, data = {}) {
  return { ...data, id, uid: id };
}

/**
 * @param {string} term
 * @returns {boolean}
 */
function looksLikeUid(term) {
  return UID_PATTERN.test(term);
}

/**
 * Read one cursor-paginated page of real user profiles.
 *
 * Search is a name prefix query, ordered by name so Firestore needs no
 * composite index. When a full uid is pasted, the exact profile is attempted
 * first. A missing exact profile falls through to the name prefix query instead
 * of returning a misleading empty page.
 *
 * @param {{
 *   search?: string,
 *   sort?: 'name' | 'newest',
 *   cursor?: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   pageSize?: number
 * }} [options]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string, uid: string }>,
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   hasMore: boolean
 * }>}
 */
export async function listUsersPage({
  search = '',
  sort = 'name',
  cursor = null,
  pageSize = ADMIN_PAGE_SIZE,
} = {}) {
  const term = String(search ?? '').trim();
  const sortMode = sort === 'newest' ? 'newest' : 'name';

  if (term && looksLikeUid(term)) {
    try {
      const exact = await getDoc(refs.user(term));
      if (exact.exists()) {
        return {
          items: [normalizeUser(exact.id, exact.data())],
          lastDoc: null,
          hasMore: false,
        };
      }
    } catch (err) {
      log.warn('Exact user id lookup failed; falling back to a name search', err);
    }
  }

  // A name range requires name to be the first orderBy. Search therefore stays
  // name-ordered even when the caller asked for newest-first.
  const searching = term.length > 0;
  const conditions = searching
    ? [
        ['name', '>=', term],
        ['name', '<=', `${term}\uf8ff`],
      ]
    : [];

  const page = await fetchAdminPage(refs.users(), {
    conditions,
    orderField: searching ? 'name' : sortMode === 'newest' ? 'joinedAt' : 'name',
    direction: searching || sortMode !== 'newest' ? 'asc' : 'desc',
    cursor,
    pageSize,
  });

  return {
    items: page.items.map(({ id, ...data }) => normalizeUser(id, data)),
    lastDoc: page.lastDoc,
    hasMore: page.hasMore,
  };
}

/**
 * Fetch one real profile plus a live count of tales authored by that uid.
 * A failed count returns taleCount: null rather than a guessed number.
 *
 * @param {string} uid
 * @returns {Promise<(Record<string, unknown> & { id: string, uid: string, taleCount: number | null }) | null>}
 */
export async function getUserDetail(uid) {
  if (!uid) return null;

  const snap = await getDoc(refs.user(uid));
  if (!snap.exists()) return null;

  const profile = normalizeUser(snap.id, snap.data());

  let taleCount = null;
  try {
    const countSnap = await getCountFromServer(query(refs.tales(), where('authorId', '==', uid)));
    const count = countSnap.data()?.count;
    taleCount = Number.isFinite(count) ? count : null;
  } catch (err) {
    log.warn(`Could not read the tale count for user ${uid}`, err);
  }

  return { ...profile, taleCount };
}

/**
 * Update the administrator-managed flags on a profile.
 *
 * The patch contains only the fields the caller supplied plus a Firestore
 * server timestamp. The audit actor comes from the signed-in staff claim, never
 * from the target uid.
 *
 * @param {string} uid
 * @param {{ isBanned?: boolean, isVerifiedWriter?: boolean, role?: string }} flags
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateUserFlags(uid, flags = {}) {
  if (!uid) throw new Error('A user id is required.');

  const nextFlags = flags && typeof flags === 'object' ? flags : {};
  /** @type {Record<string, unknown>} */
  const updates = {};

  if (hasOwn(nextFlags, 'isBanned')) {
    if (typeof nextFlags.isBanned !== 'boolean') {
      throw new Error('isBanned must be a boolean.');
    }
    updates.isBanned = nextFlags.isBanned;
  }

  if (hasOwn(nextFlags, 'isVerifiedWriter')) {
    if (typeof nextFlags.isVerifiedWriter !== 'boolean') {
      throw new Error('isVerifiedWriter must be a boolean.');
    }
    updates.isVerifiedWriter = nextFlags.isVerifiedWriter;
  }

  if (hasOwn(nextFlags, 'role')) {
    if (typeof nextFlags.role !== 'string' || !USER_ROLES.includes(nextFlags.role)) {
      throw new Error(`role must be one of: ${USER_ROLES.join(', ')}.`);
    }
    updates.role = nextFlags.role;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('Provide at least one user flag to update.');
  }

  // Resolve the real caller before mutating, so a missing staff claim never
  // produces an unaudited write attempt.
  const identity = await getStaffIdentity();

  await updateDoc(refs.user(uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  try {
    const audit = await writeAdminAuditLog({
      actorId: identity.uid,
      actorRole: identity.role,
      action: 'user.flags.update',
      targetType: 'user',
      targetId: uid,
      summary: `Updated ${Object.keys(updates).join(', ')} for user ${uid}.`.slice(0, 1000),
    });
    if (!audit?.success) {
      log.warn('The user update was saved but its audit entry failed', { uid });
    }
  } catch (err) {
    log.warn('The user update was saved but its audit entry failed', err);
  }

  return { ...updates };
}
