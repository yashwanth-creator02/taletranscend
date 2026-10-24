// src/services/admin/__tests__/overview.service.test.js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchOverviewStats } from '../overview.service.js';
import { listAdminAuditLogPage } from '../audit.service.js';

vi.mock('@fb/index.js', () => ({
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  getCountFromServer: vi.fn(),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    tales: vi.fn(() => 'tales'),
    users: vi.fn(() => 'users'),
    reports: vi.fn(() => 'reports'),
    authorApplications: vi.fn(() => 'applications'),
    deletionRequests: vi.fn(() => 'deletions'),
  },
}));

vi.mock('../audit.service.js', () => ({
  listAdminAuditLogPage: vi.fn(),
}));

describe('overview service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns live Firestore counts and recent audit entries', async () => {
    const { getCountFromServer } = await import('@fb/index.js');
    getCountFromServer
      .mockResolvedValueOnce({ data: () => ({ count: 42 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 120 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 5 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 2 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 3 }) });
    vi.mocked(listAdminAuditLogPage).mockResolvedValue({
      items: [
        {
          id: 'log-1',
          actorId: 'admin-uid',
          actorRole: 'admin',
          action: 'user.verification.update',
          targetType: 'user',
          targetId: 'target-uid',
          summary: 'Updated writer verification',
          createdAt: null,
        },
      ],
      lastDoc: null,
      hasMore: false,
      error: null,
    });

    const stats = await fetchOverviewStats();

    expect(stats).toEqual({
      totalTales: 42,
      totalProfiles: 120,
      pendingReports: 5,
      pendingApplications: 2,
      pendingDeletions: 3,
      recentAuditEntries: [
        {
          id: 'log-1',
          actorId: 'admin-uid',
          actorRole: 'admin',
          action: 'user.verification.update',
          targetType: 'user',
          targetId: 'target-uid',
          summary: 'Updated writer verification',
          createdAt: null,
        },
      ],
      auditUnavailable: false,
    });
    expect(listAdminAuditLogPage).toHaveBeenCalledWith({ pageSize: 5 });
  });

  it('returns null for a counter that cannot be read instead of estimating', async () => {
    const { getCountFromServer } = await import('@fb/index.js');
    getCountFromServer
      .mockResolvedValueOnce({ data: () => ({ count: 1 }) })
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce({ data: () => ({ count: 0 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 0 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 0 }) });

    const stats = await fetchOverviewStats({ includeAudit: false });

    expect(stats.totalTales).toBe(1);
    expect(stats.totalProfiles).toBeNull();
    expect(stats.recentAuditEntries).toEqual([]);
    expect(stats.auditUnavailable).toBe(false);
    expect(listAdminAuditLogPage).not.toHaveBeenCalled();
  });

  it('flags audit read failures without failing the counters', async () => {
    const { getCountFromServer } = await import('@fb/index.js');
    getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });
    vi.mocked(listAdminAuditLogPage).mockResolvedValue({
      items: [],
      lastDoc: null,
      hasMore: false,
      error: new Error('audit denied'),
    });

    const stats = await fetchOverviewStats();

    expect(stats.totalTales).toBe(0);
    expect(stats.auditUnavailable).toBe(true);
  });
});
