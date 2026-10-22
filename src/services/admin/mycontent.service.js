// src/services/admin/mycontent.service.js
// Author-owned content reads and deletion petitions. The rules authorise these
// operations by ownership, not by a staff claim: an author may read only their
// own tales and deletion requests, and may create a petition for their own tale.

import { addDoc, serverTimestamp, auth } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { ADMIN_PAGE_SIZE, fetchAdminPage } from './pagination.service.js';

/** Deletion reasons must match the bounds enforced by firestore.rules. */
export const DELETION_REASON_MIN = 5;
export const DELETION_REASON_MAX = 2000;

/**
 * Fetch a paginated page of the logged-in author's tales.
 *
 * @param {import('firebase/firestore').QueryDocumentSnapshot | null} [cursor]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string }>,
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   hasMore: boolean
 * }>}
 */
export async function getAuthorTalesPage(cursor = null) {
  const user = auth.currentUser;
  if (!user) {
    return { items: [], lastDoc: null, hasMore: false };
  }

  return fetchAdminPage(refs.tales(), {
    conditions: [['authorId', '==', user.uid]],
    orderField: 'publishedAt',
    direction: 'desc',
    pageSize: ADMIN_PAGE_SIZE,
    cursor,
  });
}

/**
 * Fetch a paginated page of the logged-in author's deletion requests.
 *
 * @param {import('firebase/firestore').QueryDocumentSnapshot | null} [cursor]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string }>,
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   hasMore: boolean
 * }>}
 */
export async function getAuthorDeletionRequestsPage(cursor = null) {
  const user = auth.currentUser;
  if (!user) {
    return { items: [], lastDoc: null, hasMore: false };
  }

  return fetchAdminPage(refs.deletionRequests(), {
    conditions: [['userId', '==', user.uid]],
    orderField: 'createdAt',
    direction: 'desc',
    pageSize: ADMIN_PAGE_SIZE,
    cursor,
  });
}

/**
 * Initiate a deletion request for one of the author's tales. The reason is
 * validated before the write because the rules require 5-2000 characters and a
 * rejected write would be indistinguishable from a network failure in the UI.
 *
 * @param {string} taleId
 * @param {string} reason
 * @returns {Promise<string>} Created request ID
 */
export async function requestTaleDeletion(taleId, reason = '') {
  const id = String(taleId ?? '').trim();
  if (!id) throw new Error('A tale ID is required.');

  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before requesting a tale deletion.');

  const trimmedReason = String(reason ?? '').trim();
  if (trimmedReason.length < DELETION_REASON_MIN || trimmedReason.length > DELETION_REASON_MAX) {
    throw new Error(
      `A deletion reason must be between ${DELETION_REASON_MIN} and ${DELETION_REASON_MAX} characters.`
    );
  }

  const docRef = await addDoc(refs.deletionRequests(), {
    userId: user.uid,
    taleId: id,
    reason: trimmedReason,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}
