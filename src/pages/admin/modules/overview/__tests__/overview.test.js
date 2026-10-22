// src/pages/admin/modules/overview/__tests__/overview.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../overview.js';
import { fetchOverviewStats } from '@services/admin/overview.service.js';

vi.mock('@services/admin/overview.service.js', () => ({
  fetchOverviewStats: vi.fn(),
}));

function stats(overrides = {}) {
  return {
    totalTales: 33,
    totalUsers: 3,
    pendingReports: 2,
    pendingApplications: 1,
    pendingDeletions: 4,
    recentAuditEntries: [
      {
        id: 'log-1',
        actorId: 'admin-1',
        actorRole: 'admin',
        action: 'report.resolve',
        targetType: 'report',
        targetId: 'report-1',
        createdAt: '2026-10-01T10:00:00Z',
      },
    ],
    auditUnavailable: false,
    ...overrides,
  };
}

describe('overview module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="admin-container"></div>';
  });

  it('renders live counters and the administrator audit strip', async () => {
    fetchOverviewStats.mockResolvedValue(stats());
    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('33');
      expect(container.textContent).toContain('report.resolve');
    });

    expect(fetchOverviewStats).toHaveBeenCalledWith({ includeAudit: true });
    expect(container.textContent).toContain('Registered Users');
    expect(container.textContent).toContain('Pending Deletions');
    expect(container.textContent).toContain('Recent Staff Activity');
    expect(container.innerHTML).not.toContain('onclick=');

    unmount();
  });

  it('skips the audit read for moderators and shows a read-only note', async () => {
    fetchOverviewStats.mockResolvedValue(stats({ recentAuditEntries: [] }));
    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'moderator', isAdmin: false } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Archive Overview');
    });

    expect(fetchOverviewStats).toHaveBeenCalledWith({ includeAudit: false });
    expect(container.textContent).toContain('visible to administrators only');
    expect(container.textContent).not.toContain('report.resolve');

    unmount();
  });

  it('renders an explicit unavailable state and retries', async () => {
    fetchOverviewStats
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(stats());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Overview unavailable');
    });
    expect(container.textContent).toContain('No numbers are estimated');

    container.querySelector('[data-action="retry"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Archive Overview');
    });

    unmount();
    vi.restoreAllMocks();
  });
});
