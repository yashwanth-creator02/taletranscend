// src/services/admin/__tests__/deletion.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listDeletionRequestsPage,
  getDeletionRequestDetail,
  decideDeletionRequest,
} from '../deletion.service.js';
import { fetchAdminPage } from '../pagination.service.js';
import { writeAdminAuditLog } from '../audit.service.js';
import { getStaffIdentity } from '../session.service.js';
import { createNotificationForUser } from '../../notification.service.js';

vi.mock('../pagination.service.js', () => ({
  fetchAdminPage: vi.fn(),
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../session.service.js', () => ({
  getStaffIdentity: vi.fn(),
}));

vi.mock('../../notification.service.js', () => ({
  createNotificationForUser: vi.fn().mockResolvedValue('notif-1'),
}));

const mockGetDoc = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn();
const mockBatch = {
  update: (...args) => mockBatchUpdate(...args),
  delete: (...args) => mockBatchDelete(...args),
  commit: () => mockBatchCommit(),
};
const mockWriteBatch = vi.fn(() => mockBatch);

vi.mock('@fb/index.js', () => ({
  db: { name: 'test-db' },
  getDoc: (...args) => mockGetDoc(...args),
  writeBatch: (...args) => mockWriteBatch(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    deletionRequests: vi.fn(() => 'deletionRequests'),
    deletionRequest: vi.fn((id) => `deletionRequest/${id}`),
    tale: vi.fn((id) => `tale/${id}`),
  },
}));

/**
 * @param {string} id
 * @param {Record<string, unknown>} data
 * @returns {{ id: string, exists: () => boolean, data: () => Record<string, unknown> }}
 */
function docSnapshot(id, data) {
  return { id, exists: () => true, data: () => data };
}

const REQUEST = {
  userId: 'author-1',
  taleId: 'tale-1',
  reason: 'The author asked for the chronicle to be withdrawn.',
  status: 'pending',
  createdAt: '2026-10-01T10:00:00.000Z',
};

const TALE = {
  title: 'The Long Night',
  authorId: 'author-1',
  authorName: 'A. Author',
};

