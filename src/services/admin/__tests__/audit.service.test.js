// src/services/admin/__tests__/audit.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listAdminAuditLogPage, writeAdminAuditLog } from '../audit.service.js';
import { addDoc, serverTimestamp, refs } from '@fb/index.js';
import { fetchAdminPage } from '../pagination.service.js';

vi.mock('@fb/index.js', () => ({
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  refs: {
    adminAuditLogs: vi.fn(() => 'adminAuditLogs'),
  },
}));

vi.mock('../pagination.service.js', () => ({
  fetchAdminPage: vi.fn(),
}));

describe('audit service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverTimestamp.mockReturnValue('SERVER_TS');
  });

  it('writes a valid staff entry with a server timestamp', async () => {
    addDoc.mockResolvedValue({ id: 'log-1' });
    const summary = `Updated setting ${'x'.repeat(1200)}`;

    const result = await writeAdminAuditLog({
      actorId: 'admin-1',
      actorRole: 'admin',
      action: 'settings.update',
      targetType: 'appConfig',
      targetId: 'site',
      summary,
    });

    expect(result).toEqual({ success: true, id: 'log-1' });
    expect(refs.adminAuditLogs).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalledWith('adminAuditLogs', {
      actorId: 'admin-1',
      actorRole: 'admin',
      action: 'settings.update',
      targetType: 'appConfig',
      targetId: 'site',
      summary: summary.slice(0, 1000),
      createdAt: 'SERVER_TS',
    });
    expect(addDoc.mock.calls[0][1].summary).toHaveLength(1000);
  });

  it.each([
    ['missing', undefined],
    ['unknown', 'author'],
    ['wrong case', 'Admin'],
  ])('refuses an audit entry with a %s actor role', async (_label, actorRole) => {
    const result = await writeAdminAuditLog({
      actorId: 'user-1',
      actorRole,
      action: 'settings.update',
      targetType: 'appConfig',
    });

    expect(result).toEqual({ success: false });
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('refuses an entry without an action or target type', async () => {
    const withoutAction = await writeAdminAuditLog({
      actorId: 'admin-1',
      actorRole: 'admin',
      action: '   ',
      targetType: 'appConfig',
    });
    const withoutTarget = await writeAdminAuditLog({
      actorId: 'admin-1',
      actorRole: 'admin',
      action: 'settings.update',
      targetType: '',
    });

    expect(withoutAction).toEqual({ success: false });
    expect(withoutTarget).toEqual({ success: false });
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('returns a non-blocking failure when the write is denied', async () => {
    addDoc.mockRejectedValue(new Error('permission-denied'));

    const result = await writeAdminAuditLog({
      actorId: 'admin-1',
      actorRole: 'admin',
      action: 'settings.update',
      targetType: 'appConfig',
    });

    expect(result).toEqual({ success: false });
  });

  it('reads one page and reports a clean result', async () => {
    const lastDoc = { id: 'cursor' };
    fetchAdminPage.mockResolvedValue({
      items: [{ id: 'log-1', action: 'settings.update' }],
      lastDoc,
      hasMore: true,
    });

    const result = await listAdminAuditLogPage({ pageSize: 10, cursor: 'cursor-in' });

    expect(fetchAdminPage).toHaveBeenCalledWith('adminAuditLogs', {
      orderField: 'createdAt',
      direction: 'desc',
      pageSize: 10,
      cursor: 'cursor-in',
    });
    expect(result).toEqual({
      items: [{ id: 'log-1', action: 'settings.update' }],
      lastDoc,
      hasMore: true,
      error: false,
    });
  });

  it('reports error: true when the audit read fails', async () => {
    fetchAdminPage.mockRejectedValue(new Error('permission-denied'));

    const result = await listAdminAuditLogPage();

    expect(result).toEqual({ items: [], lastDoc: null, hasMore: false, error: true });
  });
});
