// src/services/admin/__tests__/overview.service.test.js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchOverviewStats } from '../overview.service.js';
import { listAdminAuditLogPage } from '../audit.service.js';

vi.mock('@fb/index.js', () => ({
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    tales: vi.fn(),
    reports: vi.fn(),
    authorApplications: vi.fn(),
  },
}));

vi.mock('../audit.service.js', () => ({
  listAdminAuditLogPage: vi.fn(),
}));

describe('overview service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns overview stats with all required fields', async () => {
    const mockTalesSnap = {
      size: 42,
      docs: [{ data: () => ({ authorId: 'user-1' }) }, { data: () => ({ authorId: 'user-2' }) }],
    };
    const mockReportsSnap = { size: 5 };
    const mockAppsSnap = { size: 2 };
    const mockAuditPage = { items: [] };

    vi.mocked(await import('@fb/index.js')).getDocs.mockResolvedValueOnce(mockTalesSnap);
    vi.mocked(await import('@fb/index.js')).getDocs.mockResolvedValueOnce(mockReportsSnap);
    vi.mocked(await import('@fb/index.js')).getDocs.mockResolvedValueOnce(mockAppsSnap);
    vi.mocked(listAdminAuditLogPage).mockResolvedValue(mockAuditPage);

    const stats = await fetchOverviewStats();

    expect(stats).toHaveProperty('totalTales');
    expect(stats).toHaveProperty('totalUsers');
    expect(stats).toHaveProperty('pendingReports');
    expect(stats).toHaveProperty('pendingApplications');
    expect(stats).toHaveProperty('recentAuditEntries');
    expect(typeof stats.totalTales).toBe('number');
    expect(typeof stats.pendingReports).toBe('number');
    expect(Array.isArray(stats.recentAuditEntries)).toBe(true);
  });

  it('handles empty audit entries gracefully', async () => {
    const mockTalesSnap = { size: 0, docs: [] };
    const mockReportsSnap = { size: 0 };
    const mockAppsSnap = { size: 0 };
    const mockAuditPage = { items: [] };

    vi.mocked(await import('@fb/index.js')).getDocs.mockResolvedValueOnce(mockTalesSnap);
    vi.mocked(await import('@fb/index.js')).getDocs.mockResolvedValueOnce(mockReportsSnap);
    vi.mocked(await import('@fb/index.js')).getDocs.mockResolvedValueOnce(mockAppsSnap);
    vi.mocked(listAdminAuditLogPage).mockResolvedValue(mockAuditPage);

    const stats = await fetchOverviewStats();
    expect(stats.recentAuditEntries).toEqual([]);
  });
});