describe('deletion service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockReset();
    mockBatchUpdate.mockReset();
    mockBatchDelete.mockReset();
    mockBatchCommit.mockReset();
    mockBatchCommit.mockResolvedValue(undefined);
    vi.mocked(fetchAdminPage).mockResolvedValue({ items: [], lastDoc: null, hasMore: false });
    vi.mocked(getStaffIdentity).mockResolvedValue({
      uid: 'staff-1',
      role: 'admin',
      email: 'staff@example.com',
      displayName: 'Staff One',
    });
    vi.mocked(writeAdminAuditLog).mockResolvedValue({ success: true });
    vi.mocked(createNotificationForUser).mockResolvedValue('notif-1');
  });

  it('pages pending deletion requests newest first by default', async () => {
    await listDeletionRequestsPage();

    expect(fetchAdminPage).toHaveBeenCalledWith('deletionRequests', {
      conditions: [['status', '==', 'pending']],
      orderField: 'createdAt',
      direction: 'desc',
      cursor: null,
    });
  });

  it('supports status filters, ascending order, and a cursor', async () => {
    const cursor = { id: 'cursor-1' };

    await listDeletionRequestsPage({ status: 'approved', direction: 'asc', cursor });

    expect(fetchAdminPage).toHaveBeenCalledWith('deletionRequests', {
      conditions: [['status', '==', 'approved']],
      orderField: 'createdAt',
      direction: 'asc',
      cursor,
    });
  });

  it('searches tale ids by prefix with ascending id order', async () => {
    await listDeletionRequestsPage({ status: 'approved', search: '  tale-1  ' });

    expect(fetchAdminPage).toHaveBeenCalledWith('deletionRequests', {
      conditions: [
        ['status', '==', 'approved'],
        ['taleId', '>=', 'tale-1'],
        ['taleId', '<=', 'tale-1\uf8ff'],
      ],
      orderField: 'taleId',
      direction: 'asc',
      cursor: null,
    });
  });

  it('drops the where clause for the all-status filter', async () => {
    await listDeletionRequestsPage({ status: 'all' });

    expect(fetchAdminPage.mock.calls[0][1].conditions).toEqual([]);
  });

  it('falls back to pending for an unknown status', async () => {
    await listDeletionRequestsPage({ status: 'not-a-status' });

    expect(fetchAdminPage.mock.calls[0][1].conditions).toEqual([['status', '==', 'pending']]);
  });

  it('loads a request together with its tale title and author', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('req-1', REQUEST))
      .mockResolvedValueOnce(docSnapshot('tale-1', TALE));

    const detail = await getDeletionRequestDetail('req-1');

    expect(detail).toMatchObject({
      id: 'req-1',
      status: 'pending',
      tale: {
        id: 'tale-1',
        title: 'The Long Night',
        authorId: 'author-1',
        authorName: 'A. Author',
      },
    });
  });

  it('returns null when the request does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await expect(getDeletionRequestDetail('missing')).resolves.toBeNull();
  });

  it('approves a request by deleting the tale and recording the real actor', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('req-1', REQUEST))
      .mockResolvedValueOnce(docSnapshot('tale-1', TALE));

    const result = await decideDeletionRequest('req-1', 'approved', {
      notes: 'Confirmed by the archive council.',
    });

    expect(result).toEqual({ requestId: 'req-1', status: 'approved' });
    expect(mockBatchUpdate).toHaveBeenCalledWith('deletionRequest/req-1', {
      status: 'approved',
      reviewedBy: 'staff-1',
      reviewedAt: 'SERVER_TIMESTAMP',
      adminNotes: 'Confirmed by the archive council.',
    });
    expect(mockBatchDelete).toHaveBeenCalledWith('tale/tale-1');
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'staff-1',
        actorRole: 'admin',
        action: 'deletion.approved',
        targetType: 'deletionRequest',
        targetId: 'req-1',
      })
    );
    expect(createNotificationForUser).toHaveBeenCalledWith(
      'author-1',
      expect.objectContaining({
        type: 'system',
        title: 'Tale Deletion Approved',
        taleId: 'tale-1',
      })
    );
  });

  it('refuses to approve a petition when the tale no longer exists', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('req-1', REQUEST))
      .mockResolvedValueOnce({ exists: () => false });

    await expect(decideDeletionRequest('req-1', 'approved')).rejects.toThrow(
      'referenced tale no longer exists'
    );

    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('refuses to approve a petition when the requester does not own the tale', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('req-1', REQUEST))
      .mockResolvedValueOnce(docSnapshot('tale-1', { ...TALE, authorId: 'someone-else' }));

    await expect(decideDeletionRequest('req-1', 'approved')).rejects.toThrow(
      'does not match the current owner'
    );

    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('rejects a request without deleting the tale and still notifies the author', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('req-1', REQUEST))
      .mockResolvedValueOnce(docSnapshot('tale-1', TALE));

    await decideDeletionRequest('req-1', 'rejected');

    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchUpdate).toHaveBeenCalledWith('deletionRequest/req-1', {
      status: 'rejected',
      reviewedBy: 'staff-1',
      reviewedAt: 'SERVER_TIMESTAMP',
    });
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deletion.rejected', actorRole: 'admin' })
    );
    expect(createNotificationForUser).toHaveBeenCalledWith(
      'author-1',
      expect.objectContaining({ title: 'Tale Deletion Declined' })
    );
  });

  it('uses the moderator role from the real staff identity in the audit entry', async () => {
    vi.mocked(getStaffIdentity).mockResolvedValue({
      uid: 'mod-1',
      role: 'moderator',
      email: '',
      displayName: '',
    });
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('req-1', REQUEST))
      .mockResolvedValueOnce(docSnapshot('tale-1', TALE));

    await decideDeletionRequest('req-1', 'rejected');

    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'mod-1', actorRole: 'moderator' })
    );
  });

  it('refuses to decide a request that is no longer pending', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('req-1', { ...REQUEST, status: 'approved' }));

    await expect(decideDeletionRequest('req-1', 'rejected')).rejects.toThrow(
      'Only pending deletion requests can be decided.'
    );

    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
    expect(createNotificationForUser).not.toHaveBeenCalled();
  });

  it('rejects review notes longer than 1000 characters before reading anything', async () => {
    await expect(
      decideDeletionRequest('req-1', 'approved', { notes: 'x'.repeat(1001) })
    ).rejects.toThrow('1000 characters or fewer');

    expect(getStaffIdentity).not.toHaveBeenCalled();
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  it('refuses an unsupported decision', async () => {
    await expect(decideDeletionRequest('req-1', 'deleted')).rejects.toThrow(
      'Decision must be either "approved" or "rejected".'
    );

    expect(getStaffIdentity).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});
