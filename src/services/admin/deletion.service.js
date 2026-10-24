// src/services/admin/deletion.service.js
// Staff review of tale deletion petitions. Reading is paginated; deciding is
// destructive on approval and always written to the append-only audit trail
// under the real caller's identity.

import { db, getDoc, serverTimestamp, writeBatch } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { createNotificationForUser } from '../notification.service.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

/** Status values accepted by the list filter. `all` removes the where clause. */
export const DELETION_STATUS_FILTERS = Object.freeze(['pending', 'approved', 'rejected', 'all']);

/** Decisions a reviewer may record. */
export const DELETION_DECISIONS = Object.freeze(['approved', 'rejected']);

/** Review notes are bounded so a single petition cannot bloat the document. */
export const DELETION_NOTES_MAX = 1000;

/**
 * @param {unknown} value
 * @param {number} [max=200]
 * @returns {string}
 */
function cleanSearch(value, max = 200) {
  const text = String(value ?? '').trim();
  return text.length <= max ? text : text.slice(0, max);
}

/**
 * @param {{ status?: string, search?: string, direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 * @returns {{ status: string, search: string, direction: 'asc' | 'desc', cursor: unknown }}
 */
function normalizeListOptions(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  const requestedStatus =
    typeof source.status === 'string' ? source.status.trim().toLowerCase() : 'pending';
  return {
    status: DELETION_STATUS_FILTERS.includes(requestedStatus) ? requestedStatus : 'pending',
    search: cleanSearch(source.search),
    direction: source.direction === 'asc' ? 'asc' : 'desc',
    cursor: source.cursor ?? null,
  };
}

/**
 * Read one cursor-paginated page of deletion requests.
 *
 * A search is a tale-id prefix range ordered by taleId. Combining it with the
 * status filter needs the `status + taleId` composite index declared in
 * firestore.indexes.json.
 *
 * @param {{ status?: 'pending' | 'approved' | 'rejected' | 'all', search?: string, direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 * @returns {Promise<{ items: Array<Record<string, unknown> & { id: string }>, lastDoc: unknown, hasMore: boolean }>}
 */
export async function listDeletionRequestsPage(options = {}) {
  const { status, search, direction, cursor } = normalizeListOptions(options);
  const searching = search.length > 0;
  const conditions = [];
  if (status !== 'all') conditions.push(['status', '==', status]);
  if (searching) {
    conditions.push(['taleId', '>=', search]);
    conditions.push(['taleId', '<=', `${search}\uf8ff`]);
  }
  return fetchAdminPage(refs.deletionRequests(), {
    conditions,
    orderField: searching ? 'taleId' : 'createdAt',
    direction: searching ? 'asc' : direction,
    cursor,
  });
}

/**
 * Read a raw deletion request. Returns null when the document does not exist.
 *
 * @param {string} requestId
 * @returns {Promise<(Record<string, unknown> & { id: string }) | null>}
 */
export async function getDeletionRequest(requestId) {
  if (!requestId) throw new Error('Deletion request ID is required.');
  const snap = await getDoc(refs.deletionRequest(requestId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Read a deletion request together with the tale it targets, so reviewers can
 * see the chronicle title and author before making an irreversible decision.
 * A missing tale is not an error: after an approval the tale is gone.
 *
 * @param {string} requestId
 * @returns {Promise<(Record<string, unknown> & {
 *   id: string,
 *   tale: { id: string, title: string, authorId: string, authorName: string } | null
 * }) | null>}
 */
export async function getDeletionRequestDetail(requestId) {
  const request = await getDeletionRequest(requestId);
  if (!request) return null;

  /** @type {{ id: string, title: string, authorId: string, authorName: string } | null} */
  let tale = null;
  if (request.taleId) {
    try {
      const taleSnap = await getDoc(refs.tale(request.taleId));
      if (taleSnap.exists()) {
        const data = taleSnap.data() ?? {};
        tale = {
          id: taleSnap.id,
          title: data.title ?? '',
          authorId: data.authorId ?? '',
          authorName: data.authorName ?? '',
        };
      }
    } catch {
      // The target tale may already be gone or unreadable; the petition still loads.
      tale = null;
    }
  }

  return { ...request, tale };
}

/**
 * Approve or reject a pending deletion request.
 *
 * Approval is genuinely destructive: the tale delete and the request update
 * commit in one atomic batch, so either the tale is gone and the petition reads
 * approved, or neither write happens and the petition stays pending and
 * retryable. The audit entry uses the caller's real UID and claim; the author is
 * notified through the existing notification service.
 *
 * @param {string} requestId
 * @param {'approved' | 'rejected'} decision
 * @param {{ notes?: string }} [options]
 * @returns {Promise<{ requestId: string, status: 'approved' | 'rejected' }>}
 */
export async function decideDeletionRequest(requestId, decision, { notes = '' } = {}) {
  if (!requestId) throw new Error('Deletion request ID is required.');
  if (!DELETION_DECISIONS.includes(decision)) {
    throw new Error('Decision must be either "approved" or "rejected".');
  }

  const adminNotes = String(notes ?? '').trim();
  if (adminNotes.length > DELETION_NOTES_MAX) {
    throw new Error(`Review notes must be ${DELETION_NOTES_MAX} characters or fewer.`);
  }

  // Resolve the real actor first: no read or write happens for a non-staff caller.
  const identity = await getStaffIdentity();
  const request = await getDeletionRequestDetail(requestId);
  if (!request) throw new Error('Deletion request not found.');
  if (request.status !== 'pending') {
    throw new Error('Only pending deletion requests can be decided.');
  }

  if (decision === 'approved' && !request.taleId) {
    throw new Error('Deletion request does not reference a tale.');
  }
  if (decision === 'approved') {
    if (!request.tale) {
      throw new Error('The referenced tale no longer exists. Reject this request instead.');
    }
    if (request.tale.authorId !== request.userId) {
      throw new Error('This petition does not match the current owner of the tale.');
    }
  }

  /** @type {Record<string, unknown>} */
  const update = {
    status: decision,
    reviewedBy: identity.uid,
    reviewedAt: serverTimestamp(),
  };
  if (adminNotes) update.adminNotes = adminNotes;

  // The decision and the destructive delete commit together: either the tale
  // is gone and the petition says approved, or neither write happened.
  const batch = writeBatch(db);
  batch.update(refs.deletionRequest(requestId), update);
  if (decision === 'approved') {
    batch.delete(refs.tale(request.taleId));
  }
  await batch.commit();

  const taleTitle = request.tale?.title || request.taleId || 'an untitled tale';
  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: `deletion.${decision}`,
    targetType: 'deletionRequest',
    targetId: requestId,
    summary:
      decision === 'approved'
        ? `Approved deletion of "${taleTitle}" (tale ${request.taleId || 'unknown'}).`
        : `Rejected deletion of "${taleTitle}" (tale ${request.taleId || 'unknown'}).`,
  });

  if (request.userId) {
    const approved = decision === 'approved';
    const notificationBody = approved
      ? `Your deletion request for "${taleTitle}" was approved. The public tale record has been removed from the archive.`
      : `Your deletion request for "${taleTitle}" was declined. The tale remains in the archive.`;
    await createNotificationForUser(request.userId, {
      type: 'system',
      title: approved ? 'Tale Deletion Approved' : 'Tale Deletion Declined',
      body: adminNotes ? `${notificationBody} Reviewer notes: ${adminNotes}` : notificationBody,
      actionUrl: 'profile.html',
      taleId: request.taleId ?? null,
    });
  }

  return { requestId, status: decision };
}
