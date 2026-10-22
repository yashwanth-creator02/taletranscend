// src/services/admin/applications.service.js
import { getDoc, updateDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';

export async function listApplicationsPage(cursor = null) {
  return fetchAdminPage(refs.authorApplications(), {
    conditions: [['status', '==', 'pending']],
    orderField: 'createdAt',
    direction: 'asc',
    cursor,
  });
}

export async function getApplication(id) {
  const snap = await getDoc(refs.authorApplication(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function decideApplication(id, decision, notes = '') {
  const app = await getApplication(id);
  if (!app) throw new Error('Application not found');

  await updateDoc(refs.authorApplication(id), {
    status: decision,
    reviewedBy: app.applicantId,
    reviewedAt: new Date().toISOString(),
    notes,
  });

  await writeAdminAuditLog({
    actorId: app.applicantId,
    actorRole: 'admin',
    action: `application.${decision}`,
    targetType: 'authorApplication',
    targetId: id,
    summary: `${decision} application from ${app.penName}`,
  });
}
