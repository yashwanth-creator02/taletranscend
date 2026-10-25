// src/services/__tests__/moderation.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bulkSoftDeleteTales,
  permanentlyDeleteComment,
  permanentlyDeleteReply,
  permanentlyDeleteTale,
  restoreComment,
  restoreTale,
  softDeleteComment,
} from '../moderation.service.js';

const mocks = vi.hoisted(() => ({
  batchSet: vi.fn(),
  batchUpdate: vi.fn(),
  batchDelete: vi.fn(),
  batchCommit: vi.fn(),
  createNotificationForUser: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  getStaffIdentity: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  writeAdminAuditLog: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  db: { name: 'test-db' },
  deleteDoc: mocks.deleteDoc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  limit: vi.fn((value) => ({ type: 'limit', value })),
  query: vi.fn((...args) => ({ type: 'query', args })),
  refs: {
    tale: vi.fn((id) => `tale/${id}`),
    comment: vi.fn((taleId, commentId) => `tale/${taleId}/comment/${commentId}`),
    commentReply: vi.fn(
      (taleId, commentId, replyId) => `tale/${taleId}/comment/${commentId}/reply/${replyId}`
    ),
    softDeletion: vi.fn((id) => `softDeletion/${id}`),
    moderationArchiveEntry: vi.fn((id) => `archive/${id}`),
    reports: vi.fn(() => 'reports'),
  },
  serverTimestamp: mocks.serverTimestamp,
  setDoc: vi.fn(),
  where: vi.fn((field, operator, value) => ({ type: 'where', field, operator, value })),
  writeBatch: mocks.writeBatch,
}));

