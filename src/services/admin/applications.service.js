// src/services/admin/applications.service.js
// Administrator review of author applications. Moderators may read the queue
// for context, but only an administrator may decide an application.

import { db, getDoc, serverTimestamp, writeBatch } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

/** Status values accepted by the list filter. `all` removes the where clause. */
export const APPLICATION_STATUS_FILTERS = Object.freeze(['pending', 'approved', 'rejected', 'all']);

/** Decisions a reviewer may record. */
export const APPLICATION_DECISIONS = Object.freeze(['approved', 'rejected']);

/** Firestore rules cap the application decision notes at 1000 characters. */
export const APPLICATION_NOTES_MAX = 1000;

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
    status: APPLICATION_STATUS_FILTERS.includes(requestedStatus) ? requestedStatus : 'pending',
    search: cleanSearch(source.search),
    direction: source.direction === 'asc' ? 'asc' : 'desc',
    cursor: source.cursor ?? null,
  };
}

/**
 * Read one cursor-paginated page of author applications.
 *
 * A search is a case-sensitive pen-name prefix range ordered by penName.
 * Combining it with the status filter needs the `status + penName` composite
 * index declared in firestore.indexes.json.
 *
 * @param {{ status?: 'pending' | 'approved' | 'rejected' | 'all', search?: string, direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 * @returns {Promise<{ items: Array<Record<string, unknown> & { id: string }>, lastDoc: unknown, hasMore: boolean }>}
 */
export async function listApplicationsPage(options = {}) {
  const { status, search, direction, cursor } = normalizeListOptions(options);
  const searching = search.length > 0;
  const conditions = [];
  if (status !== 'all') conditions.push(['status', '==', status]);
  if (searching) {
    conditions.push(['penName', '>=', search]);
    conditions.push(['penName', '<=', `${search}\uf8ff`]);
  }
  return fetchAdminPage(refs.authorApplications(), {
    conditions,
    orderField: searching ? 'penName' : 'createdAt',
    direction: searching ? 'asc' : direction,
    cursor,
  });
}

/**
 * Read a raw application. Returns null when the document does not exist.
 *
 * @param {string} applicationId
 * @returns {Promise<(Record<string, unknown> & { id: string }) | null>}
 */
export async function getApplication(applicationId) {
  if (!applicationId) throw new Error('Application ID is required.');
  const snap = await getDoc(refs.authorApplication(applicationId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Approve or reject a pending author application.
 *
 * Firestore rules allow only an administrator to update this collection and
 * restrict the write to status, reviewedAt, reviewedBy, and notes. The guard
 * here fails before any write so a moderator gets a clear error instead of a
 * permission-denied from the server.
 *
 * @param {string} applicationId
 * @param {'approved' | 'rejected'} decision
 * @param {string} [notes='']
 * @returns {Promise<{ applicationId: string, status: 'approved' | 'rejected', authorRoleGranted: boolean }>}
 */
export async function decideApplication(applicationId, decision, notes = '') {
  if (!applicationId) throw new Error('Application ID is required.');
  if (!APPLICATION_DECISIONS.includes(decision)) {
    throw new Error('Decision must be either "approved" or "rejected".');
  }

  const reviewNotes = String(notes ?? '').trim();
  if (reviewNotes.length > APPLICATION_NOTES_MAX) {
    throw new Error(`Review notes must be ${APPLICATION_NOTES_MAX} characters or fewer.`);
  }

  // Resolve the real actor first: no read or write happens for a non-staff caller.
  const identity = await getStaffIdentity();
  if (identity.role !== 'admin') {
    throw new Error('Only administrators can decide author applications.');
  }

  const application = await getApplication(applicationId);
  if (!application) throw new Error('Application not found.');
  if (application.status !== 'pending') {
    throw new Error('Only pending author applications can be decided.');
  }

  const applicantId =
    typeof application.applicantId === 'string' ? application.applicantId.trim() : '';
  if (!applicantId) throw new Error('This application has no applicant account attached.');

  const batch = writeBatch(db);
  batch.update(refs.authorApplication(applicationId), {
    status: decision,
    reviewedBy: identity.uid,
    reviewedAt: serverTimestamp(),
    notes: reviewNotes,
  });

  // Approval must unlock the author workspace, not just record a status. Read
  // the profile first so a missing document cannot fail the whole batch, and
  // never demote an existing administrator or moderator.
  let authorRoleGranted = false;
  if (decision === 'approved') {
    const profileSnap = await getDoc(refs.user(applicantId));
    if (profileSnap.exists()) {
      const profile = profileSnap.data() ?? {};
      const protectedRole = profile.role === 'admin' || profile.role === 'moderator';
      if (!protectedRole) {
        batch.update(refs.user(applicantId), {
          role: 'author',
          updatedAt: serverTimestamp(),
        });
        authorRoleGranted = true;
      }
    }
  }

  await batch.commit();

  const applicantLabel = application.penName || applicantId || 'an applicant';
  const roleNote =
    decision === 'approved' && !authorRoleGranted
      ? ' The applicant profile was missing or already held a staff role, so the author role was not changed.'
      : '';

  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: `application.${decision}`,
    targetType: 'authorApplication',
    targetId: applicationId,
    summary: `${decision === 'approved' ? 'Approved' : 'Rejected'} application from ${applicantLabel}.${roleNote}`,
  });

  return { applicationId, status: decision, authorRoleGranted };
}
