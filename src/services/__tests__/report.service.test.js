// src/services/__tests__/report.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendReportResponse,
  createReport,
  getUserReports,
  REPORT_STATUS_LABELS,
} from '../report.service.js';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'reader-1', displayName: 'Reader One' } },
  batchSet: vi.fn(),
  batchCommit: vi.fn(),
  doc: vi.fn((ref) => ({ id: 'report-1', path: ref })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  isRegisteredUser: vi.fn(() => true),
  limit: vi.fn((value) => ({ type: 'limit', value })),
  orderBy: vi.fn((field, direction) => ({ type: 'orderBy', field, direction })),
  query: vi.fn((...args) => ({ type: 'query', args })),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  where: vi.fn((field, operator, value) => ({ type: 'where', field, operator, value })),
  writeBatch: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  auth: mocks.auth,
  db: { name: 'test-db' },
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  limit: mocks.limit,
  orderBy: mocks.orderBy,
  query: mocks.query,
  refs: {
    reports: vi.fn(() => 'reports'),
    reportHistory: vi.fn(() => 'reportHistory'),
    reportHistoryEntry: vi.fn((id) => `reportHistory/${id}`),
  },
  serverTimestamp: mocks.serverTimestamp,
  where: mocks.where,
  writeBatch: mocks.writeBatch,
}));

vi.mock('../auth.guard.js', () => ({
  isRegisteredUser: mocks.isRegisteredUser,
}));

describe('report service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.currentUser = { uid: 'reader-1', displayName: 'Reader One' };
    mocks.isRegisteredUser.mockReturnValue(true);
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.writeBatch.mockReturnValue({
      set: mocks.batchSet,
      commit: mocks.batchCommit,
    });
    mocks.getDocs.mockResolvedValue({ docs: [] });
    mocks.getDoc.mockResolvedValue({ exists: () => false });
  });

  it('writes the staff report and reporter-safe history atomically', async () => {
    const result = await createReport({
      subject: 'Broken page',
      description: 'The page returns a 404 even though the link is valid.',
      category: 'bug',
      targetType: 'page',
      targetId: '/missing-page',
      pageUrl: 'https://example.test/missing-page',
    });

    expect(result).toEqual({ reportId: 'report-1' });
    expect(mocks.writeBatch).toHaveBeenCalledWith({ name: 'test-db' });
    expect(mocks.batchCommit).toHaveBeenCalledTimes(1);

    const [reportRef, report] = mocks.batchSet.mock.calls[0];
    expect(reportRef).toMatchObject({ id: 'report-1', path: 'reports' });
    expect(report).toMatchObject({
      reporterId: 'reader-1',
      reporterName: 'Reader One',
      subject: 'Broken page',
      reason: 'Broken page',
      category: 'bug',
      targetType: 'page',
      targetId: '/missing-page',
      status: 'pending',
      userVisibleStatus: 'Submitted',
      latestResponse: '',
      responses: [],
      createdAt: 'SERVER_TIMESTAMP',
    });

    const [historyRef, history] = mocks.batchSet.mock.calls[1];
    expect(historyRef).toBe('reportHistory/report-1');
    expect(history).toMatchObject({
      reportId: 'report-1',
      reporterId: 'reader-1',
      subject: 'Broken page',
      status: 'pending',
      latestResponse: '',
      createdAt: 'SERVER_TIMESTAMP',
    });
  });

  it('normalises unknown categories and target types instead of trusting input', async () => {
    await createReport({
      subject: 'Odd request',
      description: 'A description long enough to pass validation.',
      category: 'not-a-category',
      targetType: 'not-a-target',
    });

    const report = mocks.batchSet.mock.calls[0][1];
    expect(report.category).toBe('other');
    expect(report.targetType).toBe('website');
    expect(report.targetId).toBe('website');
  });

  it('rejects anonymous reporters before writing anything', async () => {
    mocks.isRegisteredUser.mockReturnValue(false);

    await expect(
      createReport({ subject: 'No auth', description: 'Should not be written.' })
    ).rejects.toThrow('Only registered readers can submit reports.');

    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it('reads only the current reporter history newest first', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [{ id: 'report-1', data: () => ({ subject: 'Broken page', status: 'pending' }) }],
    });

    const result = await getUserReports();

    expect(mocks.query).toHaveBeenCalledWith(
      'reportHistory',
      expect.objectContaining({ type: 'where', field: 'reporterId', value: 'reader-1' }),
      expect.objectContaining({ type: 'orderBy', field: 'createdAt', direction: 'desc' }),
      expect.objectContaining({ type: 'limit', value: 50 })
    );
    expect(result).toEqual([{ id: 'report-1', subject: 'Broken page', status: 'pending' }]);
  });

  it('appends a response without dropping earlier responses', () => {
    const updated = appendReportResponse(
      { subject: 'Broken page' },
      [{ body: 'First reply', status: 'responded' }],
      'A second reply',
      'resolved'
    );

    expect(updated).toMatchObject({
      subject: 'Broken page',
      status: 'resolved',
      userVisibleStatus: REPORT_STATUS_LABELS.resolved,
      latestResponse: 'A second reply',
    });
    expect(updated.responses).toHaveLength(2);
    expect(updated.responses[0]).toEqual({ body: 'First reply', status: 'responded' });
    expect(updated.responses[1]).toMatchObject({
      body: 'A second reply',
      status: 'resolved',
    });
  });
});
