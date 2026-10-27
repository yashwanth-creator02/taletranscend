// src/services/admin/reports.service.js
// Staff triage of reader reports. Resolution is a decision on the report, not
// a notification: the only side effects are the status update and the audit
// entry written under the caller's real identity.

import { getDoc, serverTimestamp, setDoc, updateDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { createNotificationForUser } from '../notification.service.js';
import {
  REPORT_CATEGORY_LABELS,
  REPORT_RESPONSE_MAX,
  REPORT_STATUS_LABELS,
} from '../report.service.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

/** Status values accepted by the list filter. `all` removes the where clause. */
export const REPORT_STATUS_FILTERS = Object.freeze([
  'pending',
  'under_review',
  'responded',
  'resolved',
  'dismissed',
  'all',
]);

/** Decisions a reviewer may record. */
export const REPORT_RESOLUTIONS = Object.freeze(['resolved', 'dismissed']);

/** Resolution notes are bounded to match the application-notes guard. */
export const REPORT_NOTES_MAX = 1000;

/** Private moderation notes are staff-only and never mirrored to the reporter. */
export const REPORT_PRIVATE_NOTE_MAX = 2000;

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
    status: REPORT_STATUS_FILTERS.includes(requestedStatus) ? requestedStatus : 'pending',
    search: cleanSearch(source.search),
    direction: source.direction === 'asc' ? 'asc' : 'desc',
    cursor: source.cursor ?? null,
  };
}

/**
 * @param {unknown} value
 * @param {number} [max=160]
 * @returns {string}
 */
