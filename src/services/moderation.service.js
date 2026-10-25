// src/services/moderation.service.js
// Soft-deletion and restoration primitives shared by the public site and the
// admin Deletions workspace.
//
// Public content is never physically removed by an ordinary deletion. The
// entity keeps its id and relationships, gains a deletion record, and is
// excluded from public discovery by its status/flags. A separate registry
// (`softDeletions`) makes the administrative list cheap and auditable.

import {
  db,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  query,
  refs,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from '@fb/index.js';
import { createLogger } from '@/utils';
import { createNotificationForUser } from './notification.service.js';
import { ADMIN_PAGE_SIZE, fetchAdminPage } from './admin/pagination.service.js';
import { writeAdminAuditLog } from './admin/audit.service.js';
import { getStaffIdentity } from './admin/session.service.js';

const log = createLogger('ModerationService');

export const SOFT_DELETION_TYPES = Object.freeze(['all', 'tale', 'comment', 'reply', 'chapter']);
export const SOFT_DELETION_STATUSES = Object.freeze(['deleted', 'restored', 'purged', 'all']);
export const MODERATION_CATEGORIES = Object.freeze([
  'harassment',
  'hate_speech',
  'threats',
  'spam',
  'privacy',
  'copyright',
  'inappropriate',
  'misinformation',
  'other',
]);
export const MODERATION_CATEGORY_LABELS = Object.freeze({
  harassment: 'Harassment or bullying',
  hate_speech: 'Hate speech or discrimination',
  threats: 'Threats or violence',
  spam: 'Spam or advertising',
  privacy: 'Personal information or privacy',
  copyright: 'Copyright infringement',
  inappropriate: 'Inappropriate content',
  misinformation: 'Misinformation',
  other: 'Other',
});

const BULK_LIMIT = 50;

function cleanText(value, max) {
  const text = String(value ?? '').trim();
  return text.length <= max ? text : text.slice(0, max);
}

function registryIdFor(entityType, ids) {
  if (entityType === 'tale') return `tale_${ids.taleId}`;
  if (entityType === 'chapter') return `chapter_${ids.taleId}_${ids.chapterIndex}`;
  if (entityType === 'comment') return `comment_${ids.taleId}_${ids.commentId}`;
  if (entityType === 'reply') return `reply_${ids.taleId}_${ids.commentId}_${ids.replyId}`;
  throw new Error('Unsupported deletion entity type.');
}

function archiveIdFor(entityType, ids) {
  return registryIdFor(entityType, ids);
}

function categoryLabel(category) {
  return MODERATION_CATEGORY_LABELS[category] ?? MODERATION_CATEGORY_LABELS.other;
}

function makeRegistryEntry({ entityType, ids, data, identity, reason, category, reportCount = 0 }) {
  const title =
    entityType === 'tale'
      ? cleanText(data.title, 200) || 'Untitled tale'
      : entityType === 'chapter'
        ? cleanText(data.title, 200) || `Chapter ${ids.chapterIndex}`
        : `${entityType === 'reply' ? 'Reply' : 'Comment'} by ${cleanText(data.authorName, 100) || 'Unknown'}`;
  return {
    entityType,
    entityId:
      entityType === 'tale'
        ? ids.taleId
        : entityType === 'chapter'
          ? String(ids.chapterIndex)
          : entityType === 'comment'
            ? ids.commentId
            : ids.replyId,
    parentId: ids.taleId ?? '',
    parentCommentId: ids.commentId ?? '',
    title,
    preview: cleanText(data.text ?? data.content ?? '', 240),
    ownerId: data.authorId ?? '',
    ownerName: cleanText(data.authorName, 100),
    deletedAt: serverTimestamp(),
    deletedBy: identity.uid,
    deletionType: 'administrator',
    deletionReason: cleanText(reason, 500),
    moderationCategory: category,
    status: 'deleted',
    restoredAt: null,
    restoredBy: null,
    purgedAt: null,
    purgedBy: null,
    reportCount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function audit(identity, action, targetType, targetId, summary) {
  try {
    const result = await writeAdminAuditLog({
      actorId: identity.uid,
      actorRole: identity.role,
      action,
      targetType,
      targetId,
      summary: cleanText(summary, 1000),
    });
    if (!result?.success) log.warn('Moderation write succeeded but audit failed', { action });
  } catch (err) {
    log.warn('Moderation write succeeded but audit failed', err);
  }
}

async function notifyOwner(
  userId,
  { title, body, taleId = null, commentId = null, reportId = null }
) {
  if (!userId) return;
  try {
    await createNotificationForUser(userId, {
      type: 'moderation',
      title,
      body,
      actionUrl: taleId ? `tale.html?id=${encodeURIComponent(taleId)}` : 'profile.html',
      taleId,
      commentId,
      reportId,
    });
  } catch (err) {
    log.warn('Moderation write succeeded but the author notification failed', err);
  }
}

/**
 * Soft-deletes a tale. Public discovery is excluded because status becomes
 * `deleted` and visibility becomes `private`; the previous values are kept for
 * a safe restore.
 *
 * @param {string} taleId
 * @param {{ reason?: string, category?: string, notifyAuthor?: boolean }} [options]
 */
export async function softDeleteTale(
  taleId,
  { reason = '', category = 'other', notifyAuthor = true } = {}
) {
  const id = cleanText(taleId, 100);
  if (!id) throw new Error('A tale id is required.');
  const identity = await getStaffIdentity();
  if (identity.role !== 'admin')
    throw new Error('Administrator access is required to delete tales.');
  const snap = await getDoc(refs.tale(id));
  if (!snap.exists()) throw new Error('That tale no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted === true || data.status === 'deleted') {
    throw new Error('That tale is already deleted.');
  }

  const registryId = registryIdFor('tale', { taleId: id });
  const batch = writeBatch(db);
  batch.update(refs.tale(id), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: identity.uid,
    deletionType: 'administrator',
    deletionReason: cleanText(reason, 500),
    moderationCategory: category,
    previousStatus: data.status ?? 'draft',
    previousVisibility: data.visibility ?? 'private',
    status: 'deleted',
    visibility: 'private',
    updatedAt: serverTimestamp(),
  });
  batch.set(
    refs.softDeletion(registryId),
    makeRegistryEntry({ entityType: 'tale', ids: { taleId: id }, data, identity, reason, category })
  );
  await batch.commit();

  await audit(
    identity,
    'tale.soft_delete',
    'tale',
    id,
    `Soft-deleted "${cleanText(data.title, 120) || id}" (${categoryLabel(category)}).`
  );
  if (notifyAuthor) {
    await notifyOwner(data.authorId, {
      title: 'Tale removed from public view',
      body: `"${cleanText(data.title, 120) || 'Your tale'}" was removed by an administrator for ${categoryLabel(category).toLowerCase()}.`,
      taleId: id,
    });
  }
  return { taleId: id, registryId };
}

/**
 * Restores a soft-deleted tale. Only the tale itself is restored; independently
 * deleted chapters, comments, and replies stay deleted.
 *
 * @param {string} taleId
 */
export async function restoreTale(taleId) {
  const id = cleanText(taleId, 100);
  if (!id) throw new Error('A tale id is required.');
  const identity = await getStaffIdentity();
  if (identity.role !== 'admin')
    throw new Error('Administrator access is required to restore tales.');
  const snap = await getDoc(refs.tale(id));
  if (!snap.exists()) throw new Error('That tale no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted !== true && data.status !== 'deleted') {
    throw new Error('That tale is not currently deleted.');
  }

  const registryId = registryIdFor('tale', { taleId: id });
  const batch = writeBatch(db);
  batch.update(refs.tale(id), {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletionType: null,
    deletionReason: null,
    moderationCategory: null,
    status: data.previousStatus || 'draft',
    visibility: data.previousVisibility || 'private',
    restoredAt: serverTimestamp(),
    restoredBy: identity.uid,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    refs.softDeletion(registryId),
    {
      status: 'restored',
      restoredAt: serverTimestamp(),
      restoredBy: identity.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();

  await audit(identity, 'tale.restore', 'tale', id, `Restored tale ${id}.`);
  await notifyOwner(data.authorId, {
    title: 'Tale restored',
    body: `"${cleanText(data.title, 120) || 'Your tale'}" was restored to the archive.`,
    taleId: id,
  });
  return { taleId: id };
}

/**
 * Permanently removes a tale document after an explicit administrative
 * confirmation. Subcollections are not cascaded by Firestore.
 *
 * @param {string} taleId
 */
export async function permanentlyDeleteTale(taleId) {
  const id = cleanText(taleId, 100);
  if (!id) throw new Error('A tale id is required.');
  const identity = await getStaffIdentity();
  if (identity.role !== 'admin')
    throw new Error('Administrator access is required to permanently remove tales.');
  const snap = await getDoc(refs.tale(id));
  if (!snap.exists()) throw new Error('That tale no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted !== true && data.status !== 'deleted') {
    throw new Error('Soft-delete the tale before permanently removing it.');
  }

  await deleteDoc(refs.tale(id));
  await setDoc(
    refs.softDeletion(registryIdFor('tale', { taleId: id })),
    {
      status: 'purged',
      purgedAt: serverTimestamp(),
      purgedBy: identity.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await audit(identity, 'tale.purge', 'tale', id, `Permanently removed tale ${id}.`);
  return { taleId: id };
}

/**
 * Soft-deletes a comment and archives its original text for staff review.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @param {{ reason?: string, category?: string }} [options]
 */
export async function softDeleteComment(
  taleId,
  commentId,
  { reason = '', category = 'other' } = {}
) {
  const parentId = cleanText(taleId, 100);
  const id = cleanText(commentId, 100);
  if (!parentId || !id) throw new Error('A tale id and comment id are required.');
  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.comment(parentId, id));
  if (!snap.exists()) throw new Error('That comment no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted === true) throw new Error('That comment is already deleted.');

  const registryId = registryIdFor('comment', { taleId: parentId, commentId: id });
  const batch = writeBatch(db);
  batch.set(
    refs.moderationArchiveEntry(archiveIdFor('comment', { taleId: parentId, commentId: id })),
    {
      entityType: 'comment',
      entityId: id,
      taleId: parentId,
      text: cleanText(data.text, 5000),
      authorId: data.authorId ?? '',
      authorName: cleanText(data.authorName, 100),
      archivedAt: serverTimestamp(),
      archivedBy: identity.uid,
    }
  );
  batch.update(refs.comment(parentId, id), {
    isDeleted: true,
    text: '',
    deletedAt: serverTimestamp(),
    deletedBy: identity.uid,
    deletionType: 'administrator',
    deletionReason: cleanText(reason, 500),
    moderationCategory: category,
    isHidden: false,
    isPinned: data.isPinned === true,
    reportCount: Number(data.reportCount) || 0,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    refs.softDeletion(registryId),
    makeRegistryEntry({
      entityType: 'comment',
      ids: { taleId: parentId, commentId: id },
      data,
      identity,
      reason,
      category,
      reportCount: Number(data.reportCount) || 0,
    })
  );
  await batch.commit();

  await audit(
    identity,
    'comment.soft_delete',
    'comment',
    id,
    `Removed comment ${id} on tale ${parentId} (${categoryLabel(category)}).`
  );
  return { taleId: parentId, commentId: id, registryId };
}

/**
 * Restores a moderated comment from the staff-only archive.
 *
 * @param {string} taleId
 * @param {string} commentId
 */
export async function restoreComment(taleId, commentId) {
  const parentId = cleanText(taleId, 100);
  const id = cleanText(commentId, 100);
  if (!parentId || !id) throw new Error('A tale id and comment id are required.');
  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.comment(parentId, id));
  if (!snap.exists()) throw new Error('That comment no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted !== true) throw new Error('That comment is not currently deleted.');
  if (data.deletionType && data.deletionType !== 'administrator') {
    throw new Error('Author-deleted comments cannot be restored by moderation.');
  }

  const archiveSnap = await getDoc(
    refs.moderationArchiveEntry(archiveIdFor('comment', { taleId: parentId, commentId: id }))
  );
  if (!archiveSnap.exists()) throw new Error('The archived comment text is unavailable.');

  const registryId = registryIdFor('comment', { taleId: parentId, commentId: id });
  const batch = writeBatch(db);
  batch.update(refs.comment(parentId, id), {
    isDeleted: false,
    text: cleanText(archiveSnap.data()?.text, 5000),
    deletedAt: null,
    deletedBy: null,
    deletionType: null,
    deletionReason: null,
    moderationCategory: null,
    isHidden: data.isHidden === true,
    isPinned: data.isPinned === true,
    reportCount: Number(data.reportCount) || 0,
    restoredAt: serverTimestamp(),
    restoredBy: identity.uid,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    refs.softDeletion(registryId),
    {
      status: 'restored',
      restoredAt: serverTimestamp(),
      restoredBy: identity.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();

  await audit(
    identity,
    'comment.restore',
    'comment',
    id,
    `Restored comment ${id} on tale ${parentId}.`
  );
  return { taleId: parentId, commentId: id };
}

/**
 * Permanently deletes a moderated comment. Replies remain as independent
 * records, matching Firestore's non-cascading subcollection behavior.
 *
 * @param {string} taleId
 * @param {string} commentId
 */
export async function permanentlyDeleteComment(taleId, commentId) {
  const parentId = cleanText(taleId, 100);
  const id = cleanText(commentId, 100);
  if (!parentId || !id) throw new Error('A tale id and comment id are required.');
  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.comment(parentId, id));
  if (!snap.exists()) throw new Error('That comment no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted !== true)
    throw new Error('Soft-delete the comment before permanently removing it.');

  await deleteDoc(refs.comment(parentId, id));
  await setDoc(
    refs.softDeletion(registryIdFor('comment', { taleId: parentId, commentId: id })),
    {
      status: 'purged',
      purgedAt: serverTimestamp(),
      purgedBy: identity.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await audit(
    identity,
    'comment.purge',
    'comment',
    id,
    `Permanently removed comment ${id} on tale ${parentId}.`
  );
  return { taleId: parentId, commentId: id };
}

/**
 * Soft-deletes a reply and archives its original text.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @param {string} replyId
 * @param {{ reason?: string, category?: string }} [options]
 */
export async function softDeleteReply(
  taleId,
  commentId,
  replyId,
  { reason = '', category = 'other' } = {}
) {
  const parentId = cleanText(taleId, 100);
  const parentCommentId = cleanText(commentId, 100);
  const id = cleanText(replyId, 100);
  if (!parentId || !parentCommentId || !id)
    throw new Error('Tale, comment, and reply ids are required.');
  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.commentReply(parentId, parentCommentId, id));
  if (!snap.exists()) throw new Error('That reply no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted === true) throw new Error('That reply is already deleted.');

  const registryId = registryIdFor('reply', {
    taleId: parentId,
    commentId: parentCommentId,
    replyId: id,
  });
  const batch = writeBatch(db);
  batch.set(
    refs.moderationArchiveEntry(
      archiveIdFor('reply', { taleId: parentId, commentId: parentCommentId, replyId: id })
    ),
    {
      entityType: 'reply',
      entityId: id,
      taleId: parentId,
      commentId: parentCommentId,
      text: cleanText(data.text, 5000),
      authorId: data.authorId ?? '',
      authorName: cleanText(data.authorName, 100),
      archivedAt: serverTimestamp(),
      archivedBy: identity.uid,
    }
  );
  batch.update(refs.commentReply(parentId, parentCommentId, id), {
    isDeleted: true,
    text: '',
    deletedAt: serverTimestamp(),
    deletedBy: identity.uid,
    deletionType: 'administrator',
    deletionReason: cleanText(reason, 500),
    moderationCategory: category,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    refs.softDeletion(registryId),
    makeRegistryEntry({
      entityType: 'reply',
      ids: { taleId: parentId, commentId: parentCommentId, replyId: id },
      data,
      identity,
      reason,
      category,
      reportCount: Number(data.reportCount) || 0,
    })
  );
  await batch.commit();

  await audit(
    identity,
    'reply.soft_delete',
    'reply',
    id,
    `Removed reply ${id} on tale ${parentId} (${categoryLabel(category)}).`
  );
  return { taleId: parentId, commentId: parentCommentId, replyId: id, registryId };
}

/**
 * Restores a moderated reply from the staff-only archive.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @param {string} replyId
 */
export async function restoreReply(taleId, commentId, replyId) {
  const parentId = cleanText(taleId, 100);
  const parentCommentId = cleanText(commentId, 100);
  const id = cleanText(replyId, 100);
  if (!parentId || !parentCommentId || !id)
    throw new Error('Tale, comment, and reply ids are required.');
  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.commentReply(parentId, parentCommentId, id));
  if (!snap.exists()) throw new Error('That reply no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted !== true) throw new Error('That reply is not currently deleted.');
  if (data.deletionType && data.deletionType !== 'administrator') {
    throw new Error('Author-deleted replies cannot be restored by moderation.');
  }

  const archiveSnap = await getDoc(
    refs.moderationArchiveEntry(
      archiveIdFor('reply', { taleId: parentId, commentId: parentCommentId, replyId: id })
    )
  );
  if (!archiveSnap.exists()) throw new Error('The archived reply text is unavailable.');

  const registryId = registryIdFor('reply', {
    taleId: parentId,
    commentId: parentCommentId,
    replyId: id,
  });
  const batch = writeBatch(db);
  batch.update(refs.commentReply(parentId, parentCommentId, id), {
    isDeleted: false,
    text: cleanText(archiveSnap.data()?.text, 5000),
    deletedAt: null,
    deletedBy: null,
    deletionType: null,
    deletionReason: null,
    moderationCategory: null,
    restoredAt: serverTimestamp(),
    restoredBy: identity.uid,
    updatedAt: serverTimestamp(),
  });
  batch.set(
    refs.softDeletion(registryId),
    {
      status: 'restored',
      restoredAt: serverTimestamp(),
      restoredBy: identity.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();

  await audit(identity, 'reply.restore', 'reply', id, `Restored reply ${id} on tale ${parentId}.`);
  return { taleId: parentId, commentId: parentCommentId, replyId: id };
}

/**
 * Permanently deletes a moderated reply.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @param {string} replyId
 */
export async function permanentlyDeleteReply(taleId, commentId, replyId) {
  const parentId = cleanText(taleId, 100);
  const parentCommentId = cleanText(commentId, 100);
  const id = cleanText(replyId, 100);
  if (!parentId || !parentCommentId || !id)
    throw new Error('Tale, comment, and reply ids are required.');
  const identity = await getStaffIdentity();
  const snap = await getDoc(refs.commentReply(parentId, parentCommentId, id));
  if (!snap.exists()) throw new Error('That reply no longer exists.');
  const data = snap.data() ?? {};
  if (data.isDeleted !== true)
    throw new Error('Soft-delete the reply before permanently removing it.');

  await deleteDoc(refs.commentReply(parentId, parentCommentId, id));
  await setDoc(
    refs.softDeletion(
      registryIdFor('reply', { taleId: parentId, commentId: parentCommentId, replyId: id })
    ),
    {
      status: 'purged',
      purgedAt: serverTimestamp(),
      purgedBy: identity.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await audit(
    identity,
    'reply.purge',
    'reply',
    id,
    `Permanently removed reply ${id} on tale ${parentId}.`
  );
  return { taleId: parentId, commentId: parentCommentId, replyId: id };
}

/**
 * Reads one cursor-paginated page of the soft-deletion registry.
 *
 * @param {{ type?: string, status?: string, search?: string, direction?: 'asc'|'desc', cursor?: unknown, pageSize?: number }} [options]
 */
export async function listSoftDeletionsPage(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  const requestedType = String(source.type ?? 'all')
    .trim()
    .toLowerCase();
  const requestedStatus = String(source.status ?? 'deleted')
    .trim()
    .toLowerCase();
  const type = SOFT_DELETION_TYPES.includes(requestedType) ? requestedType : 'all';
  const status = SOFT_DELETION_STATUSES.includes(requestedStatus) ? requestedStatus : 'deleted';
  const search = cleanText(source.search, 200);
  const conditions = [];
  if (status !== 'all') conditions.push(['status', '==', status]);
  if (type !== 'all') conditions.push(['entityType', '==', type]);
  if (search) {
    conditions.push(['title', '>=', search]);
    conditions.push(['title', '<=', `${search}\uf8ff`]);
  }
  return fetchAdminPage(refs.softDeletions(), {
    conditions,
    orderField: search ? 'title' : 'deletedAt',
    direction: search ? 'asc' : source.direction === 'asc' ? 'asc' : 'desc',
    cursor: source.cursor ?? null,
    pageSize: source.pageSize ?? ADMIN_PAGE_SIZE,
  });
}

/**
 * Reads a registry entry, its live entity, archive, and related reports.
 *
 * @param {string} registryId
 */
export async function getSoftDeletionDetail(registryId) {
  const id = cleanText(registryId, 200);
  if (!id) return null;
  const snap = await getDoc(refs.softDeletion(id));
  if (!snap.exists()) return null;
  const entry = { id: snap.id, ...snap.data() };

  let entity = null;
  try {
    if (entry.entityType === 'tale') {
      const target = await getDoc(refs.tale(entry.entityId));
      if (target.exists()) entity = { id: target.id, ...target.data() };
    } else if (entry.entityType === 'comment') {
      const target = await getDoc(refs.comment(entry.parentId, entry.entityId));
      if (target.exists()) entity = { id: target.id, ...target.data() };
    } else if (entry.entityType === 'reply') {
      const target = await getDoc(
        refs.commentReply(entry.parentId, entry.parentCommentId, entry.entityId)
      );
      if (target.exists()) entity = { id: target.id, ...target.data() };
    } else if (entry.entityType === 'chapter') {
      const target = await getDoc(refs.chapter(entry.parentId, entry.entityId));
      if (target.exists()) entity = { id: target.id, ...target.data() };
    }
  } catch (err) {
    log.warn('Could not load the live entity for a deletion entry', err);
  }

  let archive = null;
  try {
    const archiveSnap = await getDoc(refs.moderationArchiveEntry(id));
    if (archiveSnap.exists()) archive = { id: archiveSnap.id, ...archiveSnap.data() };
  } catch (err) {
    log.warn('Could not load the moderation archive entry', err);
  }

  let reports = [];
  try {
    const reportSnap = await getDocs(
      query(refs.reports(), where('targetId', '==', entry.entityId), limit(20))
    );
    reports = reportSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch (err) {
    log.warn('Could not load reports related to a deletion entry', err);
  }

  return { ...entry, entity, archive, reports };
}

/**
 * Atomically soft-deletes a selected set of tales. Every selected record is
 * validated first; if any id is missing or already deleted, nothing is
 * written. This avoids partially completed bulk operations.
 *
 * @param {string[]} taleIds
 * @param {{ reason?: string, category?: string }} [options]
 */
export async function bulkSoftDeleteTales(taleIds, { reason = '', category = 'other' } = {}) {
  const ids = Array.from(
    new Set((Array.isArray(taleIds) ? taleIds : []).map((id) => cleanText(id, 100)))
  );
  if (!ids.length) throw new Error('Select at least one tale.');
  if (ids.length > BULK_LIMIT)
    throw new Error(`Select ${BULK_LIMIT} tales or fewer per operation.`);

  const identity = await getStaffIdentity();
  if (identity.role !== 'admin')
    throw new Error('Administrator access is required to bulk-delete tales.');
  const loaded = await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(refs.tale(id));
      return { id, snap };
    })
  );
  const invalid = [];
  const valid = [];
  for (const entry of loaded) {
    if (!entry.snap.exists()) invalid.push(`${entry.id}: no longer exists`);
    else if (entry.snap.data()?.isDeleted === true || entry.snap.data()?.status === 'deleted') {
      invalid.push(`${entry.id}: already deleted`);
    } else valid.push(entry);
  }
  if (invalid.length) {
    throw new Error(`Bulk deletion was not applied. ${invalid.join('; ')}`);
  }

  const batch = writeBatch(db);
  for (const { id, snap } of valid) {
    const data = snap.data() ?? {};
    batch.update(refs.tale(id), {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: identity.uid,
      deletionType: 'administrator',
      deletionReason: cleanText(reason, 500),
      moderationCategory: category,
      previousStatus: data.status ?? 'draft',
      previousVisibility: data.visibility ?? 'private',
      status: 'deleted',
      visibility: 'private',
      updatedAt: serverTimestamp(),
    });
    batch.set(
      refs.softDeletion(registryIdFor('tale', { taleId: id })),
      makeRegistryEntry({
        entityType: 'tale',
        ids: { taleId: id },
        data,
        identity,
        reason,
        category,
      })
    );
  }
  await batch.commit();

  await audit(
    identity,
    'tale.bulk_soft_delete',
    'tale',
    valid
      .map((entry) => entry.id)
      .join(',')
      .slice(0, 200),
    `Bulk soft-deleted ${valid.length} tale(s) (${categoryLabel(category)}).`
  );
  return { deleted: valid.map((entry) => entry.id), count: valid.length };
}
