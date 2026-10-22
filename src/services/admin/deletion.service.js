// src/services/admin/deletion.service.js
import { getDoc, updateDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';

export async function listDeletionRequestsPage(cursor = null) {
  return fetchAdminPage(refs.deletionRequests(), {
    conditions: [['status', '==', 'pending']],
    orderField: 'createdAt',
    direction: 'asc',
    cursor,
  });
}

export async function getDeletionRequest(id) {
  const snap = await getDoc(refs.deletionRequest(id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function decideDeletionRequest(id, decision) {
  const req = await getDeletionRequest(id);
  if (!req) throw new Error('Request not found');

  await updateDoc(refs.deletionRequest(id), {
    status: decision,
    reviewedBy: req.userId,
    reviewedAt: new Date().toISOString(),
  });

  await writeAdminAuditLog({
    actorId: req.userId,
    actorRole: 'admin',
    action: `deletion.${decision}`,
    targetType: 'deletionRequest',
    targetId: id,
    summary: `Decision: ${decision} for tale ${req.taleId}`,
  });
}