function summarizeText(value, max = 160) {
  const text = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}\u2026`;
}

/**
 * Read one cursor-paginated page of reports.
 *
 * A search is a target-id prefix range ordered by targetId. Combining it with
 * the status filter needs the `status + targetId` composite index declared in
 * firestore.indexes.json.
 *
 * @param {{ status?: 'pending' | 'resolved' | 'dismissed' | 'all', search?: string, direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 * @returns {Promise<{ items: Array<Record<string, unknown> & { id: string }>, lastDoc: unknown, hasMore: boolean }>}
 */
export async function listReportsPage(options = {}) {
  const { status, search, direction, cursor } = normalizeListOptions(options);
  const searching = search.length > 0;
  const conditions = [];
  if (status !== 'all') conditions.push(['status', '==', status]);
  if (searching) {
    conditions.push(['targetId', '>=', search]);
    conditions.push(['targetId', '<=', `${search}\uf8ff`]);
  }
  return fetchAdminPage(refs.reports(), {
    conditions,
    orderField: searching ? 'targetId' : 'createdAt',
    direction: searching ? 'asc' : direction,
    cursor,
  });
}

/**
 * Read a raw report. Returns null when the document does not exist.
 *
 * @param {string} reportId
 * @returns {Promise<(Record<string, unknown> & { id: string }) | null>}
 */
export async function getReport(reportId) {
  if (!reportId) throw new Error('Report ID is required.');
  const snap = await getDoc(refs.report(reportId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Read the reported target when it is still available. This is a best-effort
 * summary for the reviewer; a missing or unreadable target must not stop the
 * report itself from being reviewed.
 *
 * @param {Record<string, unknown> & { id: string }} report
 * @returns {Promise<{ type: string, id: string, label: string, detail: string } | null>}
 */
async function loadTargetSummary(report) {
  if (!report.targetId) return null;

  try {
    if (report.targetType === 'tale') {
      const snap = await getDoc(refs.tale(report.targetId));
      if (!snap.exists()) return null;
      const data = snap.data() ?? {};
      return {
        type: 'tale',
        id: snap.id,
        label: data.title || 'Untitled tale',
        detail: [data.authorName, data.authorId].filter(Boolean).join(' / '),
      };
    }

    if (report.targetType === 'comment') {
      const taleId = report.taleId || report.targetTaleId;
      if (!taleId) return null;
      const snap = await getDoc(refs.comment(taleId, report.targetId));
      if (!snap.exists()) return null;
      const data = snap.data() ?? {};
      return {
        type: 'comment',
        id: snap.id,
        label: summarizeText(data.text) || 'Comment',
        detail: [data.authorName, `tale ${taleId}`].filter(Boolean).join(' / '),
      };
    }

    if (report.targetType === 'reply') {
      const taleId = report.taleId || report.targetTaleId;
      const commentId = report.commentId || report.parentCommentId;
      if (!taleId || !commentId) return null;
      const snap = await getDoc(refs.commentReply(taleId, commentId, report.targetId));
      if (!snap.exists()) return null;
      const data = snap.data() ?? {};
      return {
        type: 'reply',
        id: snap.id,
        label: summarizeText(data.text) || 'Reply',
        detail: [data.authorName, `comment ${commentId}`].filter(Boolean).join(' / '),
      };
    }

    if (report.targetType === 'user') {
      const snap = await getDoc(refs.user(report.targetId));
      if (!snap.exists()) return null;
      const data = snap.data() ?? {};
      return {
        type: 'user',
        id: snap.id,
        label: data.penName || data.displayName || data.name || 'Unnamed reader',
        detail: snap.id,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Read a report together with a best-effort summary of the reported target.
 *
 * @param {string} reportId
 * @returns {Promise<(Record<string, unknown> & {
 *   id: string,
 *   targetSummary: { type: string, id: string, label: string, detail: string } | null
 * }) | null>}
 */
export async function getReportDetail(reportId) {
  const report = await getReport(reportId);
  if (!report) return null;
  const targetSummary = await loadTargetSummary(report);
  let privateNote = null;
  try {
    const noteSnap = await getDoc(refs.reportPrivateNote(reportId));
    if (noteSnap.exists()) privateNote = { id: noteSnap.id, ...noteSnap.data() };
  } catch {
    privateNote = null;
  }
  return {
    ...report,
    targetSummary,
    privateNote,
    categoryLabel: REPORT_CATEGORY_LABELS[report.category] ?? 'General',
    statusLabel: REPORT_STATUS_LABELS[report.status] ?? report.status,
  };
}

/**
 * Resolve or dismiss a pending report. The status update and audit entry use
 * the caller's real UID and claim. No user notification is sent.
 *
 * @param {string} reportId
 * @param {'resolved' | 'dismissed'} resolution
 * @param {{ notes?: string }} [options]
 * @returns {Promise<{ reportId: string, status: 'resolved' | 'dismissed' }>}
 */
export async function resolveReport(reportId, resolution, { notes = '' } = {}) {
  if (!reportId) throw new Error('Report ID is required.');
  if (!REPORT_RESOLUTIONS.includes(resolution)) {
    throw new Error('Resolution must be either "resolved" or "dismissed".');
  }

  const resolutionNotes = String(notes ?? '').trim();
  if (resolutionNotes.length > REPORT_NOTES_MAX) {
    throw new Error(`Resolution notes must be ${REPORT_NOTES_MAX} characters or fewer.`);
  }

  // Resolve the real actor first: no read or write happens for a non-staff caller.
  const identity = await getStaffIdentity();
  const report = await getReport(reportId);
  if (!report) throw new Error('Report not found.');
  if (report.status !== 'pending') {
    throw new Error('Only pending reports can be decided.');
  }

  /** @type {Record<string, unknown>} */
  const update = {
    status: resolution,
    reviewedBy: identity.uid,
    reviewedAt: serverTimestamp(),
  };
  if (resolutionNotes) update.resolutionNotes = resolutionNotes;

  await updateDoc(refs.report(reportId), update);
  try {
    await setDoc(
      refs.reportHistoryEntry(reportId),
      {
        status: resolution,
        userVisibleStatus: REPORT_STATUS_LABELS[resolution],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // A missing legacy mirror must not block the decision itself.
  }

  const target = [report.targetType, report.targetId].filter(Boolean).join(' ');
  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: `report.${resolution}`,
    targetType: 'report',
    targetId: reportId,
    summary: `Report ${resolution} for ${target || 'an unknown target'}.`,
  });

  return { reportId, status: resolution };
}

/**
 * Marks a pending report as under review.
 *
 * @param {string} reportId
 */
export async function markReportUnderReview(reportId) {
  if (!reportId) throw new Error('Report ID is required.');
  const identity = await getStaffIdentity();
  const report = await getReport(reportId);
  if (!report) throw new Error('Report not found.');
  if (!['pending', 'under_review'].includes(report.status)) {
    throw new Error('This report has already been decided.');
  }
  await updateDoc(refs.report(reportId), {
    status: 'under_review',
    reviewedBy: identity.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  try {
    await setDoc(
      refs.reportHistoryEntry(reportId),
      {
        status: 'under_review',
        userVisibleStatus: REPORT_STATUS_LABELS.under_review,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // The report is authoritative; the mirror can be rebuilt by staff.
  }
  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: 'report.under_review',
    targetType: 'report',
    targetId: reportId,
    summary: 'Marked a report as under review.',
  });
  return { reportId, status: 'under_review' };
}

/**
 * Sends a user-visible response, updates the reporter-safe history, stores a
 * private staff note, and delivers the response to the reporter's inbox.
 *
 * @param {string} reportId
 * @param {{ response: string, status?: 'responded'|'resolved', privateNote?: string }} input
 */
export async function respondToReport(reportId, input = {}) {
  if (!reportId) throw new Error('Report ID is required.');
  const response = String(input.response ?? '').trim();
  if (!response) throw new Error('A response is required.');
  if (response.length > REPORT_RESPONSE_MAX) {
    throw new Error(`A response must be ${REPORT_RESPONSE_MAX} characters or fewer.`);
  }
  const status = input.status === 'resolved' ? 'resolved' : 'responded';
  const privateNote = String(input.privateNote ?? '').trim();
  if (privateNote.length > REPORT_PRIVATE_NOTE_MAX) {
    throw new Error(`Private notes must be ${REPORT_PRIVATE_NOTE_MAX} characters or fewer.`);
  }

  const identity = await getStaffIdentity();
  const report = await getReport(reportId);
  if (!report) throw new Error('Report not found.');
  if (report.status === 'dismissed') throw new Error('Closed reports cannot receive a response.');
  if (report.status === 'resolved') throw new Error('Resolved reports cannot receive a response.');

  const existingResponses = Array.isArray(report.responses) ? report.responses : [];
  const responses = [
    ...existingResponses,
    { body: response, status, createdAt: new Date().toISOString(), authorId: identity.uid },
  ];
  const userVisibleStatus = REPORT_STATUS_LABELS[status] ?? 'Responded';

  await updateDoc(refs.report(reportId), {
    status,
    latestResponse: response,
    responses,
    userVisibleStatus,
    respondedBy: identity.uid,
    respondedAt: serverTimestamp(),
    reviewedBy: identity.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await setDoc(
      refs.reportHistoryEntry(reportId),
      {
        status,
        userVisibleStatus,
        latestResponse: response,
        responses,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // The reporter may still see the response through the inbox notification.
  }

  if (privateNote) {
    await setDoc(refs.reportPrivateNote(reportId), {
      notes: privateNote,
      updatedBy: identity.uid,
      updatedAt: serverTimestamp(),
    });
  }

  const notificationId = report.reporterId
    ? await createNotificationForUser(report.reporterId, {
        type: 'report_response',
        title: `Response to your report: ${String(report.subject || 'Website report').slice(0, 120)}`,
        body: response,
        actionUrl: 'settings.html#section-inbox',
        reportId,
      })
    : null;

  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: `report.${status}`,
    targetType: 'report',
    targetId: reportId,
    summary: notificationId
      ? `Responded to report ${reportId} and delivered the response to the reporter's inbox.`
      : `Responded to report ${reportId}, but the reporter's inbox notification could not be delivered.`,
  });

  return { reportId, status, response, delivered: Boolean(notificationId) };
}

