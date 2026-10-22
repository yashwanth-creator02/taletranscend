// src/services/admin/__tests__/mycontent.service.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as myContentService from '../mycontent.service.js';
import {
  DELETION_REASON_MAX,
  DELETION_REASON_MIN,
  getAuthorTalesPage,
  getAuthorDeletionRequestsPage,
  requestTaleDeletion,
} from '../mycontent.service.js';
import { fetchAdminPage } from '../pagination.service.js';
import { addDoc, auth, serverTimestamp } from '@fb/index.js';

vi.mock('../pagination.service.js', () => ({
  ADMIN_PAGE_SIZE: 20,
  fetchAdminPage: vi.fn(),
}));

vi.mock('@fb/index.js', () => ({
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  auth: { currentUser: null },
}));

vi.mock('@fb/refs.js', () => ({
  refs: {
    tales: vi.fn(() => 'tales'),
    deletionRequests: vi.fn(() => 'deletionRequests'),
  },
}));

describe('mycontent service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.currentUser = null;
    serverTimestamp.mockReturnValue('SERVER_TS');
  });

  it('returns empty results when no user is signed in', async () => {
    await expect(getAuthorTalesPage()).resolves.toEqual({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
    await expect(getAuthorDeletionRequestsPage()).resolves.toEqual({
      items: [],
      lastDoc: null,
      hasMore: false,
    });
    expect(fetchAdminPage).not.toHaveBeenCalled();
  });

  it('reads only the signed-in author tales with cursor pagination', async () => {
    auth.currentUser = { uid: 'user-1' };
    const page = { items: [{ id: 'tale-1', title: 'My Tale' }], lastDoc: null, hasMore: false };
    fetchAdminPage.mockResolvedValue(page);

    await expect(getAuthorTalesPage('cursor-1')).resolves.toEqual(page);
    expect(fetchAdminPage).toHaveBeenCalledWith('tales', {
      conditions: [['authorId', '==', 'user-1']],
      orderField: 'publishedAt',
      direction: 'desc',
      pageSize: 20,
      cursor: 'cursor-1',
    });
  });

  it('reads only the signed-in author deletion requests with cursor pagination', async () => {
    auth.currentUser = { uid: 'user-1' };
    const page = {
      items: [{ id: 'req-1', taleId: 'tale-1', status: 'pending' }],
      lastDoc: null,
      hasMore: false,
    };
    fetchAdminPage.mockResolvedValue(page);

    await expect(getAuthorDeletionRequestsPage('cursor-2')).resolves.toEqual(page);
    expect(fetchAdminPage).toHaveBeenCalledWith('deletionRequests', {
      conditions: [['userId', '==', 'user-1']],
      orderField: 'createdAt',
      direction: 'desc',
      pageSize: 20,
      cursor: 'cursor-2',
    });
  });

  it('creates a deletion request with a server timestamp and no staff audit write', async () => {
    auth.currentUser = { uid: 'user-1' };
    addDoc.mockResolvedValue({ id: 'req-new' });

    const requestId = await requestTaleDeletion('tale-1', '  This tale is outdated.  ');

    expect(requestId).toBe('req-new');
    expect(serverTimestamp).toHaveBeenCalled();
    expect(addDoc).toHaveBeenCalledWith('deletionRequests', {
      userId: 'user-1',
      taleId: 'tale-1',
      reason: 'This tale is outdated.',
      status: 'pending',
      createdAt: 'SERVER_TS',
    });
    expect(myContentService.getAuthorReports).toBeUndefined();
  });

  it('rejects a reason outside the 5-2000 character rules bound', async () => {
    auth.currentUser = { uid: 'user-1' };

    await expect(
      requestTaleDeletion('tale-1', 'x'.repeat(DELETION_REASON_MIN - 1))
    ).rejects.toThrow(/between 5 and 2000/i);
    await expect(
      requestTaleDeletion('tale-1', 'x'.repeat(DELETION_REASON_MAX + 1))
    ).rejects.toThrow(/between 5 and 2000/i);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('rejects a deletion request while signed out', async () => {
    await expect(requestTaleDeletion('tale-1', 'A valid reason.')).rejects.toThrow(/sign in/i);
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('rejects a deletion request without a tale id', async () => {
    auth.currentUser = { uid: 'user-1' };

    await expect(requestTaleDeletion('', 'A valid reason.')).rejects.toThrow(/tale id/i);
    expect(addDoc).not.toHaveBeenCalled();
  });
});
