// src/services/admin/content.service.js
// Administrator reads and rule-safe writes for the whole tale archive.
//
// This is the global content view: unlike Author Studio it is not scoped to
// the caller's own tales. Firestore rules allow staff to read every tale and
// let staff update the fields the dashboard exposes (title, status, visibility)
// while keeping chapter text author-owned. Deletion removes only the tale
// document; Firestore does not cascade subcollections.

import {
  deleteDoc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@fb/index.js';
import { refs } from '@fb/refs.js';
import { createLogger } from '@/utils';
import { ADMIN_PAGE_SIZE, fetchAdminPage } from './pagination.service.js';
import { writeAdminAuditLog } from './audit.service.js';
import { getStaffIdentity } from './session.service.js';

const log = createLogger('AdminContent');

/** Status filters accepted by the tale list. `all` removes the status clause. */
export const CONTENT_STATUS_FILTERS = Object.freeze([
  'all',
  'published',
  'draft',
  'submitted',
  'rejected',
]);

/** Statuses the tale update rule accepts. */
export const TALE_STATUSES = Object.freeze(['draft', 'submitted', 'published', 'rejected']);

/** Visibility values the tale update rule accepts. */
export const TALE_VISIBILITIES = Object.freeze(['public', 'private', 'unlisted']);

/** Firestore auto-ids are at least 20 characters and use this alphabet. */
const TALE_ID_PATTERN = /^[A-Za-z0-9_-]{20,}$/;

/** The four counters the full tale update branch requires to be present. */
const REQUIRED_COUNTERS = ['readCount', 'commentCount', 'reactionCount', 'bookmarkCount'];

/** Maximum chapters fetched for one detail panel. */
const DETAIL_CHAPTER_LIMIT = 50;

/** @param {unknown} value @param {number} max @returns {string} */
function cleanText(value, max) {
  const text = String(value ?? '').trim();
  return text.length <= max ? text : text.slice(0, max);
}

/**
 * @param {{ status?: string, search?: string, direction?: 'asc' | 'desc', cursor?: unknown }} [options]
 */
function normalizeListOptions(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  const requestedStatus =
    typeof source.status === 'string' ? source.status.trim().toLowerCase() : 'all';
  return {
    status: CONTENT_STATUS_FILTERS.includes(requestedStatus) ? requestedStatus : 'all',
    search: cleanText(source.search, 200),
    direction: source.direction === 'asc' ? 'asc' : 'desc',
    cursor: source.cursor ?? null,
  };
}

/**
 * Read one cursor-paginated page of every tale in the archive.
 *
 * A title search is a prefix range ordered by title. Combining it with the
 * status filter needs the `status + title` composite index declared in
 * firestore.indexes.json. A pasted full tale id resolves to one exact record
 * instead, so an administrator can reach a known tale without paging.
 *
 * @param {{
 *   status?: 'all' | 'published' | 'draft' | 'submitted' | 'rejected',
 *   search?: string,
 *   direction?: 'asc' | 'desc',
 *   cursor?: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   pageSize?: number
 * }} [options]
 * @returns {Promise<{
 *   items: Array<Record<string, unknown> & { id: string }>,
 *   lastDoc: import('firebase/firestore').QueryDocumentSnapshot | null,
 *   hasMore: boolean
 * }>}
 */
export async function listTalesPage(options = {}) {
  const { status, search, direction, cursor } = normalizeListOptions(options);

  if (search && TALE_ID_PATTERN.test(search)) {
    try {
      const exact = await getDoc(refs.tale(search));
      if (exact.exists()) {
        return {
          items: [{ ...exact.data(), id: exact.id }],
          lastDoc: null,
          hasMore: false,
        };
      }
    } catch (err) {
      log.warn('Exact tale id lookup failed; falling back to a title search', err);
    }
  }

  const searching = search.length > 0;
  /** @type {Array<[string, '==' | '>=' | '<=', unknown]>} */
  const conditions = [];
  if (status !== 'all') conditions.push(['status', '==', status]);
  if (searching) {
    conditions.push(['title', '>=', search]);
    conditions.push(['title', '<=', `${search}\uf8ff`]);
  }

  return fetchAdminPage(refs.tales(), {
    conditions,
    orderField: searching ? 'title' : 'updatedAt',
    direction: searching ? 'asc' : direction,
    cursor,
    pageSize: options?.pageSize ?? ADMIN_PAGE_SIZE,
  });
}

/**
 * Read one tale plus its chapter list and a live comment count.
 *
 * A chapter or count read failure is returned as an explicit unavailable
 * value, never as zero. This matters because zero would look like a real
 * empty archive rather than a partial read.
 *
 * @param {string} taleId
 * @returns {Promise<null | (Record<string, unknown> & {
 *   id: string,
 *   chapters: Array<Record<string, unknown> & { id: string }> | null,
 *   chaptersUnavailable: boolean,
 *   chaptersTruncated: boolean,
 *   commentCount: number | null
 * })>}
 */
export async function getTaleDetail(taleId) {
  if (!taleId) return null;

  const snap = await getDoc(refs.tale(taleId));
  if (!snap.exists()) return null;

  const tale = { ...snap.data(), id: snap.id };

  let chapters = null;
  let chaptersUnavailable = false;
  let chaptersTruncated = false;
  try {
    const chapterSnap = await getDocs(
      query(refs.chapters(taleId), orderBy('index', 'asc'), limit(DETAIL_CHAPTER_LIMIT))
    );
    chapters = chapterSnap.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
    chaptersTruncated = chapterSnap.size === DETAIL_CHAPTER_LIMIT;
  } catch (err) {
    chaptersUnavailable = true;
    log.warn(`Could not read chapters for tale ${taleId}`, err);
  }

  let commentCount = Number.isFinite(Number(tale.commentCount)) ? Number(tale.commentCount) : null;
  try {
    const countSnap = await getCountFromServer(refs.comments(taleId));
    const count = countSnap.data()?.count;
    if (Number.isFinite(count)) commentCount = count;
  } catch (err) {
    log.warn(`Could not read the comment count for tale ${taleId}`, err);
  }

  return {
    ...tale,
    chapters,
    chaptersUnavailable,
    chaptersTruncated,
    commentCount,
  };
}

/**
 * Update the fields Firestore permits staff to change on a tale.
 *
 * The update rule requires title, status, visibility, the four counters and
 * updatedAt in the merged document. updateDoc() merges, so the counters only
 * need to be added when a legacy document is missing one. `publishedAt` is
 * stamped when a tale first becomes published so public discovery queries
 * continue to find it.
 *
 * @param {string} taleId
 * @param {{ title?: string, status?: string, visibility?: string }} changes
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateTale(taleId, changes = {}) {
  const id = String(taleId ?? '').trim();
  if (!id) throw new Error('A tale id is required.');

  const source = changes && typeof changes === 'object' ? changes : {};
  /** @type {Record<string, unknown>} */
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(source, 'title')) {
    const title = cleanText(source.title, 200);
    if (!title) throw new Error('A tale title is required.');
    updates.title = title;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'status')) {
    const status = String(source.status ?? '')
      .trim()
      .toLowerCase();
    if (!TALE_STATUSES.includes(status)) {
      throw new Error(`status must be one of: ${TALE_STATUSES.join(', ')}.`);
    }
    updates.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'visibility')) {
    const visibility = String(source.visibility ?? '')
      .trim()
      .toLowerCase();
    if (!TALE_VISIBILITIES.includes(visibility)) {
      throw new Error(`visibility must be one of: ${TALE_VISIBILITIES.join(', ')}.`);
    }
    updates.visibility = visibility;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('Change the title, status, or visibility before saving.');
  }

  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.tale(id));
  if (!snap.exists()) throw new Error('That tale no longer exists.');
  const current = snap.data() ?? {};

  for (const counter of REQUIRED_COUNTERS) {
    if (!Number.isFinite(Number(current[counter]))) updates[counter] = 0;
  }

  if (updates.status === 'published' && !current.publishedAt) {
    updates.publishedAt = serverTimestamp();
  }
  updates.updatedAt = serverTimestamp();

  try {
    await updateDoc(refs.tale(id), updates);
  } catch (err) {
    if (err?.code === 'permission-denied') {
      throw new Error(
        'Firestore rejected the tale update. If this tale was changed in the last five seconds, wait and try again.'
      );
    }
    throw err;
  }

  try {
    const audit = await writeAdminAuditLog({
      actorId: identity.uid,
      actorRole: identity.role,
      action: 'tale.update',
      targetType: 'tale',
      targetId: id,
      summary: `Updated ${Object.keys(updates)
        .filter((key) => key !== 'updatedAt' && key !== 'publishedAt')
        .join(', ')} on "${cleanText(current.title, 120) || id}".`.slice(0, 1000),
    });
    if (!audit?.success) log.warn('The tale update was saved but its audit entry failed', { id });
  } catch (err) {
    log.warn('The tale update was saved but its audit entry failed', err);
  }

  return { ...updates };
}

/**
 * Permanently delete the public tale document.
 *
 * Chapter and comment subcollections are left in place because Firestore does
 * not cascade collection deletes. The confirmation text in the dashboard says
 * this explicitly. The audit entry is written after the delete succeeds.
 *
 * @param {string} taleId
 * @returns {Promise<{ id: string, title: string }>}
 */
export async function deleteTale(taleId) {
  const id = String(taleId ?? '').trim();
  if (!id) throw new Error('A tale id is required.');

  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.tale(id));
  if (!snap.exists()) throw new Error('That tale no longer exists.');
  const title = cleanText(snap.data()?.title, 200) || id;

  await deleteDoc(refs.tale(id));

  try {
    const audit = await writeAdminAuditLog({
      actorId: identity.uid,
      actorRole: identity.role,
      action: 'tale.delete',
      targetType: 'tale',
      targetId: id,
      summary:
        `Deleted the public tale record "${title}". Subcollections were left in place.`.slice(
          0,
          1000
        ),
    });
    if (!audit?.success) log.warn('The tale delete was saved but its audit entry failed', { id });
  } catch (err) {
    log.warn('The tale delete was saved but its audit entry failed', err);
  }

  return { id, title };
}