/**
 * Sends a direct administrative message to a user's existing inbox.
 *
 * @param {{ recipientId: string, subject: string, body: string, reportId?: string }} input
 */
export async function sendAdminMessage(input = {}) {
  const recipientId = String(input.recipientId ?? '').trim();
  const subject = String(input.subject ?? '').trim();
  const body = String(input.body ?? '').trim();
  if (!recipientId) throw new Error('A recipient user ID is required.');
  if (!subject) throw new Error('A message subject is required.');
  if (!body) throw new Error('A message body is required.');
  if (subject.length > 160) throw new Error('The subject must be 160 characters or fewer.');
  if (body.length > 5000) throw new Error('The message must be 5,000 characters or fewer.');

  const identity = await getStaffIdentity();
  const recipient = await getDoc(refs.user(recipientId));
  if (!recipient.exists()) throw new Error('That user could not be found.');

  const notificationId = await createNotificationForUser(recipientId, {
    type: 'admin_message',
    title: subject,
    body,
    actionUrl: 'settings.html#section-inbox',
    fromUserId: identity.uid,
    reportId: input.reportId ?? null,
  });
  if (!notificationId) throw new Error('The message could not be delivered.');

  await writeAdminAuditLog({
    actorId: identity.uid,
    actorRole: identity.role,
    action: 'inbox.admin_message',
    targetType: 'user',
    targetId: recipientId,
    summary: `Sent an administrative inbox message: ${subject}`.slice(0, 1000),
  });

  return { notificationId, recipientId };
}
