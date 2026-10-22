import { describe, expect, it, vi, beforeEach } from 'vitest';
import { listReportsPage, resolveReport } from '../reports.service.js';
import { fetchAdminPage } from '../pagination.service.js';
import { writeAdminAuditLog } from '../audit.service.js';

vi.mock('../pagination.service.js', () => ({
  fetchAdminPage: vi.fn(),
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: vi.fn().mockResolvedValue({ success: true }),
}));

const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('@fb/index.js', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    reports: vi.fn().mockReturnValue({}),
    report: vi.fn(),
  },
}));

describe('reports service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a paginated page of pending reports', async () => {
    vi.mocked(fetchAdminPage).mockResolvedValue({
      items: [{ id: 'rep-1', reporterId: 'user-1', targetType: 'tale' }],
      lastDoc: null,
      hasMore: false,
    });

    const result = await listReportsPage();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('rep-1');
  });

  it('writes an audit log entry when resolving a report', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ reporterId: 'mod-1', targetType: 'tale', targetId: 'tale-1' }),
      id: 'rep-1',
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    await resolveReport('rep-1', 'resolved');

    expect(writeAdminAuditLog).toHaveBeenCalled();
    expect(writeAdminAuditLog.mock.calls[0][0]).toMatchObject({
      action: 'report.resolved',
      targetType: 'report',
    });
  });
});
