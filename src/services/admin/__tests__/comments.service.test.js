// src/services/admin/__tests__/comments.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMMENT_ACTIONS,
  COMMENT_FILTERS,
  deleteComment,
  getCommentDetail,
  listCommentsPage,
  moderateComment,
} from '../comments.service.js';

const mocks = vi.hoisted(() => ({
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  updateDoc: vi.fn(),
  fetchAdminPage: vi.fn(),
  writeAdminAuditLog: vi.fn(),
  getStaffIdentity: vi.fn(),
  allComments: vi.fn(() => 'all-comments'),
  comment: vi.fn((taleId, commentId) => `comment:${taleId}/${commentId}`),
  tale: vi.fn((taleId) => `tale:${taleId}`),
}));

vi.mock('@fb/index.js', () => ({
  deleteDoc: mocks.deleteDoc,
  getDoc: mocks.getDoc,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    allComments: mocks.allComments,
    comment: mocks.comment,
    tale: mocks.tale,
  },
}));

vi.mock('../pagination.service.js', () => ({
  ADMIN_PAGE_SIZE: 20,
  fetchAdminPage: mocks.fetchAdminPage,
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: mocks.writeAdminAuditLog,
}));

vi.mock('../session.service.js', () => ({
  getStaffIdentity: mocks.getStaffIdentity,
}));

function makeSnapshot(id, data) {
  return { id, exists: () => true, data: () => data };
}

function missingSnapshot(id = 'missing') {
  return { id, exists: () => false, data: () => ({}) };
}

function makePage(items, { lastDoc = null, hasMore = false } = {}) {
  return { items, lastDoc, hasMore };
}

const COMMENT = {
  taleId: 'tale-1',
  text: 'A fine reflection.',
  authorId: 'reader-1',
  authorName: 'Reader One',
  authorType: 'reader',
  isHidden: false,
  isPinned: false,
  reportCount: 0,
  likeCount: 3,
  replyCount: 1,
  createdAt: 'created-at',
};

