import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getContinueReading,
  getUserPublishedTales,
  getUserDrafts,
  computeAndSyncStats,
  deleteUserAccount,
  submitTaleDeletionRequest,
  toggleFollowAuthor,
  isFollowingAuthor,
} from '../profile.service.js';

// Mock Firebase
vi.mock('@fb/index.js', () => ({
  auth: {
    currentUser: { uid: 'u1' },
  },
  refs: {
    tale: vi.fn((tid) => ({ path: `tales/${tid}` })),
    drafts: vi.fn((uid) => ({ path: `users/${uid}/drafts` })),
    draftChapters: vi.fn((uid, did) => ({ path: `users/${uid}/drafts/${did}/chapters` })),
    user: vi.fn((uid) => ({ path: `users/${uid}` })),
    readerPrefs: vi.fn((uid) => ({ path: `users/${uid}/preferences/reader` })),
    deletionRequests: vi.fn(() => ({ path: 'deletionRequests' })),
    follow: vi.fn((uid, tid) => ({ path: `users/${uid}/following/${tid}` })),
    follower: vi.fn((tid, uid) => ({ path: `users/${tid}/followers/${uid}` })),
  },
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'req-new' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteCurrentUser: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

// Mock localProgress.service.js (readStorage)
vi.mock('../reader/localProgress.service.js', () => ({
  readStorage: vi.fn(),
}));

// Mock @state/index.js
vi.mock('@state/index.js', () => ({
  createTale: vi.fn((id, data) => ({ id, ...data })),
  createDraft: vi.fn((id, data) => ({ id, ...data })),
}));

// Mock ../tale/getTales.js
vi.mock('../tale/getTales.js', () => ({
  getTalesByAuthor: vi.fn(),
}));

// Mock @/utils
vi.mock('@/utils', () => ({
  safeAsync: vi.fn((promise) => promise),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('profile.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContinueReading', () => {
    it('returns empty array if no userId', async () => {
      expect(await getContinueReading('')).toEqual([]);
    });

    it('returns empty array if no local progress', async () => {
      const { readStorage } = await import('../reader/localProgress.service.js');
      readStorage.mockReturnValue({});
      expect(await getContinueReading('u1')).toEqual([]);
    });

    it('returns continue reading list', async () => {
      const { readStorage } = await import('../reader/localProgress.service.js');
      const { getDoc } = await import('@fb/index.js');

      readStorage.mockReturnValue({
        u1: {
          t1: {
            chapters: {
              0: { updatedAt: 100, scrollPercent: 50 },
            },
          },
        },
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 't1',
        data: () => ({ title: 'Tale 1', chapterCount: 2 }),
      });

      const result = await getContinueReading('u1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('t1');
      expect(result[0].percent).toBe(25); // (50/100) / 2 * 100 = 25
      expect(result[0].lastChapterIndex).toBe(0);
    });
  });

  describe('getUserPublishedTales', () => {
    it('returns empty array if no userId', async () => {
      expect(await getUserPublishedTales('')).toEqual([]);
    });

    it('calls getTalesByAuthor', async () => {
      const { getTalesByAuthor } = await import('../tale/getTales.js');
      getTalesByAuthor.mockResolvedValueOnce([{ id: 't1' }]);

      const result = await getUserPublishedTales('u1');
      expect(result).toHaveLength(1);
      expect(getTalesByAuthor).toHaveBeenCalledWith('u1');
    });
  });

  describe('getUserDrafts', () => {
    it('returns empty array if no userId', async () => {
      expect(await getUserDrafts('')).toEqual([]);
    });

    it('returns drafts when they exist', async () => {
      const { getDocs } = await import('@fb/index.js');
      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          { id: 'd1', data: () => ({ updatedAt: { seconds: 1000 } }) },
          { id: 'd2', data: () => ({ updatedAt: { seconds: 2000 } }) },
        ],
      });

      const result = await getUserDrafts('u1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('d2'); // Sorted by updatedAt desc
    });
  });

  describe('computeAndSyncStats', () => {
    it('returns 0 if no userId', async () => {
      expect(await computeAndSyncStats('')).toBe(0);
    });

    it('computes and syncs word count', async () => {
      const { getDocs, updateDoc } = await import('@fb/index.js');

      // Mock drafts
      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'd1' }],
      });

      // Mock chapters for d1
      getDocs.mockResolvedValueOnce({
        forEach: (callback) => {
          callback({ data: () => ({ wordCount: 100 }) });
          callback({ data: () => ({ wordCount: 200 }) });
        },
      });

      const result = await computeAndSyncStats('u1');

      expect(result).toBe(300);
      expect(updateDoc).toHaveBeenCalled();
      const [, data] = updateDoc.mock.calls[0];
      expect(data.totalWordsWritten).toBe(300);
    });
  });

  describe('deleteUserAccount', () => {
    it('throws error if no userId is provided', async () => {
      await expect(deleteUserAccount('')).rejects.toThrow('User ID required');
    });

    it('throws error if auth currentUser does not match userId', async () => {
      await expect(deleteUserAccount('u-other')).rejects.toThrow('Unauthorized');
    });

    it('deletes user doc, preferences, clears auth, and preserves published tales', async () => {
      const { deleteDoc, deleteCurrentUser, refs } = await import('@fb/index.js');
      const { getTalesByAuthor } = await import('../tale/getTales.js');

      getTalesByAuthor.mockResolvedValueOnce([{ id: 'tale-1' }, { id: 'tale-2' }]);

      const result = await deleteUserAccount('u1');

      expect(result).toEqual({ success: true, preservedTalesCount: 2 });
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/u1' }));
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/u1/preferences/reader' })
      );
      expect(deleteCurrentUser).toHaveBeenCalled();
      expect(refs.user).toHaveBeenCalledWith('u1');
      expect(refs.readerPrefs).toHaveBeenCalledWith('u1');
    });
  });

  describe('submitTaleDeletionRequest', () => {
    it('throws error if required fields are missing', async () => {
      await expect(
        submitTaleDeletionRequest({ userId: '', taleId: 't1', reason: 'Too old' })
      ).rejects.toThrow('User ID, Tale ID, and reason are required');
      await expect(
        submitTaleDeletionRequest({ userId: 'u1', taleId: '', reason: 'Too old' })
      ).rejects.toThrow('User ID, Tale ID, and reason are required');
      await expect(
        submitTaleDeletionRequest({ userId: 'u1', taleId: 't1', reason: '' })
      ).rejects.toThrow('User ID, Tale ID, and reason are required');
    });

    it('submits deletion request document to archive administration', async () => {
      const { addDoc, refs } = await import('@fb/index.js');

      const result = await submitTaleDeletionRequest({
        userId: 'u1',
        taleId: 'tale-99',
        reason: 'Author desires removal from canonical weave',
      });

      expect(result).toEqual({ success: true, requestId: 'req-new' });
      expect(addDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'deletionRequests' }),
        expect.objectContaining({
          userId: 'u1',
          taleId: 'tale-99',
          reason: 'Author desires removal from canonical weave',
          status: 'pending',
          createdAt: 'mock-timestamp',
        })
      );
      expect(refs.deletionRequests).toHaveBeenCalled();
    });
  });

  describe('toggleFollowAuthor and isFollowingAuthor', () => {
    it('returns false for isFollowingAuthor if missing params', async () => {
      expect(await isFollowingAuthor({ userId: '', targetAuthorId: 'target' })).toBe(false);
      expect(await isFollowingAuthor({ userId: 'u1', targetAuthorId: '' })).toBe(false);
    });

    it('checks follow status from Firestore', async () => {
      const { getDoc } = await import('@fb/index.js');
      getDoc.mockResolvedValueOnce({ exists: () => true });

      const following = await isFollowingAuthor({ userId: 'u1', targetAuthorId: 'target-author' });
      expect(following).toBe(true);
    });

    it('toggles follow to true when not previously following', async () => {
      const { getDoc, setDoc } = await import('@fb/index.js');
      getDoc.mockResolvedValueOnce({ exists: () => false });

      const isNowFollowing = await toggleFollowAuthor({
        userId: 'u1',
        targetAuthorId: 'target-author',
      });

      expect(isNowFollowing).toBe(true);
      expect(setDoc).toHaveBeenCalledTimes(2); // followRef + followerRef
    });

    it('toggles follow to false when already following', async () => {
      const { getDoc, deleteDoc } = await import('@fb/index.js');
      getDoc.mockResolvedValueOnce({ exists: () => true });

      const isNowFollowing = await toggleFollowAuthor({
        userId: 'u1',
        targetAuthorId: 'target-author',
      });

      expect(isNowFollowing).toBe(false);
      expect(deleteDoc).toHaveBeenCalledTimes(2); // followRef + followerRef
    });
  });
});
