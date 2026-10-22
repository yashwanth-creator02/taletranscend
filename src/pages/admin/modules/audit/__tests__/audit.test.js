// src/pages/admin/modules/audit/__tests__/audit.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../audit.js';
import { listAdminAuditLogPage } from '@services/admin/audit.service.js';

vi.mock('@services/admin/audit.service.js', () => ({
  listAdminAuditLogPage: vi.fn(),
}));

function entry(overrides = {}) {
  return {
    id: 'log-1',
    actorId: 'admin-1',
    actorRole: 'admin',
    action: 'settings.update',
    targetType: 'appConfig',
    targetId: 'site',
    summary: 'Updated the site name.',
    createdAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

describe('audit module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="admin-container"></div>';
  });

  it('renders the audit table without inline handlers or window globals', async () => {
    listAdminAuditLogPage.mockResolvedValue({
      items: [
        entry(),
        entry({
          id: 'log-2',
          actorId: 'moderator-1',
          actorRole: 'moderator',
          action: 'report.resolve',
          targetType: 'report',
          targetId: 'report-1',
        }),
      ],
      lastDoc: null,
      hasMore: false,
      error: false,
    });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('settings.update');
      expect(container.textContent).toContain('report.resolve');
    });

    expect(container.textContent).toContain('admin-1');
    expect(container.textContent).toContain('moderator-1');
    expect(container.innerHTML).not.toContain('onclick=');
    expect(container.querySelector('[data-role="audit-search"]')).not.toBeNull();
    expect(window.loadMore).toBeUndefined();

    unmount();
  });

  it('renders malformed actor roles without throwing', async () => {
    listAdminAuditLogPage.mockResolvedValue({
      items: [
        entry({ id: 'log-1', actorId: '', actorRole: undefined, action: 'unknown.action' }),
        entry({ id: 'log-2', actorId: 'user-9', actorRole: 'author', action: 'author.action' }),
      ],
      lastDoc: null,
      hasMore: false,
      error: false,
    });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('unknown.action');
    });

    expect(container.textContent).toContain('Unknown actor');
    expect(container.textContent).toContain('unknown');
    expect(container.textContent).toContain('author');

    unmount();
  });

  it('uses the service error flag and retries from the error state', async () => {
    listAdminAuditLogPage
      .mockResolvedValueOnce({ items: [], lastDoc: null, hasMore: false, error: true })
      .mockResolvedValueOnce({ items: [entry()], lastDoc: null, hasMore: false, error: false });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('The audit log could not be read.');
    });

    container.querySelector('[data-action="retry"]').click();

    await vi.waitFor(() => {
      expect(container.textContent).toContain('settings.update');
    });
    expect(listAdminAuditLogPage).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('filters by action or actor and loads more with event delegation', async () => {
    listAdminAuditLogPage
      .mockResolvedValueOnce({
        items: [
          entry(),
          entry({
            id: 'log-2',
            actorId: 'moderator-1',
            actorRole: 'moderator',
            action: 'report.resolve',
            targetType: 'report',
            targetId: 'report-1',
          }),
        ],
        lastDoc: 'cursor-1',
        hasMore: true,
        error: false,
      })
      .mockResolvedValueOnce({
        items: [entry({ id: 'log-3', action: 'audit.export', actorId: 'admin-2' })],
        lastDoc: 'cursor-2',
        hasMore: false,
        error: false,
      });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-audit-entry]')).toHaveLength(2);
    });

    const search = container.querySelector('[data-role="audit-search"]');
    search.value = 'report';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(container.querySelectorAll('[data-audit-entry]')).toHaveLength(1);
    expect(container.textContent).toContain('report.resolve');
    expect(container.textContent).not.toContain('settings.update');
    expect(container.textContent).toContain('1 of 2 loaded entries');

    search.value = 'admin-1';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(container.querySelectorAll('[data-audit-entry]')).toHaveLength(1);
    expect(container.textContent).toContain('settings.update');

    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    container.querySelector('[data-action="load-more"]').click();

    await vi.waitFor(() => {
      expect(listAdminAuditLogPage).toHaveBeenCalledTimes(2);
      expect(container.textContent).toContain('audit.export');
    });
    expect(listAdminAuditLogPage.mock.calls[1][0]).toMatchObject({
      pageSize: 25,
      cursor: 'cursor-1',
    });

    unmount();
  });

  it('stops listening after unmount', async () => {
    listAdminAuditLogPage.mockResolvedValue({
      items: [entry()],
      lastDoc: 'cursor-1',
      hasMore: true,
      error: false,
    });

    const container = document.getElementById('admin-container');
    const unmount = mount({ container, access: { role: 'admin', isAdmin: true } });

    await vi.waitFor(() => {
      expect(container.textContent).toContain('settings.update');
    });

    unmount();
    container.querySelector('[data-action="load-more"]').click();
    await Promise.resolve();

    expect(listAdminAuditLogPage).toHaveBeenCalledTimes(1);
  });
});
