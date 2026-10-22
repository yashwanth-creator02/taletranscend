// src/services/admin/__tests__/reports.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listReportsPage, getReportDetail, resolveReport } from '../reports.service.js';
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
const mockUpdateDoc = vi.fn();

vi.mock('@fb/index.js', () => ({
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    reports: vi.fn(() => 'reports'),
    report: vi.fn((id) => `report/${id}`),
    tale: vi.fn((id) => `tale/${id}`),
    comment: vi.fn((taleId, commentId) => `tale/${taleId}/comment/${commentId}`),
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

const REPORT = {
  reporterId: 'reader-1',
  targetType: 'tale',
  targetId: 'tale-1',
  reason: 'This tale contains unattributed material.',
  status: 'pending',
  createdAt: '2026-10-02T10:00:00.000Z',
};

describe('reports service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockReset();
    mockUpdateDoc.mockResolvedValue(undefined);
    vi.mocked(fetchAdminPage).mockResolvedValue({ items: [], lastDoc: null, hasMore: false });
    vi.mocked(getStaffIdentity).mockResolvedValue({
      uid: 'staff-1',
      role: 'moderator',
      email: 'staff@example.com',
      displayName: 'Staff One',
    });
    vi.mocked(writeAdminAuditLog).mockResolvedValue({ success: true });
  });

  it('pages pending reports newest first by default', async () => {
    await listReportsPage();

    expect(fetchAdminPage).toHaveBeenCalledWith('reports', {
      conditions: [['status', '==', 'pending']],
      orderField: 'createdAt',
      direction: 'desc',
      cursor: null,
    });
  });

  it('supports status filters, sort direction, and a cursor', async () => {
    const cursor = { id: 'cursor-2' };

    await listReportsPage({ status: 'dismissed', direction: 'asc', cursor });

    expect(fetchAdminPage).toHaveBeenCalledWith('reports', {
      conditions: [['status', '==', 'dismissed']],
      orderField: 'createdAt',
      direction: 'asc',
      cursor,
    });
  });

  it('drops the where clause for the all-status filter', async () => {
    await listReportsPage({ status: 'all' });

    expect(fetchAdminPage.mock.calls[0][1].conditions).toEqual([]);
  });

  it('loads a report together with a summary of its tale target', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('rep-1', REPORT))
      .mockResolvedValueOnce(
        docSnapshot('tale-1', { title: 'The Salt Road', authorName: 'Mara Voss' })
      );

    const detail = await getReportDetail('rep-1');

    expect(detail).toMatchObject({
      id: 'rep-1',
      targetType: 'tale',
      targetSummary: {
        type: 'tale',
        id: 'tale-1',
        label: 'The Salt Road',
        detail: 'Mara Voss',
      },
    });
  });

  it('keeps the report readable when the target is gone', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnapshot('rep-1', REPORT))
      .mockResolvedValueOnce({ exists: () => false });

    const detail = await getReportDetail('rep-1');

    expect(detail.targetSummary).toBeNull();
    expect(detail.reason).toBe(REPORT.reason);
  });

  it('resolves a report with the real actor, server timestamp, and audit entry', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('rep-1', REPORT));

    const result = await resolveReport('rep-1', 'resolved', {
      notes: 'Attribution was corrected by the author.',
    });

    expect(result).toEqual({ reportId: 'rep-1', status: 'resolved' });
    expect(mockUpdateDoc).toHaveBeenCalledWith('report/rep-1', {
      status: 'resolved',
      reviewedBy: 'staff-1',
      reviewedAt: 'SERVER_TIMESTAMP',
      resolutionNotes: 'Attribution was corrected by the author.',
    });
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'staff-1',
        actorRole: 'moderator',
        action: 'report.resolved',
        targetType: 'report',
        targetId: 'rep-1',
      })
    );
  });

  it('dismisses a report without inventing a resolution note', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('rep-1', REPORT));

    await resolveReport('rep-1', 'dismissed');

    const update = mockUpdateDoc.mock.calls[0][1];
    expect(update).toEqual({
      status: 'dismissed',
      reviewedBy: 'staff-1',
      reviewedAt: 'SERVER_TIMESTAMP',
    });
    expect(update).not.toHaveProperty('resolutionNotes');
  });

  it('refuses to decide a report that is no longer pending', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('rep-1', { ...REPORT, status: 'resolved' }));

    await expect(resolveReport('rep-1', 'dismissed')).rejects.toThrow(
      'Only pending reports can be decided.'
    );

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
  });

  it('refuses an unsupported resolution', async () => {
    await expect(resolveReport('rep-1', 'archived')).rejects.toThrow(
      'Resolution must be either "resolved" or "dismissed".'
    );

    expect(getStaffIdentity).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('rejects resolution notes longer than 1000 characters before reading anything', async () => {
    await expect(resolveReport('rep-1', 'resolved', { notes: 'y'.repeat(1001) })).rejects.toThrow(
      '1000 characters or fewer'
    );

    expect(getStaffIdentity).not.toHaveBeenCalled();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });
});
