// src/services/admin/__tests__/reports.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listReportsPage,
  getReportDetail,
  markReportUnderReview,
  resolveReport,
  respondToReport,
  sendAdminMessage,
} from '../reports.service.js';
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
  createNotificationForUser: vi.fn(),
}));

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('@fb/index.js', () => ({
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    reports: vi.fn(() => 'reports'),
    report: vi.fn((id) => `report/${id}`),
    reportHistoryEntry: vi.fn((id) => `reportHistory/${id}`),
    reportPrivateNote: vi.fn((id) => `reportPrivateNote/${id}`),
    tale: vi.fn((id) => `tale/${id}`),
    comment: vi.fn((taleId, commentId) => `tale/${taleId}/comment/${commentId}`),
    commentReply: vi.fn(
      (taleId, commentId, replyId) => `tale/${taleId}/comment/${commentId}/reply/${replyId}`
    ),
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
    mockSetDoc.mockReset();
    mockUpdateDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    vi.mocked(fetchAdminPage).mockResolvedValue({ items: [], lastDoc: null, hasMore: false });
    vi.mocked(getStaffIdentity).mockResolvedValue({
      uid: 'staff-1',
      role: 'moderator',
      email: 'staff@example.com',
      displayName: 'Staff One',
    });
    vi.mocked(writeAdminAuditLog).mockResolvedValue({ success: true });
    vi.mocked(createNotificationForUser).mockResolvedValue('notification-1');
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

  it('searches target ids by prefix with ascending id order', async () => {
    await listReportsPage({ status: 'resolved', search: '  tale-1  ' });

    expect(fetchAdminPage).toHaveBeenCalledWith('reports', {
      conditions: [
        ['status', '==', 'resolved'],
        ['targetId', '>=', 'tale-1'],
        ['targetId', '<=', 'tale-1\uf8ff'],
      ],
      orderField: 'targetId',
      direction: 'asc',
      cursor: null,
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

  it('loads a report together with a summary of its reply target', async () => {
    mockGetDoc
      .mockResolvedValueOnce(
        docSnapshot('rep-1', {
          ...REPORT,
          targetType: 'reply',
          targetId: 'reply-1',
          taleId: 'tale-1',
          commentId: 'comment-1',
        })
      )
      .mockResolvedValueOnce(
        docSnapshot('reply-1', { text: 'A reply body', authorName: 'Reader Two' })
      )
      .mockResolvedValueOnce({ exists: () => false });

    const detail = await getReportDetail('rep-1');

    expect(detail.targetSummary).toEqual({
      type: 'reply',
      id: 'reply-1',
      label: 'A reply body',
      detail: 'Reader Two / comment comment-1',
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

  it('marks a pending report under review and mirrors the status for its reporter', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('rep-1', REPORT));

    const result = await markReportUnderReview('rep-1');

    expect(result).toEqual({ reportId: 'rep-1', status: 'under_review' });
    expect(mockUpdateDoc).toHaveBeenCalledWith('report/rep-1', {
      status: 'under_review',
      reviewedBy: 'staff-1',
      reviewedAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    });
    expect(mockSetDoc).toHaveBeenCalledWith(
      'reportHistory/rep-1',
      expect.objectContaining({
        status: 'under_review',
        userVisibleStatus: 'Under Review',
      }),
      { merge: true }
    );
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'report.under_review', targetId: 'rep-1' })
    );
  });

  it('delivers a response to the reporter inbox and stores a private note', async () => {
    mockGetDoc.mockResolvedValueOnce(
      docSnapshot('rep-1', {
        ...REPORT,
        status: 'under_review',
        subject: 'Unattributed chapter',
        responses: [{ body: 'We are reviewing this.', status: 'under_review' }],
      })
    );

    const result = await respondToReport('rep-1', {
      response: 'The attribution has been corrected.',
      status: 'resolved',
      privateNote: 'Confirmed with the author.',
    });

    expect(result).toEqual({
      reportId: 'rep-1',
      status: 'resolved',
      response: 'The attribution has been corrected.',
    });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'report/rep-1',
      expect.objectContaining({
        status: 'resolved',
        latestResponse: 'The attribution has been corrected.',
        userVisibleStatus: 'Resolved',
        respondedBy: 'staff-1',
      })
    );
    const update = mockUpdateDoc.mock.calls[0][1];
    expect(update.responses).toHaveLength(2);
    expect(update.responses[1]).toMatchObject({
      body: 'The attribution has been corrected.',
      status: 'resolved',
      authorId: 'staff-1',
    });
    expect(mockSetDoc).toHaveBeenCalledWith(
      'reportHistory/rep-1',
      expect.objectContaining({
        status: 'resolved',
        latestResponse: 'The attribution has been corrected.',
        userVisibleStatus: 'Resolved',
      }),
      { merge: true }
    );
    expect(mockSetDoc).toHaveBeenCalledWith('reportPrivateNote/rep-1', {
      notes: 'Confirmed with the author.',
      updatedBy: 'staff-1',
      updatedAt: 'SERVER_TIMESTAMP',
    });
    expect(createNotificationForUser).toHaveBeenCalledWith(
      'reader-1',
      expect.objectContaining({
        type: 'report_response',
        title: 'Response to your report: Unattributed chapter',
        body: 'The attribution has been corrected.',
        actionUrl: 'settings.html#section-support',
        reportId: 'rep-1',
      })
    );
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'report.resolved', targetId: 'rep-1' })
    );
  });

  it('refuses to respond to a closed report', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('rep-1', { ...REPORT, status: 'dismissed' }));

    await expect(respondToReport('rep-1', { response: 'Too late.' })).rejects.toThrow(
      'Closed reports cannot receive a response.'
    );

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(createNotificationForUser).not.toHaveBeenCalled();
  });

  it('refuses to respond to a resolved report', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('rep-1', { ...REPORT, status: 'resolved' }));

    await expect(respondToReport('rep-1', { response: 'Too late.' })).rejects.toThrow(
      'Resolved reports cannot receive a response.'
    );

    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(createNotificationForUser).not.toHaveBeenCalled();
  });

  it('sends a direct administrative message to an existing user inbox', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnapshot('reader-1', { displayName: 'Reader One' }));

    const result = await sendAdminMessage({
      recipientId: 'reader-1',
      subject: 'A note from the archive',
      body: 'Thank you for your report.',
      reportId: 'rep-1',
    });

    expect(result).toEqual({ notificationId: 'notification-1', recipientId: 'reader-1' });
    expect(createNotificationForUser).toHaveBeenCalledWith('reader-1', {
      type: 'admin_message',
      title: 'A note from the archive',
      body: 'Thank you for your report.',
      actionUrl: 'settings.html#section-support',
      fromUserId: 'staff-1',
      reportId: 'rep-1',
    });
    expect(writeAdminAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inbox.admin_message',
        targetType: 'user',
        targetId: 'reader-1',
      })
    );
  });

  it('rejects a direct message to a missing recipient', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    await expect(
      sendAdminMessage({ recipientId: 'missing-user', subject: 'Hello', body: 'Are you there?' })
    ).rejects.toThrow('That user could not be found.');

    expect(createNotificationForUser).not.toHaveBeenCalled();
    expect(writeAdminAuditLog).not.toHaveBeenCalled();
  });
});
