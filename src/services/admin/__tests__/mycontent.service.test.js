// src/services/admin/__tests__/mycontent.service.test.js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getAuthorTalesPage,
  getAuthorDeletionRequestsPage,
  getAuthorReports,
  requestTaleDeletion,
} from '../mycontent.service.js';
import { fetchAdminPage } from '../pagination.service.js';
import { writeAdminAuditLog } from '../audit.service.js';

vi.mock('../pagination.service.js', () => ({
  fetchAdminPage: vi.fn(),
}));

vi.mock('../audit.service.js', () => ({
  writeAdminAuditLog: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@fb/index.js', () => ({
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  auth: { currentUser: null },
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    tales: vi.fn(),
    deletionRequests: vi.fn(),
    reports: vi.fn(),
  },
}));

describe('mycontent service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty result when no user is signed in for tales page', async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = null;

    const result = await getAuthorTalesPage();
    expect(result).toEqual({ items: [], lastDoc: null, hasMore: false });
  });

  it('returns author tales page when signed in', async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = { uid: 'user-1' };

    vi.mocked(fetchAdminPage).mockResolvedValue({
      items: [{ id: 'tale-1', title: 'My Tale' }],
      lastDoc: null,
      hasMore: false,
    });

    const result = await getAuthorTalesPage();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('My Tale');
  });

  it('returns empty result when no user is signed in for deletion requests page', async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = null;

    const result = await getAuthorDeletionRequestsPage();
    expect(result).toEqual({ items: [], lastDoc: null, hasMore: false });
  });

  it('returns author deletion requests page when signed in', async () => {
    const { auth } = await import('@fb/index.js');
    auth.currentUser = { uid: 'user-1' };

    vi.mocked(fetchAdminPage).mockResolvedValue({
      items: [{ id: 'req-1', taleId: 'tale-1' }],
      lastDoc: null,
      hasMore: false,
    });

    const result = await getAuthorDeletionRequestsPage();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].taleId).toBe('tale-1');
  });

  it('returns author reports when signed in', async () => {
    const { auth, getDocs } = await import('@fb/index.js');
    auth.currentUser = { uid: 'user-1' };

    // First call: tales query
    // Second call: reports query
    getDocs
      .mockResolvedValueOnce({
        docs: [{ id: 'tale-1', data: () => ({ title: 'Tale 1' }) }],
      })
      .mockResolvedValueOnce({
        docs: [{ id: 'rep-1', data: () => ({ targetId: 'tale-1', reason: 'Spam' }) }],
      });

    const reports = await getAuthorReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe('rep-1');
    expect(reports[0].reason).toBe('Spam');
  });

  it('requests tale deletion and writes audit log', async () => {
    const { auth, addDoc } = await import('@fb/index.js');
    auth.currentUser = { uid: 'user-1' };
    addDoc.mockResolvedValue({ id: 'req-new' });

    const reqId = await requestTaleDeletion('tale-1', 'Please delete');
    expect(reqId).toBe('req-new');
    expect(writeAdminAuditLog).toHaveBeenCalled();
    expect(writeAdminAuditLog.mock.calls[0][0]).toMatchObject({
      action: 'deletion.requested',
      targetType: 'deletionRequest',
      targetId: 'req-new',
    });
  });
});
