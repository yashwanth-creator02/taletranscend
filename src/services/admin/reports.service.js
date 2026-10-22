// src/services/admin/reports.service.js
// Staff triage of reader reports. Resolution is a decision on the report, not
// a notification: the only side effects are the status update and the audit
// entry written under the caller's real identity.

import { getDoc, serverTimestamp, updateDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

/** Status values accepted by the list filter. `all` removes the where clause. */
export const REPORT_STATUS_FILTERS = Object.freeze(['pending', 'resolved', 'dismissed', 'all']);

/** Decisions a reviewer may record. */
export const REPORT_RESOLUTIONS = Object.freeze(['resolved', 'dismissed']);

/** Resolution notes are bounded to match the application-notes guard. */
export const REPORT_NOTES_MAX = 1000;

/**
 * @param {{ status?: string, direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 * @returns {{ status: string, direction: 'asc' | 'desc', cursor: unknown }}
 */
function normalizeListOptions(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  const requestedStatus =
    typeof source.status === 'string' ? source.status.trim().toLowerCase() : 'pending';
  return {
    status: REPORT_STATUS_FILTERS.includes(requestedStatus) ? requestedStatus : 'pending',
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
 * @param {{ status?: 'pending' | 'resolved' | 'dismissed' | 'all', direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 * @returns {Promise<{ items: Array<Record<string, unknown> & { id: string }>, lastDoc: unknown, hasMore: boolean }>}
 */
export async function listReportsPage(options = {}) {
  const { status, direction, cursor } = normalizeListOptions(options);
  return fetchAdminPage(refs.reports(), {
    conditions: status === 'all' ? [] : [['status', '==', status]],
    orderField: 'createdAt',
    direction,
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
  return { ...report, targetSummary };
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