vi.mock('@/utils', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock('../notification.service.js', () => ({
  createNotificationForUser: mocks.createNotificationForUser,
}));

vi.mock('../admin/session.service.js', () => ({
  getStaffIdentity: mocks.getStaffIdentity,
}));

vi.mock('../admin/audit.service.js', () => ({
  writeAdminAuditLog: mocks.writeAdminAuditLog,
}));

vi.mock('../admin/pagination.service.js', () => ({
  ADMIN_PAGE_SIZE: 20,
  fetchAdminPage: vi.fn(),
}));

function snapshot(id, data) {
  return { id, exists: () => true, data: () => data };
}

describe('moderation service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStaffIdentity.mockResolvedValue({
      uid: 'admin-1',
      role: 'admin',
      displayName: 'Admin One',
    });
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.batchDelete.mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({
      set: mocks.batchSet,
      update: mocks.batchUpdate,
      delete: mocks.batchDelete,
      commit: mocks.batchCommit,
    });
    mocks.createNotificationForUser.mockResolvedValue('notification-1');
    mocks.writeAdminAuditLog.mockResolvedValue({ success: true });
    mocks.deleteDoc.mockResolvedValue(undefined);
  });

  it('rejects a bulk operation larger than the hard limit before reading anything', async () => {
    const ids = Array.from({ length: 51 }, (_, index) => `tale-${index}`);

    await expect(bulkSoftDeleteTales(ids)).rejects.toThrow(
      'Select 50 tales or fewer per operation.'
    );

    expect(mocks.getStaffIdentity).not.toHaveBeenCalled();
    expect(mocks.getDoc).not.toHaveBeenCalled();
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it('applies bulk deletion only when every selected tale is still eligible', async () => {
    mocks.getDoc
      .mockResolvedValueOnce(snapshot('tale-1', { title: 'One', status: 'published' }))
      .mockResolvedValueOnce({ exists: () => false });

    await expect(bulkSoftDeleteTales(['tale-1', 'tale-2'])).rejects.toThrow(
      'Bulk deletion was not applied.'
    );

    expect(mocks.writeBatch).not.toHaveBeenCalled();
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('soft-deletes every selected tale in one atomic batch and audits the operation', async () => {
    mocks.getDoc
      .mockResolvedValueOnce(
        snapshot('tale-1', {
          title: 'One',
          authorId: 'author-1',
          status: 'published',
          visibility: 'public',
        })
      )
      .mockResolvedValueOnce(
        snapshot('tale-2', {
          title: 'Two',
          authorId: 'author-2',
          status: 'draft',
          visibility: 'private',
        })
      );

    const result = await bulkSoftDeleteTales(['tale-1', 'tale-2'], {
      reason: 'Spam campaign',
      category: 'spam',
    });

    expect(result).toEqual({ deleted: ['tale-1', 'tale-2'], count: 2 });
    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      'tale/tale-1',
      expect.objectContaining({
        isDeleted: true,
        deletionType: 'administrator',
        moderationCategory: 'spam',
        deletionReason: 'Spam campaign',
        previousStatus: 'published',
        previousVisibility: 'public',
        status: 'deleted',
        visibility: 'private',
      })
    );
    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      'tale/tale-2',
      expect.objectContaining({
        isDeleted: true,
        previousStatus: 'draft',
        previousVisibility: 'private',
      })
    );
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'softDeletion/tale_tale-1',
      expect.objectContaining({
        entityType: 'tale',
        entityId: 'tale-1',
        status: 'deleted',
        moderationCategory: 'spam',
      })
    );
    expect(mocks.batchCommit).toHaveBeenCalledTimes(1);
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tale.bulk_soft_delete', targetId: 'tale-1,tale-2' })
    );
  });

  it('restores a tale to its previous status and visibility', async () => {
    mocks.getDoc.mockResolvedValue(
      snapshot('tale-1', {
        title: 'The Salt Road',
        authorId: 'author-1',
        isDeleted: true,
        status: 'deleted',
        visibility: 'private',
        previousStatus: 'published',
        previousVisibility: 'public',
      })
    );

    const result = await restoreTale('tale-1');

    expect(result).toEqual({ taleId: 'tale-1' });
    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      'tale/tale-1',
      expect.objectContaining({
        isDeleted: false,
        status: 'published',
        visibility: 'public',
        restoredBy: 'admin-1',
        deletedAt: null,
        deletedBy: null,
      })
    );
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'softDeletion/tale_tale-1',
      expect.objectContaining({ status: 'restored', restoredBy: 'admin-1' }),
      { merge: true }
    );
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tale.restore', targetId: 'tale-1' })
    );
    expect(mocks.createNotificationForUser).toHaveBeenCalledWith(
      'author-1',
      expect.objectContaining({ title: 'Tale restored', taleId: 'tale-1' })
    );
  });

  it('requires administrator access before permanently deleting a tale', async () => {
    mocks.getStaffIdentity.mockResolvedValue({ uid: 'mod-1', role: 'moderator' });

    await expect(permanentlyDeleteTale('tale-1')).rejects.toThrow(
      'Administrator access is required to permanently remove tales.'
    );

    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });

  it('purges a tale and its registry entry in one atomic batch', async () => {
    mocks.getDoc.mockResolvedValueOnce(snapshot('tale-1', { isDeleted: true, status: 'deleted' }));

    await permanentlyDeleteTale('tale-1');

    expect(mocks.writeBatch).toHaveBeenCalledTimes(1);
    expect(mocks.batchDelete).toHaveBeenCalledWith('tale/tale-1');
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'softDeletion/tale_tale-1',
      expect.objectContaining({ status: 'purged', purgedBy: 'admin-1' }),
      { merge: true }
    );
    expect(mocks.batchCommit).toHaveBeenCalledTimes(1);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });

  it('purges a comment and its registry entry in one atomic batch', async () => {
    mocks.getDoc.mockResolvedValueOnce(snapshot('comment-1', { isDeleted: true }));

    await permanentlyDeleteComment('tale-1', 'comment-1');

    expect(mocks.writeBatch).toHaveBeenCalledTimes(1);
    expect(mocks.batchDelete).toHaveBeenCalledWith('tale/tale-1/comment/comment-1');
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'softDeletion/comment_tale-1_comment-1',
      expect.objectContaining({ status: 'purged', purgedBy: 'admin-1' }),
      { merge: true }
    );
    expect(mocks.batchCommit).toHaveBeenCalledTimes(1);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });

  it('purges a reply and its registry entry in one atomic batch', async () => {
    mocks.getDoc.mockResolvedValueOnce(snapshot('reply-1', { isDeleted: true }));

    await permanentlyDeleteReply('tale-1', 'comment-1', 'reply-1');

    expect(mocks.writeBatch).toHaveBeenCalledTimes(1);
    expect(mocks.batchDelete).toHaveBeenCalledWith('tale/tale-1/comment/comment-1/reply/reply-1');
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'softDeletion/reply_tale-1_comment-1_reply-1',
      expect.objectContaining({ status: 'purged', purgedBy: 'admin-1' }),
      { merge: true }
    );
    expect(mocks.batchCommit).toHaveBeenCalledTimes(1);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
  });

  it('archives a comment hidden state before clearing it', async () => {
    mocks.getDoc.mockResolvedValueOnce(
      snapshot('comment-1', {
        text: 'A hidden comment',
        authorId: 'reader-2',
        authorName: 'Reader Two',
        isHidden: true,
        isPinned: false,
        reportCount: 1,
      })
    );

    await softDeleteComment('tale-1', 'comment-1', {
      reason: 'Hidden by staff.',
      category: 'spam',
    });

    expect(mocks.batchSet).toHaveBeenCalledWith(
      'archive/comment_tale-1_comment-1',
      expect.objectContaining({ previousIsHidden: true, text: 'A hidden comment' })
    );
    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      'tale/tale-1/comment/comment-1',
      expect.objectContaining({ isHidden: false, isDeleted: true, text: '' })
    );
  });

  it('restores a comment with its pre-moderation hidden state', async () => {
    mocks.getDoc
      .mockResolvedValueOnce(
        snapshot('comment-1', {
          isDeleted: true,
          isHidden: false,
          isPinned: true,
          reportCount: 2,
        })
      )
      .mockResolvedValueOnce(
        snapshot('comment-1', { text: 'The original comment', previousIsHidden: true })
      );

    await restoreComment('tale-1', 'comment-1');

    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      'tale/tale-1/comment/comment-1',
      expect.objectContaining({
        isDeleted: false,
        text: 'The original comment',
        isHidden: true,
        isPinned: true,
      })
    );
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'softDeletion/comment_tale-1_comment-1',
      expect.objectContaining({ status: 'restored' }),
      { merge: true }
    );
  });
});
