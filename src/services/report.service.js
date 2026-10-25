// src/services/report.service.js
// Reader-facing reports and the reporter-safe history mirror.
//
// Reports are written to the staff-only `reports` collection. A second,
// deliberately narrow mirror is written to `reportHistory/{reportId}` so the
// reporter can follow the status and the public response without ever reading
// private moderation notes.

import {
  auth,
  db,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  refs,
  serverTimestamp,
  where,
  writeBatch,
} from '@fb/index.js';
import { isRegisteredUser } from './auth.guard.js';
import { createLogger, safeAsync } from '@/utils';

const log = createLogger('ReportService');

export const REPORT_CATEGORIES = Object.freeze([
  'harassment',
  'hate_speech',
  'threats',
  'spam',
  'privacy',
  'copyright',
  'inappropriate',
  'misinformation',
  'bug',
  'feature_request',
  'general_feedback',
  'other',
]);

export const REPORT_CATEGORY_LABELS = Object.freeze({
  harassment: 'Harassment or bullying',
  hate_speech: 'Hate speech or discrimination',
  threats: 'Threats or violence',
  spam: 'Spam or advertising',
  privacy: 'Personal information or privacy',
  copyright: 'Copyright infringement',
  inappropriate: 'Inappropriate content',
  misinformation: 'Misinformation',
  bug: 'Website bug',
  feature_request: 'Feature request',
  general_feedback: 'General feedback',
  other: 'Other',
});

export const REPORT_TARGET_TYPES = Object.freeze([
  'tale',
  'comment',
  'reply',
  'user',
  'page',
  'website',
]);

export const REPORT_STATUSES = Object.freeze([
  'pending',
  'under_review',
  'responded',
  'resolved',
  'dismissed',
]);

export const REPORT_STATUS_LABELS = Object.freeze({
  pending: 'Submitted',
  under_review: 'Under Review',
  responded: 'Responded',
  resolved: 'Resolved',
  dismissed: 'Closed',
});

export const REPORT_SUBJECT_MAX = 160;
export const REPORT_DESCRIPTION_MAX = 5000;
export const REPORT_RESPONSE_MAX = 5000;
export const REPORT_PRIVATE_NOTE_MAX = 2000;

function cleanText(value, max) {
  const text = String(value ?? '').trim();
  return text.length <= max ? text : text.slice(0, max);
}

function requireReporter() {
  const user = auth?.currentUser;
  if (!isRegisteredUser(user)) {
    throw new Error('Only registered readers can submit reports.');
  }
  return user;
}

function normalizeTargetType(value) {
  const type = String(value ?? 'website')
    .trim()
    .toLowerCase();
  return REPORT_TARGET_TYPES.includes(type) ? type : 'website';
}

function normalizeCategory(value) {
  const category = String(value ?? 'other')
    .trim()
    .toLowerCase();
  return REPORT_CATEGORIES.includes(category) ? category : 'other';
}

function buildHistory(reportId, report) {
  return {
    reportId,
    reporterId: report.reporterId,
    reporterName: report.reporterName,
    subject: report.subject,
    category: report.category,
    description: report.description,
    targetType: report.targetType,
    targetId: report.targetId,
    taleId: report.taleId,
    commentId: report.commentId,
    replyId: report.replyId,
    pageUrl: report.pageUrl,
    status: report.status,
    userVisibleStatus: REPORT_STATUS_LABELS[report.status] ?? 'Submitted',
    latestResponse: report.latestResponse ?? '',
    responses: report.responses ?? [],
    createdAt: report.createdAt ?? null,
    updatedAt: report.updatedAt ?? null,
  };
}

/**
 * Creates a report and its reporter-safe mirror in one atomic batch.
 *
 * @param {{
 *   subject: string,
 *   category?: string,
 *   description: string,
 *   targetType?: string,
 *   targetId?: string,
 *   taleId?: string,
 *   commentId?: string,
 *   replyId?: string,
 *   pageUrl?: string,
 * }} input
 * @returns {Promise<{ reportId: string }>}
 */
export async function createReport(input = {}) {
  const user = requireReporter();
  const subject = cleanText(input.subject, REPORT_SUBJECT_MAX);
  const description = cleanText(input.description, REPORT_DESCRIPTION_MAX);
  if (!subject) throw new Error('A report subject is required.');
  if (!description) throw new Error('A report description is required.');

  const category = normalizeCategory(input.category);
  const targetType = normalizeTargetType(input.targetType);
  const targetId = cleanText(input.targetId, 100) || targetType;
  const taleId = cleanText(input.taleId, 100);
  const commentId = cleanText(input.commentId, 100);
  const replyId = cleanText(input.replyId, 100);
  const pageUrl = cleanText(input.pageUrl, 500);

  const reportRef = doc(refs.reports());
  const report = {
    reporterId: user.uid,
    reporterName: cleanText(user.displayName || 'Reader', 100),
    subject,
    category,
    description,
    targetType,
    targetId,
    taleId,
    commentId,
    replyId,
    pageUrl,
    reason: subject,
    status: 'pending',
    userVisibleStatus: REPORT_STATUS_LABELS.pending,
    latestResponse: '',
    responses: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const history = buildHistory(reportRef.id, report);
  const batch = writeBatch(db);
  batch.set(reportRef, report);
  batch.set(refs.reportHistoryEntry(reportRef.id), {
    ...history,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();

  log.debug('Report created', { reportId: reportRef.id, category, targetType });
  return { reportId: reportRef.id };
}

/**
 * Reads the reporter-safe history for one report. Returns null when the
 * report does not exist or the caller cannot read the mirror.
 *
 * @param {string} reportId
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getReportHistoryEntry(reportId) {
  if (!reportId) return null;
  return safeAsync(
    (async () => {
      const snap = await getDoc(refs.reportHistoryEntry(reportId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    })(),
    { fallback: null, logContext: 'services.report.getReportHistoryEntry' }
  );
}

/**
 * Reads the signed-in user's own report history, newest first.
 *
 * @param {string} [userId]
 * @param {number} [max=50]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function getUserReports(userId = auth?.currentUser?.uid, max = 50) {
  if (!userId) return [];
  return safeAsync(
    (async () => {
      const q = query(
        refs.reportHistory(),
        where('reporterId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    })(),
    { fallback: [], logContext: 'services.report.getUserReports' }
  );
}

/**
 * Staff response helper. Kept here so the admin report service and the
 * notification/inbox path share one canonical shape.
 *
 * @param {Record<string, unknown>} report
 * @param {Array<Record<string, unknown>>} responses
 * @param {string} response
 * @param {string} status
 */
export function appendReportResponse(report, responses, response, status) {
  return {
    ...report,
    status,
    userVisibleStatus: REPORT_STATUS_LABELS[status] ?? 'Responded',
    latestResponse: response,
    responses: [
      ...(Array.isArray(responses) ? responses : []),
      {
        body: response,
        status,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export { buildHistory };
