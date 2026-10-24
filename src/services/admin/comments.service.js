// src/services/admin/comments.service.js
// Administrator moderation across every tale's comments subcollection.
//
// The list is a Firestore collection-group query. firestore.rules grants staff
// a collection-group read; the nested comment rules still authorise the flag
// update and delete. Moderation writes include all three fields the admin
// branch validates (isHidden, isPinned, reportCount), never a partial patch.

import { deleteDoc, getDoc, serverTimestamp, updateDoc } from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { createLogger } from '@/utils';
import { ADMIN_PAGE_SIZE, fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

const log = createLogger('AdminComments');

/** Filters accepted by the global comment list. */
export const COMMENT_FILTERS = Object.freeze(['all', 'visible', 'hidden', 'pinned']);

/** Moderation actions accepted by the service. */
export const COMMENT_ACTIONS = Object.freeze(['hide', 'unhide', 'pin', 'unpin']);

/** @param {unknown} value @param {number} max @returns {string} */
function cleanText(value, max) {
  const text = String(value ?? '').trim();
  return text.length <= max ? text : text.slice(0, max);
}

/**
 * @param {{ filter?: string, direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 */
function normalizeListOptions(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  const requested = typeof source.filter === 'string' ? source.filter.trim().toLowerCase() : 'all';
  return {
    filter: COMMENT_FILTERS.includes(requested) ? requested : 'all',
    direction: source.direction === 'asc' ? 'asc' : 'desc',
    cursor: source.cursor ?? null,
  };
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown> & { id: string, key: string }}
 */
function normalizeComment(id, data = {}) {
  const taleId = String(data.taleId ?? '').trim();
  return { ...data, id, key: `${taleId}/${id}` };
}

/**
 * Read one cursor-paginated page across every tale's comments.
 *
 * The `all` filter uses an `in` equality on isHidden so it shares the same
 * collection-group index as the visible and hidden filters. Pinned uses the
 * separate isPinned index declared in firestore.indexes.json.
 *
 * @param {{
 *   filter?: 'all' | 'visible' | 'hidden' | 'pinned',
 *   direction?: 'asc' | 'desc',
 *   cursor?: unknown,
 *   pageSize?: number
 * }} [options]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string, key: string }>,
 *   lastDoc: unknown,
 *   hasMore: boolean
 * }>}
 */
export async function listCommentsPage(options = {}) {
  const { filter, direction, cursor } = normalizeListOptions(options);

  /** @type {Array<[string, '==' | 'in', unknown]>} */
  let conditions;
  if (filter === 'visible') conditions = [['isHidden', '==', false]];
  else if (filter === 'hidden') conditions = [['isHidden', '==', true]];
  else if (filter === 'pinned') conditions = [['isPinned', '==', true]];
  else conditions = [['isHidden', 'in', [true, false]]];

  const page = await fetchAdminPage(refs.allComments(), {
    conditions,
    orderField: 'createdAt',
    direction,
    cursor,
    pageSize: options?.pageSize ?? ADMIN_PAGE_SIZE,
  });

  return {
    items: page.items.map(({ id, ...data }) => normalizeComment(id, data)),
    lastDoc: page.lastDoc,
    hasMore: page.hasMore,
  };
}

/**
 * Read one comment together with a best-effort summary of its tale.
 * A missing tale does not hide the comment itself.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @returns {Promise<null | (Record<string, unknown> & {
 *   id: string,
 *   key: string,
 *   tale: { id: string, title: string, status: string, visibility: string } | null
 * })>}
 */
export async function getCommentDetail(taleId, commentId) {
  const parentId = String(taleId ?? '').trim();
  const id = String(commentId ?? '').trim();
  if (!parentId || !id) return null;

  const snap = await getDoc(refs.comment(parentId, id));
  if (!snap.exists()) return null;

  let tale = null;
  try {
    const taleSnap = await getDoc(refs.tale(parentId));
    if (taleSnap.exists()) {
      const data = taleSnap.data() ?? {};
      tale = {
        id: taleSnap.id,
        title: String(data.title ?? '') || 'Untitled tale',
        status: String(data.status ?? ''),
        visibility: String(data.visibility ?? ''),
      };
    }
  } catch (err) {
    log.warn(`Could not read the tale summary for comment ${id}`, err);
  }

  return { ...normalizeComment(snap.id, snap.data()), tale };
}

/**
 * Hide, unhide, pin, or unpin one comment.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @param {'hide' | 'unhide' | 'pin' | 'unpin'} action
 * @returns {Promise<{ commentId: string, isHidden: boolean, isPinned: boolean }>}
 */
export async function moderateComment(taleId, commentId, action) {
  const parentId = String(taleId ?? '').trim();
  const id = String(commentId ?? '').trim();
  if (!parentId || !id) throw new Error('A tale id and comment id are required.');
  if (!COMMENT_ACTIONS.includes(action)) {
    throw new Error(`action must be one of: ${COMMENT_ACTIONS.join(', ')}.`);
  }

  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.comment(parentId, id));
  if (!snap.exists()) throw new Error('That comment no longer exists.');
  const current = snap.data() ?? {};

  const nextHidden =
    action === 'hide' ? true : action === 'unhide' ? false : current.isHidden === true;
  const nextPinned =
    action === 'pin' ? true : action === 'unpin' ? false : current.isPinned === true;
  const reportCount = Number.isFinite(Number(current.reportCount))
    ? Number(current.reportCount)
    : 0;

  try {
    await updateDoc(refs.comment(parentId, id), {
      isHidden: nextHidden,
      isPinned: nextPinned,
      reportCount,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (err?.code === 'permission-denied') {
      throw new Error('Firestore rejected the comment update. Refresh and try again.');
    }
    throw err;
  }

  try {
    const verb = {
      hide: 'Hid',
      unhide: 'Unhid',
      pin: 'Pinned',
      unpin: 'Unpinned',
    }[action];
    const audit = await writeAdminAuditLog({
      actorId: identity.uid,
      actorRole: identity.role,
      action: `comment.${action}`,
      targetType: 'comment',
      targetId: id,
      summary: `${verb} comment ${id} on tale ${parentId}.`.slice(0, 1000),
    });
    if (!audit?.success)
      log.warn('The comment update was saved but its audit entry failed', { id });
  } catch (err) {
    log.warn('The comment update was saved but its audit entry failed', err);
  }

  return { commentId: id, isHidden: nextHidden, isPinned: nextPinned };
}

/**
 * Permanently delete a comment. Replies are left in place because they are a
 * separate subcollection and Firestore does not cascade the delete.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @returns {Promise<{ commentId: string, authorName: string }>}
 */
export async function deleteComment(taleId, commentId) {
  const parentId = String(taleId ?? '').trim();
  const id = String(commentId ?? '').trim();
  if (!parentId || !id) throw new Error('A tale id and comment id are required.');

  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.comment(parentId, id));
  if (!snap.exists()) throw new Error('That comment no longer exists.');
  const authorName = cleanText(snap.data()?.authorName, 100) || 'Unknown author';

  await deleteDoc(refs.comment(parentId, id));

  try {
    const audit = await writeAdminAuditLog({
      actorId: identity.uid,
      actorRole: identity.role,
      action: 'comment.delete',
      targetType: 'comment',
      targetId: id,
      summary: `Deleted a comment by ${authorName} on tale ${parentId}.`.slice(0, 1000),
    });
    if (!audit?.success)
      log.warn('The comment delete was saved but its audit entry failed', { id });
  } catch (err) {
    log.warn('The comment delete was saved but its audit entry failed', err);
  }

  return { commentId: id, authorName };
}
