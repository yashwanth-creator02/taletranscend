// src/services/admin/mycontent.service.js
import { addDoc, getDocs, query, where, orderBy, limit, auth } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';

/**
 * Fetch a paginated page of the logged-in author's tales.
 *
 * @param {import('firebase/firestore').QueryDocumentSnapshot | null} [cursor]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string }>,
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   hasMore: boolean
 * }>}
 */
export async function getAuthorTalesPage(cursor = null) {
  const user = auth.currentUser;
  if (!user) {
    return { items: [], lastDoc: null, hasMore: false };
  }

  return fetchAdminPage(refs.tales(), {
    conditions: [['authorId', '==', user.uid]],
    orderField: 'publishedAt',
    direction: 'desc',
    cursor,
  });
}

/**
 * Fetch a paginated page of the logged-in author's deletion requests.
 *
 * @param {import('firebase/firestore').QueryDocumentSnapshot | null} [cursor]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string }>,
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   hasMore: boolean
 * }>}
 */
export async function getAuthorDeletionRequestsPage(cursor = null) {
  const user = auth.currentUser;
  if (!user) {
    return { items: [], lastDoc: null, hasMore: false };
  }

  return fetchAdminPage(refs.deletionRequests(), {
    conditions: [['userId', '==', user.uid]],
    orderField: 'createdAt',
    direction: 'desc',
    cursor,
  });
}

/**
 * Fetch pending reports on the logged-in author's content.
 *
 * @returns {Promise<Array<Record<string, unknown> & { id: string }>>}
 */
export async function getAuthorReports() {
  const user = auth.currentUser;
  if (!user) return [];

  // Fetch author's tales to get their IDs
  const talesQuery = query(refs.tales(), where('authorId', '==', user.uid), limit(50));
  const talesSnap = await getDocs(talesQuery);
  const taleIds = talesSnap.docs.map((d) => d.id);

  if (taleIds.length === 0) return [];

  // Firestore 'in' query supports up to 30 items
  const chunks = [];
  for (let i = 0; i < taleIds.length; i += 30) {
    chunks.push(taleIds.slice(i, i + 30));
  }

  const reportsMap = new Map();
  for (const chunk of chunks) {
    const reportsQuery = query(
      refs.reports(),
      where('status', '==', 'pending'),
      where('targetId', 'in', chunk),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(reportsQuery);
    snap.docs.forEach((d) => {
      reportsMap.set(d.id, { id: d.id, ...d.data() });
    });
  }

  return Array.from(reportsMap.values());
}

/**
 * Initiate a deletion request for a tale.
 *
 * @param {string} taleId
 * @param {string} [reason]
 * @returns {Promise<string>} Created request ID
 */
export async function requestTaleDeletion(taleId, reason = '') {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const docRef = await addDoc(refs.deletionRequests(), {
    userId: user.uid,
    taleId,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  await writeAdminAuditLog({
    actorId: user.uid,
    actorRole: 'author',
    action: 'deletion.requested',
    targetType: 'deletionRequest',
    targetId: docRef.id,
    summary: `Author requested deletion for tale ${taleId}`,
  });

  return docRef.id;
}
