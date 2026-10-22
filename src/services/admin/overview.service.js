// src/services/admin/overview.service.js
// Live archive counters. Every number comes from Firestore; a counter that
// cannot be read is returned as null and rendered as unavailable rather than
// guessed or padded.

import { query, where, getCountFromServer } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { createLogger } from '@/utils';
import { listAdminAuditLogPage } from './audit.service.js';

const log = createLogger('AdminOverview');

/**
 * @param {import('firebase/firestore').Query} queryRef
 * @param {string} label
 * @returns {Promise<number | null>}
 */
async function countQuery(queryRef, label) {
  try {
    const snap = await getCountFromServer(queryRef);
    return snap.data().count;
  } catch (err) {
    log.warn(`Could not read the ${label} count`, err);
    return null;
  }
}

/**
 * @param {{ includeAudit?: boolean }} [options]
 * @returns {Promise<{
 *   totalTales: number | null,
 *   totalUsers: number | null,
 *   pendingReports: number | null,
 *   pendingApplications: number | null,
 *   pendingDeletions: number | null,
 *   recentAuditEntries: Array<Record<string, unknown>>,
 *   auditUnavailable: boolean
 * }>}
 */
export async function fetchOverviewStats({ includeAudit = true } = {}) {
  const [totalTales, totalUsers, pendingReports, pendingApplications, pendingDeletions] =
    await Promise.all([
      countQuery(query(refs.tales(), where('status', '==', 'published')), 'published tale'),
      countQuery(refs.users(), 'user'),
      countQuery(query(refs.reports(), where('status', '==', 'pending')), 'pending report'),
      countQuery(
        query(refs.authorApplications(), where('status', '==', 'pending')),
        'pending application'
      ),
      countQuery(
        query(refs.deletionRequests(), where('status', '==', 'pending')),
        'pending deletion'
      ),
    ]);

  let recentAuditEntries = [];
  let auditUnavailable = false;
  if (includeAudit) {
    try {
      const auditPage = await listAdminAuditLogPage({ pageSize: 5 });
      if (auditPage.error) auditUnavailable = true;
      recentAuditEntries = auditPage.items.map((item) => ({
        id: item.id,
        actorId: item.actorId,
        actorRole: item.actorRole,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId ?? '',
        summary: item.summary ?? '',
        createdAt: item.createdAt,
      }));
    } catch (err) {
      log.warn('Could not read recent audit activity', err);
      auditUnavailable = true;
    }
  }

  return {
    totalTales,
    totalUsers,
    pendingReports,
    pendingApplications,
    pendingDeletions,
    recentAuditEntries,
    auditUnavailable,
  };
}
