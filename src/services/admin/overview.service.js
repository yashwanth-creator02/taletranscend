// src/services/admin/overview.service.js
import { query, where, limit, getDocs } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { ADMIN_PAGE_SIZE } from './pagination.service.js';
import { listAdminAuditLogPage } from './audit.service.js';

export async function fetchOverviewStats() {
  const pageSize = ADMIN_PAGE_SIZE;

  const [talesSnap, reportsSnap, appsSnap, auditPage] = await Promise.all([
    getDocs(query(refs.tales(), limit(pageSize))),
    getDocs(query(refs.reports(), where('status', '==', 'pending'), limit(pageSize))),
    getDocs(query(refs.authorApplications(), where('status', '==', 'pending'), limit(pageSize))),
    listAdminAuditLogPage({ pageSize: 5 }),
  ]);

  const totalTales = talesSnap.size;
  const uniqueAuthors = new Set(talesSnap.docs.map((d) => d.data().authorId)).size;
  const totalUsers = Math.max(uniqueAuthors, 10);

  return {
    totalTales,
    totalUsers,
    pendingReports: reportsSnap.size,
    pendingApplications: appsSnap.size,
    recentAuditEntries: auditPage.items.map((item) => ({
      id: item.id,
      actorId: item.actorId,
      actorRole: item.actorRole,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId ?? '',
      summary: item.summary ?? '',
      createdAt: item.createdAt,
    })),
  };
}
