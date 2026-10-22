// src/services/admin/reports.service.js
import { getDoc, updateDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';

export async function listReportsPage(cursor = null) {
  return fetchAdminPage(refs.reports(), {
    conditions: [['status', '==', 'pending']],
    orderField: 'createdAt',
    direction: 'asc',
    cursor,
  });
}

export async function getReport(id) {
  const snap = await getDoc(refs.report(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function resolveReport(id, resolution) {
  const report = await getReport(id);
  if (!report) throw new Error('Report not found');

  await updateDoc(refs.report(id), {
    status: resolution,
    reviewedBy: report.reporterId,
    reviewedAt: new Date().toISOString(),
  });

  await writeAdminAuditLog({
    actorId: report.reporterId,
    actorRole: 'moderator',
    action: `report.${resolution}`,
    targetType: 'report',
    targetId: id,
    summary: `Report resolved: ${resolution} for ${report.targetType} ${report.targetId}`,
  });
}
