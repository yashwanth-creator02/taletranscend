// src/services/admin/pagination.service.js
// Cursor pagination for every admin list. No admin screen may call getDocs()
// without a limit; this helper is the single place that builds the query.

import { query, where, orderBy, startAfter, limit, getDocs } from '@fb/index.js';

/** Default page size for admin lists. Kept small for the Spark plan. */
export const ADMIN_PAGE_SIZE = 20;

/**
 * @typedef {[field: string, op: import('firebase/firestore').WhereFilterOp, value: unknown]} PageCondition
 */

/**
 * Read one cursor-paginated page.
 *
 * @param {import('firebase/firestore').CollectionReference} collectionRef
 * @param {{
 *   conditions?: PageCondition[],
 *   orderField?: string,
 *   direction?: 'asc' | 'desc',
 *   pageSize?: number,
 *   cursor?: import('firebase/firestore').QueryDocumentSnapshot | null
 * }} [options]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string }>,
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   hasMore: boolean
 * }>}
 */
export async function fetchAdminPage(collectionRef, options = {}) {
  const {
    conditions = [],
    orderField = 'createdAt',
    direction = 'desc',
    pageSize = ADMIN_PAGE_SIZE,
    cursor = null,
  } = options;

  const safeSize = Math.min(Math.max(Number(pageSize) || ADMIN_PAGE_SIZE, 1), 50);
  const constraints = conditions.map(([field, op, value]) => where(field, op, value));
  constraints.push(orderBy(orderField, direction));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(safeSize));

  const snap = await getDocs(query(collectionRef, ...constraints));
  return {
    items: snap.docs.map((entry) => ({ id: entry.id, ...entry.data() })),
    lastDoc: snap.docs.at(-1) ?? null,
    hasMore: snap.docs.length === safeSize,
  };
}
