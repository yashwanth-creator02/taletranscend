import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isCurrentUserAdmin,
  getTaleDeletionRequests,
  approveTaleDeletionRequest,
  rejectTaleDeletionRequest,
  adminDeleteTale,
} from '../admin.service.js';

vi.mock('@fb/index.js', () => ({
  auth: {
    currentUser: { uid: 'admin-123' },
  },
  refs: {
    user: vi.fn((uid) => `users/${uid}`),
    tale: vi.fn((tid) => `tales/${tid}`),
    deletionRequests: vi.fn(() => 'deletionRequests'),
    deletionRequest: vi.fn((id) => `deletionRequests/${id}`),
    notifications: vi.fn((uid) => `users/${uid}/notifications`),
  },
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'notif-1' })),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((field, op, val) => ({ type: 'where', field, op, val })),
  orderBy: vi.fn((field, dir) => ({ type: 'orderBy', field, dir })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('../notification.service.js', () => ({
  createNotificationForUser: vi.fn(() => Promise.resolve('notif-1')),
}));

vi.mock('@/utils', () => ({
  safeAsync: vi.fn(async (p, opts) => {
    try {
      return await p;
    } catch (err) {
      if (opts?.fallback !== undefined) return opts.fallback;
      throw err;
    }
  }),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCurrentUserAdmin', () => {
    it('returns false when no user is provided and no auth user', async () => {
      const result = await isCurrentUserAdmin(null);
      expect(result).toBe(false);
    });

    it('returns true when user has admin token claim', async () => {
      const mockUser = {
        uid: 'admin-uid',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { admin: true },
        }),
      };
      const result = await isCurrentUserAdmin(mockUser);
      expect(result).toBe(true);
    });

    it('returns true when user has moderator token claim', async () => {
      const mockUser = {
        uid: 'mod-uid',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { moderator: true },
        }),
      };
      const result = await isCurrentUserAdmin(mockUser);
      expect(result).toBe(true);
    });

    it('returns true when Firestore user doc has role admin', async () => {
      const { getDoc } = await import('@fb/index.js');
      const mockUser = {
        uid: 'user-uid',
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
      };
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'admin' }),
      });

      const result = await isCurrentUserAdmin(mockUser);
      expect(result).toBe(true);
    });

    it('returns false when neither claim nor Firestore role is admin', async () => {
      const { getDoc } = await import('@fb/index.js');
      const mockUser = {
        uid: 'user-uid',
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
      };
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'reader' }),
      });

      const result = await isCurrentUserAdmin(mockUser);
      expect(result).toBe(false);
    });
  });

  describe('getTaleDeletionRequests', () => {
    it('fetches pending deletion requests by default', async () => {
      const { getDocs, query, where, orderBy, refs } = await import('@fb/index.js');
      getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'req-1',
            data: () => ({
              taleId: 'tale-123',
              status: 'pending',
              reason: 'Author wishes removal',
            }),
          },
        ],
      });

      const requests = await getTaleDeletionRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe('req-1');
      expect(requests[0].taleId).toBe('tale-123');
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('status', '==', 'pending');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(refs.deletionRequests).toHaveBeenCalled();
    });

    it('fetches all deletion requests when statusFilter is all', async () => {
      const { getDocs, query, orderBy, refs } = await import('@fb/index.js');
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: 'req-1', data: () => ({ taleId: 'tale-1', status: 'approved' }) },
          { id: 'req-2', data: () => ({ taleId: 'tale-2', status: 'rejected' }) },
        ],
      });

      const requests = await getTaleDeletionRequests('all');
      expect(requests).toHaveLength(2);
      expect(query).toHaveBeenCalled();
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(refs.deletionRequests).toHaveBeenCalled();
    });
  });

  describe('approveTaleDeletionRequest', () => {
    it('throws error when requestId or taleId is missing', async () => {
      await expect(approveTaleDeletionRequest({ requestId: '', taleId: 'tale-1' })).rejects.toThrow(
        'Request ID and Tale ID are required'
      );
      await expect(approveTaleDeletionRequest({ requestId: 'req-1', taleId: '' })).rejects.toThrow(
        'Request ID and Tale ID are required'
      );
    });

    it('deletes the tale doc, updates request to approved, and notifies author', async () => {
      const { deleteDoc, updateDoc, refs } = await import('@fb/index.js');
      const { createNotificationForUser } = await import('../notification.service.js');

      const result = await approveTaleDeletionRequest({
        requestId: 'req-1',
        taleId: 'tale-abc',
        adminUid: 'admin-999',
        adminNotes: 'Verified author request',
        userId: 'author-123',
      });

      expect(result).toEqual({ success: true });
      expect(deleteDoc).toHaveBeenCalledWith('tales/tale-abc');
      expect(updateDoc).toHaveBeenCalledWith('deletionRequests/req-1', {
        status: 'approved',
        reviewedBy: 'admin-999',
        reviewedAt: 'mock-timestamp',
        adminNotes: 'Verified author request',
      });
      expect(createNotificationForUser).toHaveBeenCalledWith(
        'author-123',
        expect.objectContaining({
          title: 'Chronicle Removal Approved',
        })
      );
      expect(refs.tale).toHaveBeenCalledWith('tale-abc');
      expect(refs.deletionRequest).toHaveBeenCalledWith('req-1');
    });
  });

  describe('rejectTaleDeletionRequest', () => {
    it('throws error when requestId is missing', async () => {
      await expect(rejectTaleDeletionRequest({ requestId: '' })).rejects.toThrow(
        'Request ID is required'
      );
    });

    it('updates request to rejected, retains chronicle, and notifies author', async () => {
      const { deleteDoc, updateDoc, refs } = await import('@fb/index.js');
      const { createNotificationForUser } = await import('../notification.service.js');

      const result = await rejectTaleDeletionRequest({
        requestId: 'req-2',
        adminUid: 'admin-999',
        reason: 'Cultural significance preservation',
        userId: 'author-456',
        taleId: 'tale-def',
      });

      expect(result).toEqual({ success: true });
      expect(deleteDoc).not.toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith('deletionRequests/req-2', {
        status: 'rejected',
        reviewedBy: 'admin-999',
        reviewedAt: 'mock-timestamp',
        rejectionReason: 'Cultural significance preservation',
      });
      expect(createNotificationForUser).toHaveBeenCalledWith(
        'author-456',
        expect.objectContaining({
          title: 'Chronicle Retention Notice',
        })
      );
      expect(refs.deletionRequest).toHaveBeenCalledWith('req-2');
    });
  });

  describe('adminDeleteTale', () => {
    it('throws error if taleId is missing', async () => {
      await expect(adminDeleteTale({ taleId: '' })).rejects.toThrow('Tale ID is required');
    });

    it('deletes the tale doc directly by admin decree', async () => {
      const { deleteDoc, refs } = await import('@fb/index.js');
      const result = await adminDeleteTale({
        taleId: 'tale-illegal',
        adminUid: 'admin-999',
        reason: 'DMCA compliance',
      });

      expect(result).toEqual({ success: true });
      expect(deleteDoc).toHaveBeenCalledWith('tales/tale-illegal');
      expect(refs.tale).toHaveBeenCalledWith('tale-illegal');
    });
  });
});