describe('admin comments service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.serverTimestamp.mockReturnValue('server-timestamp');
    mocks.fetchAdminPage.mockResolvedValue(makePage([]));
    mocks.writeAdminAuditLog.mockResolvedValue({ success: true });
    mocks.getStaffIdentity.mockResolvedValue({
      uid: 'staff-1',
      role: 'moderator',
      email: '',
      displayName: '',
    });
    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.deleteDoc.mockResolvedValue(undefined);
  });

  it('exposes the supported filters and actions', () => {
    expect(COMMENT_FILTERS).toEqual(['all', 'visible', 'hidden', 'pinned']);
    expect(COMMENT_ACTIONS).toEqual(['hide', 'unhide', 'pin', 'unpin']);
  });

  it('pages all comments with a boolean equality on isHidden', async () => {
    mocks.fetchAdminPage.mockResolvedValue(
      makePage([{ id: 'comment-1', ...COMMENT }], {
        lastDoc: 'cursor-1',
        hasMore: true,
      })
    );

    const result = await listCommentsPage();

    expect(mocks.allComments).toHaveBeenCalledTimes(1);
    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('all-comments', {
      conditions: [['isHidden', 'in', [true, false]]],
      orderField: 'createdAt',
      direction: 'desc',
      cursor: null,
      pageSize: 20,
    });
    expect(result.items).toEqual([{ id: 'comment-1', key: 'tale-1/comment-1', ...COMMENT }]);
    expect(result.lastDoc).toBe('cursor-1');
    expect(result.hasMore).toBe(true);
  });

  it.each([
    ['visible', [['isHidden', '==', false]]],
    ['hidden', [['isHidden', '==', true]]],
    ['pinned', [['isPinned', '==', true]]],
  ])('builds the %s filter', async (filter, conditions) => {
    await listCommentsPage({ filter, direction: 'asc', cursor: 'cursor-1' });

    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('all-comments', {
      conditions,
      orderField: 'createdAt',
      direction: 'asc',
      cursor: 'cursor-1',
      pageSize: 20,
    });
  });

  it('falls back to the all filter for an unknown value', async () => {
    await listCommentsPage({ filter: 'not-a-filter' });

    expect(mocks.fetchAdminPage.mock.calls[0][1].conditions).toEqual([
      ['isHidden', 'in', [true, false]],
    ]);
  });

  it('loads a comment with its tale summary', async () => {
    mocks.getDoc.mockResolvedValueOnce(makeSnapshot('comment-1', COMMENT)).mockResolvedValueOnce(
      makeSnapshot('tale-1', {
        title: 'The Long Night',
        status: 'published',
        visibility: 'public',
      })
    );

    const result = await getCommentDetail('tale-1', 'comment-1');

    expect(mocks.comment).toHaveBeenCalledWith('tale-1', 'comment-1');
    expect(result).toMatchObject({
      id: 'comment-1',
      key: 'tale-1/comment-1',
      text: 'A fine reflection.',
      tale: {
        id: 'tale-1',
        title: 'The Long Night',
        status: 'published',
        visibility: 'public',
      },
    });
  });

  it('keeps the comment visible when its tale summary cannot be read', async () => {
    mocks.getDoc
      .mockResolvedValueOnce(makeSnapshot('comment-1', COMMENT))
      .mockRejectedValueOnce(new Error('tale read failed'));

    const result = await getCommentDetail('tale-1', 'comment-1');

    expect(result.text).toBe('A fine reflection.');
    expect(result.tale).toBeNull();
  });

  it('returns null for a missing comment', async () => {
    mocks.getDoc.mockResolvedValue(missingSnapshot('comment-1'));

    await expect(getCommentDetail('tale-1', 'comment-1')).resolves.toBeNull();
  });

  it('hides a comment while preserving the pin flag and sending every rule field', async () => {
    mocks.getDoc.mockResolvedValue(
      makeSnapshot('comment-1', { ...COMMENT, isPinned: true, reportCount: 4 })
    );

    const result = await moderateComment('tale-1', 'comment-1', 'hide');

    expect(mocks.updateDoc).toHaveBeenCalledWith('comment:tale-1/comment-1', {
      isHidden: true,
      isPinned: true,
      reportCount: 4,
      updatedAt: 'server-timestamp',
    });
    expect(result).toEqual({ commentId: 'comment-1', isHidden: true, isPinned: true });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'staff-1',
        actorRole: 'moderator',
        action: 'comment.hide',
        targetType: 'comment',
        targetId: 'comment-1',
        summary: 'Hid comment comment-1 on tale tale-1.',
      })
    );
  });

  it('unpins a hidden comment and preserves its hidden state', async () => {
    mocks.getDoc.mockResolvedValue(
      makeSnapshot('comment-1', { ...COMMENT, isHidden: true, isPinned: true })
    );

    const result = await moderateComment('tale-1', 'comment-1', 'unpin');

    expect(mocks.updateDoc).toHaveBeenCalledWith('comment:tale-1/comment-1', {
      isHidden: true,
      isPinned: false,
      reportCount: 0,
      updatedAt: 'server-timestamp',
    });
    expect(result).toEqual({ commentId: 'comment-1', isHidden: true, isPinned: false });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Unpinned comment comment-1 on tale tale-1.' })
    );
  });

  it('validates the action before resolving staff or writing', async () => {
    await expect(moderateComment('tale-1', 'comment-1', 'delete')).rejects.toThrow(
      /action must be one of/i
    );
    expect(mocks.getStaffIdentity).not.toHaveBeenCalled();
    expect(mocks.updateDoc).not.toHaveBeenCalled();
  });

  it('surfaces a rejected moderation write', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('comment-1', COMMENT));
    mocks.updateDoc.mockRejectedValue({ code: 'permission-denied' });

    await expect(moderateComment('tale-1', 'comment-1', 'pin')).rejects.toThrow(
      /rejected the comment update/i
    );
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('deletes a comment and audits the real caller', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('comment-1', COMMENT));

    const result = await deleteComment('tale-1', 'comment-1');

    expect(mocks.deleteDoc).toHaveBeenCalledWith('comment:tale-1/comment-1');
    expect(result).toEqual({ commentId: 'comment-1', authorName: 'Reader One' });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'staff-1',
        action: 'comment.delete',
        targetType: 'comment',
        targetId: 'comment-1',
      })
    );
  });

  it('does not delete a comment that is already gone', async () => {
    mocks.getDoc.mockResolvedValue(missingSnapshot('comment-1'));

    await expect(deleteComment('tale-1', 'comment-1')).rejects.toThrow(/no longer exists/i);
    expect(mocks.deleteDoc).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('keeps a successful moderation when the audit write fails', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('comment-1', COMMENT));
    mocks.writeAdminAuditLog.mockRejectedValue(new Error('audit offline'));

    await expect(moderateComment('tale-1', 'comment-1', 'pin')).resolves.toMatchObject({
      isPinned: true,
    });
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
  });
});
