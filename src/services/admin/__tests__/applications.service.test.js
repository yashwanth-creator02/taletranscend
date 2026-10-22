// src/services/admin/__tests__/applications.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listApplicationsPage,
  getApplication,
  decideApplication,
} from '../applications.service.js';
import { fetchAdminPage } from '../pagination.service.js';
import { writeAdminAuditLog } from '../audit.service.js';
import { getStaffIdentity } from '../session.service.js';

vi.mock('../pagination.service.js', () => ({
  fetchAdminPage: vi.fn(),
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../session.service.js', () => ({
  getStaffIdentity: vi.fn(),
}));

const mockGetDoc = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn();
const mockBatch = {
  update: (...args) => mockBatchUpdate(...args),
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
    authorApplications: vi.fn(() => 'authorApplications'),
    authorApplication: vi.fn((id) => `authorApplication/${id}`),
    user: vi.fn((uid) => `user/${uid}`),
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

function missingSnapshot(id) {
  return { id, exists: () => false, data: () => undefined };
}

const APPLICATION = {
  applicantId: 'reader-1',
  penName: 'Mara Voss',
  bio: 'A teller of coastal myths.',
  sampleUrl: 'https://example.com/sample',
  status: 'pending',
  createdAt: '2026-10-03T10:00:00.000Z',
};

describe('applications service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockReset();
    mockBatchUpdate.mockReset();
    mockBatchCommit.mockReset();
    mockBatchCommit.mockResolvedValue(undefined);
    vi.mocked(fetchAdminPage).mockResolvedValue({ items: [], lastDoc: null, hasMore: false });
    vi.mocked(getStaffIdentity).mockResolvedValue({
      uid: 'admin-1',
      role: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin One',
    });
    vi.mocked(writeAdminAuditLog).mockResolvedValue({ success: true });
  });

  it('pages pending applications newest first by default', async () => {
    await listApplicationsPage();

    expect(fetchAdminPage).toHaveBeenCalledWith('authorApplications', {
      conditions: [['status', '==', 'pending']],
      orderField: 'createdAt',
      direction: 'desc',
      cursor: null,
    });
  });

  it('supports status filters, sort direction, and a cursor', async () => {
    const cursor = { id: 'cursor-3' };

    await listApplicationsPage({ status: 'rejected', direction: 'asc', cursor });

    expect(fetchAdminPage).toHaveBeenCalledWith('authorApplications', {
      conditions: [['status', '==', 'rejected']],
      orderField: 'createdAt',
      direction: 'asc',
      cursor,
    });
  });

  it('drops the where clause for the all-status filter', async () => {
    await listApplicationsPage({ status: 'all' });

    expect(fetchAdminPage.mock.calls[0][1].conditions).toEqual([]);
  });

  it('reads a single application', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('app-1', APPLICATION));

    await expect(getApplication('app-1')).resolves.toMatchObject({
      id: 'app-1',
      penName: 'Mara Voss',
      status: 'pending',
    });
  });

  it('lets an administrator approve with the caller UID, server timestamp, and notes', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('app-1', APPLICATION))
      .mockResolvedValueOnce(docSnapshot('reader-1', { role: 'reader' }));

    const result = await decideApplication('app-1', 'approved', 'Strong sample work.');

    expect(result).toEqual({
      applicationId: 'app-1',
      status: 'approved',
      authorRoleGranted: true,
    });
    expect(mockBatchUpdate).toHaveBeenCalledWith('authorApplication/app-1', {
      status: 'approved',
      reviewedBy: 'admin-1',
      reviewedAt: 'SERVER_TIMESTAMP',
      notes: 'Strong sample work.',
    });
    expect(mockBatchUpdate).toHaveBeenCalledWith('user/reader-1', {
      role: 'author',
      updatedAt: 'SERVER_TIMESTAMP',
    });
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        actorRole: 'admin',
        action: 'application.approved',
        targetType: 'authorApplication',
        targetId: 'app-1',
      })
    );
  });

  it('never copies the applicant ID into reviewedBy', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('app-1', APPLICATION));

    await decideApplication('app-1', 'rejected', '');

    const update = mockBatchUpdate.mock.calls[0][1];
    expect(update.reviewedBy).toBe('admin-1');
    expect(update.reviewedBy).not.toBe(APPLICATION.applicantId);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
  });

  it('does not demote an existing staff profile when approving', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('app-1', APPLICATION))
      .mockResolvedValueOnce(docSnapshot('reader-1', { role: 'moderator' }));

    const result = await decideApplication('app-1', 'approved');

    expect(result.authorRoleGranted).toBe(false);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('approves even when the applicant profile is missing, without a role write', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('app-1', APPLICATION))
      .mockResolvedValueOnce(missingSnapshot('reader-1'));

    const result = await decideApplication('app-1', 'approved');

    expect(result.authorRoleGranted).toBe(false);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
  });

  it('refuses an application with no applicant account attached', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('app-1', { ...APPLICATION, applicantId: '' }));

    await expect(decideApplication('app-1', 'approved')).rejects.toThrow(
      'no applicant account attached'
    );
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('blocks a moderator before any read or write', async () => {
    vi.mocked(getStaffIdentity).mockResolvedValue({
      uid: 'mod-1',
      role: 'moderator',
      email: '',
      displayName: '',
    });

    await expect(decideApplication('app-1', 'approved')).rejects.toThrow(
      'Only administrators can decide author applications.'
    );

    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('refuses to decide an application that is no longer pending', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('app-1', { ...APPLICATION, status: 'approved' }));

    await expect(decideApplication('app-1', 'rejected')).rejects.toThrow(
      'Only pending author applications can be decided.'
    );

    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('rejects notes longer than the 1000-character rule before reading anything', async () => {
    await expect(decideApplication('app-1', 'approved', 'z'.repeat(1001))).rejects.toThrow(
      '1000 characters or fewer'
    );

    expect(getStaffIdentity).not.toHaveBeenCalled();
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('refuses an unsupported decision', async () => {
    await expect(decideApplication('app-1', 'waitlisted')).rejects.toThrow(
      'Decision must be either "approved" or "rejected".'
    );

    expect(getStaffIdentity).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});
