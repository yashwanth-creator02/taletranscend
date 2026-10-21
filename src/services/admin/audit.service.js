// src/services/admin/audit.service.js
// Append-only audit trail for administrative and moderation actions.
//
// A failed audit write must never roll back the action it describes, but it
// must be visible in the console instead of disappearing. Callers receive
// { success: false } and may surface a non-blocking warning.

import { addDoc, serverTimestamp, refs } from '@fb/index.js';
import { safeAsync, createLogger } from '@/utils';
import { fetchAdminPage } from './pagination.service.js';

const log = createLogger('AdminAudit');

/**
 * @typedef {{
 *   actorId: string,
 *   actorRole: 'admin' | 'moderator',
 *   action: string,
 *   targetType: string,
 *   targetId?: string,
 *   summary?: string
 * }} AuditEntry
 */

/**
 * Append one audit entry. The client cannot update or delete it afterwards
 * (enforced by firestore.rules).
 *
 * @param {AuditEntry} entry
 * @returns {Promise<{ success: boolean, id?: string }>}
 */
export async function writeAdminAuditLog({
  actorId,
  actorRole,
  action,
  targetType,
  targetId = '',
  summary = '',
}) {
  if (!actorId || (actorRole !== 'admin' && actorRole !== 'moderator')) {
    log.warn('Refusing audit entry with an invalid actor', { actorId, actorRole });
    return { success: false };
  }

  return safeAsync(
    (async () => {
      const created = await addDoc(refs.adminAuditLogs(), {
        actorId,
        actorRole,
        action,
        targetType,
        targetId,
        summary: String(summary).slice(0, 1000),
        createdAt: serverTimestamp(),
      });
      return { success: true, id: created.id };
    })(),
    { fallback: { success: false }, logContext: 'services.admin.writeAdminAuditLog' }
  );
}

/**
 * Read one page of the audit trail, newest first.
 *
 * @param {{ pageSize?: number, cursor?: import('firebase/firestore').QueryDocumentSnapshot | null }} [options]
 * @returns {Promise<{ items: Array<Record<string, unknown> & { id: string }>, lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null, hasMore: boolean, error: boolean }>}
 */
export async function listAdminAuditLogPage({ pageSize = 25, cursor = null } = {}) {
  let error = false;
  const page = await safeAsync(
    fetchAdminPage(refs.adminAuditLogs(), {
      orderField: 'createdAt',
      direction: 'desc',
      pageSize,
      cursor,
    }),
    {
      fallback: { items: [], lastDoc: null, hasMore: false },
      onError: () => {
        error = true;
      },
      logContext: 'services.admin.listAdminAuditLogPage',
    }
  );
  return { ...page, error };
}
