// src/services/admin/__tests__/content.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TALE_STATUSES,
  TALE_VISIBILITIES,
  deleteTale,
  getTaleDetail,
  listTalesPage,
  updateTale,
} from '../content.service.js';

const mocks = vi.hoisted(() => ({
  deleteDoc: vi.fn(),
  getCountFromServer: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn((value) => ({ limit: value })),
  orderBy: vi.fn((field, direction) => ({ orderBy: field, direction })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  updateDoc: vi.fn(),
  writeBatch: vi.fn(),
  batchSet: vi.fn(),
  batchUpdate: vi.fn(),
  batchCommit: vi.fn(),
  fetchAdminPage: vi.fn(),
  writeAdminAuditLog: vi.fn(),
  getStaffIdentity: vi.fn(),
  createNotificationForUser: vi.fn(),
  tales: vi.fn(() => 'tales-collection'),
  tale: vi.fn((id) => `tale:${id}`),
  chapters: vi.fn((id) => `chapters:${id}`),
  comments: vi.fn((id) => `comments:${id}`),
  softDeletion: vi.fn((id) => `softDeletion:${id}`),
}));

vi.mock('@fb/index.js', () => ({
  db: { name: 'test-db' },
  deleteDoc: mocks.deleteDoc,
  getCountFromServer: mocks.getCountFromServer,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  limit: mocks.limit,
  orderBy: mocks.orderBy,
  query: mocks.query,
  refs: {
    tales: mocks.tales,
    tale: mocks.tale,
    chapters: mocks.chapters,
    comments: mocks.comments,
    softDeletion: mocks.softDeletion,
  },
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
  writeBatch: mocks.writeBatch,
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    tales: mocks.tales,
    tale: mocks.tale,
    chapters: mocks.chapters,
    comments: mocks.comments,
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

vi.mock('../../notification.service.js', () => ({
  createNotificationForUser: mocks.createNotificationForUser,
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

const TALE = {
  title: 'The Long Night',
  authorId: 'author-1',
  authorName: 'A. Author',
  status: 'published',
  visibility: 'public',
  publishedAt: 'published-at',
  readCount: 4,
  commentCount: 2,
  reactionCount: 1,
  bookmarkCount: 0,
  chapterCount: 1,
  commentCountStored: 2,
};

describe('admin content service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.serverTimestamp.mockReturnValue('server-timestamp');
    mocks.fetchAdminPage.mockResolvedValue(makePage([]));
    mocks.getCountFromServer.mockResolvedValue({ data: () => ({ count: 2 }) });
    mocks.getDocs.mockResolvedValue({
      docs: [{ id: '0', data: () => ({ title: 'Chapter One', index: 0 }) }],
      size: 1,
    });
    mocks.writeAdminAuditLog.mockResolvedValue({ success: true });
    mocks.getStaffIdentity.mockResolvedValue({
      uid: 'staff-1',
      role: 'admin',
      email: '',
      displayName: '',
    });
    mocks.updateDoc.mockResolvedValue(undefined);
    mocks.deleteDoc.mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({
      set: mocks.batchSet,
      update: mocks.batchUpdate,
      commit: mocks.batchCommit,
    });
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.createNotificationForUser.mockResolvedValue('notif-1');
  });

  it('pages the whole tales collection newest-updated first', async () => {
    mocks.fetchAdminPage.mockResolvedValue(
      makePage([{ id: 'tale-1', title: 'The Long Night' }], {
        lastDoc: 'cursor-1',
        hasMore: true,
      })
    );

    const result = await listTalesPage();

    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('tales-collection', {
      conditions: [],
      orderField: 'updatedAt',
      direction: 'desc',
      cursor: null,
      pageSize: 20,
    });
    expect(result.items).toEqual([{ id: 'tale-1', title: 'The Long Night' }]);
    expect(result.lastDoc).toBe('cursor-1');
    expect(result.hasMore).toBe(true);
  });

  it('applies the status filter while keeping updated order', async () => {
    await listTalesPage({ status: 'draft', direction: 'asc', cursor: 'cursor-1' });

    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('tales-collection', {
      conditions: [['status', '==', 'draft']],
      orderField: 'updatedAt',
      direction: 'asc',
      cursor: 'cursor-1',
      pageSize: 20,
    });
  });

  it('searches titles by prefix and combines the status filter', async () => {
    await listTalesPage({ search: '  The  ', status: 'published' });

    expect(mocks.fetchAdminPage).toHaveBeenCalledWith('tales-collection', {
      conditions: [
        ['status', '==', 'published'],
        ['title', '>=', 'The'],
        ['title', '<=', 'The\uf8ff'],
      ],
      orderField: 'title',
      direction: 'asc',
      cursor: null,
      pageSize: 20,
    });
  });

  it('resolves a full tale id to one exact record without paging', async () => {
    const taleId = 'a'.repeat(28);
    mocks.getDoc.mockResolvedValue(makeSnapshot(taleId, { title: 'Exact Tale', status: 'draft' }));

    const result = await listTalesPage({ search: taleId });

    expect(mocks.tale).toHaveBeenCalledWith(taleId);
    expect(mocks.fetchAdminPage).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [{ id: taleId, title: 'Exact Tale', status: 'draft' }],
      lastDoc: null,
      hasMore: false,
    });
  });

  it('falls back to title search when an id-shaped search misses', async () => {
    const taleId = 'b'.repeat(28);
    mocks.getDoc.mockResolvedValue(missingSnapshot(taleId));

    await listTalesPage({ search: taleId });

    expect(mocks.getDoc).toHaveBeenCalledTimes(1);
    expect(mocks.fetchAdminPage).toHaveBeenCalledWith(
      'tales-collection',
      expect.objectContaining({
        conditions: [
          ['title', '>=', taleId],
          ['title', '<=', `${taleId}\uf8ff`],
        ],
        orderField: 'title',
      })
    );
  });

  it('loads the tale, its chapters, and the live comment count', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('tale-1', TALE));

    const result = await getTaleDetail('tale-1');

    expect(result).toMatchObject({
      id: 'tale-1',
      title: 'The Long Night',
      chapters: [{ id: '0', title: 'Chapter One', index: 0 }],
      chaptersUnavailable: false,
      chaptersTruncated: false,
      commentCount: 2,
    });
    expect(mocks.query).toHaveBeenCalledWith(
      'chapters:tale-1',
      { orderBy: 'index', direction: 'asc' },
      { limit: 50 }
    );
    expect(mocks.getCountFromServer).toHaveBeenCalledWith('comments:tale-1');
  });

  it('returns explicit unavailable chapter state when the chapter read fails', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('tale-1', TALE));
    mocks.getDocs.mockRejectedValue(new Error('chapter read failed'));

    const result = await getTaleDetail('tale-1');

    expect(result.chapters).toBeNull();
    expect(result.chaptersUnavailable).toBe(true);
    expect(result.commentCount).toBe(2);
  });

  it('returns null for a missing tale', async () => {
    mocks.getDoc.mockResolvedValue(missingSnapshot('missing'));

    await expect(getTaleDetail('missing')).resolves.toBeNull();
    expect(mocks.getDocs).not.toHaveBeenCalled();
  });

  it('writes the rule-required fields and stamps publishedAt on first publication', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('tale-1', { ...TALE, publishedAt: null }));

    const result = await updateTale('tale-1', {
      title: '  The Longest Night  ',
      status: 'published',
      visibility: 'public',
    });

    expect(mocks.updateDoc).toHaveBeenCalledWith('tale:tale-1', {
      title: 'The Longest Night',
      status: 'published',
      visibility: 'public',
      publishedAt: 'server-timestamp',
      updatedAt: 'server-timestamp',
    });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'staff-1',
        actorRole: 'admin',
        action: 'tale.update',
        targetType: 'tale',
        targetId: 'tale-1',
      })
    );
    expect(result).toEqual({
      title: 'The Longest Night',
      status: 'published',
      visibility: 'public',
      publishedAt: 'server-timestamp',
      updatedAt: 'server-timestamp',
    });
  });

  it('adds zero counters only when a legacy tale is missing one', async () => {
    const { commentCount: _ignored, ...legacyTale } = TALE;
    mocks.getDoc.mockResolvedValue(makeSnapshot('tale-1', legacyTale));

    await updateTale('tale-1', { title: 'The Long Night' });

    expect(mocks.updateDoc).toHaveBeenCalledWith('tale:tale-1', {
      title: 'The Long Night',
      commentCount: 0,
      updatedAt: 'server-timestamp',
    });
  });

  it('validates every exposed field before resolving staff or writing', async () => {
    expect(TALE_STATUSES).toEqual(['draft', 'submitted', 'published', 'rejected']);
    expect(TALE_VISIBILITIES).toEqual(['public', 'private', 'unlisted']);

    await expect(updateTale('tale-1', { title: '   ' })).rejects.toThrow(/title is required/i);
    await expect(updateTale('tale-1', { status: 'deleted' })).rejects.toThrow(
      /status must be one/i
    );
    await expect(updateTale('tale-1', { visibility: 'secret' })).rejects.toThrow(
      /visibility must be one/i
    );
    await expect(updateTale('tale-1', {})).rejects.toThrow(
      /change the title, status, or visibility/i
    );

    expect(mocks.getStaffIdentity).not.toHaveBeenCalled();
    expect(mocks.updateDoc).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('surfaces the cooldown when Firestore rejects an update', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('tale-1', TALE));
    mocks.updateDoc.mockRejectedValue({ code: 'permission-denied' });

    await expect(updateTale('tale-1', { title: 'New title' })).rejects.toThrow(/five seconds/i);
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('soft-deletes the tale record, registers it, and audits the real caller', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('tale-1', TALE));

    const result = await deleteTale('tale-1');

    expect(mocks.batchUpdate).toHaveBeenCalledWith(
      'tale:tale-1',
      expect.objectContaining({
        isDeleted: true,
        status: 'deleted',
        visibility: 'private',
        deletionType: 'administrator',
      })
    );
    expect(mocks.batchSet).toHaveBeenCalledWith(
      'softDeletion:tale_tale-1',
      expect.objectContaining({
        entityType: 'tale',
        entityId: 'tale-1',
        status: 'deleted',
      })
    );
    expect(result).toEqual({ id: 'tale-1', title: 'The Long Night' });
    expect(mocks.writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'staff-1',
        action: 'tale.soft_delete',
        targetType: 'tale',
        targetId: 'tale-1',
      })
    );
    expect(mocks.createNotificationForUser).toHaveBeenCalledWith(
      'author-1',
      expect.objectContaining({
        title: 'Tale removed from public view',
        taleId: 'tale-1',
      })
    );
  });

  it('does not delete or audit a tale that is already gone', async () => {
    mocks.getDoc.mockResolvedValue(missingSnapshot('tale-1'));

    await expect(deleteTale('tale-1')).rejects.toThrow(/no longer exists/i);
    expect(mocks.batchUpdate).not.toHaveBeenCalled();
    expect(mocks.writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('keeps a successful update when the audit write fails', async () => {
    mocks.getDoc.mockResolvedValue(makeSnapshot('tale-1', TALE));
    mocks.writeAdminAuditLog.mockResolvedValue({ success: false });

    await expect(updateTale('tale-1', { title: 'Still saved' })).resolves.toMatchObject({
      title: 'Still saved',
    });
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
  });
});
