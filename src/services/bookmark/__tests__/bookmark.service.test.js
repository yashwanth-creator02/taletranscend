import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addToBookmarks,
  removeFromBookmarks,
  getBookmarks,
  isBookmarked,
} from '../../bookmark/bookmark.service.js';

// Mock Firebase
vi.mock('@fb/index.js', () => ({
  refs: {
    bookmark: vi.fn((uid, tid) => ({ path: `users/${uid}/bookmarks/${tid}` })),
    bookmarks: vi.fn((uid) => ({ path: `users/${uid}/bookmarks` })),
  },
  setDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ empty: true, docs: [] })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

// Mock @state/index.js
vi.mock('@state/index.js', () => ({
  createBookmark: vi.fn((userId, taleId, data) => ({ userId, taleId, ...data })),
}));

// Mock @/utils
vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    safeAsync: vi.fn((promise) => promise),
    guardOffline: vi.fn(() => false),
    checkRateLimit: vi.fn(() => true),
    saveBookmarkOffline: vi.fn(() => Promise.resolve()),
    removeBookmarkOffline: vi.fn(() => Promise.resolve()),
    syncBookmarksOffline: vi.fn(() => Promise.resolve()),
    getBookmarksOffline: vi.fn(() => Promise.resolve([])),
  };
});

describe('bookmark.service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { checkRateLimit } = await import('@/utils');
    vi.mocked(checkRateLimit).mockReturnValue(true);
  });

  describe('addToBookmarks', () => {
    it('calls setDoc with correct data', async () => {
      const { setDoc } = await import('@fb/index.js');
      const mockTale = {
        title: 'Mythic Quest',
        coverUrl: 'http://img.jpg',
        authorName: 'Scribe',
        chapterCount: 12,
        era: 'Mythic',
      };

      await addToBookmarks({
        userId: 'user-123',
        taleId: 'tale-456',
        tale: mockTale,
      });

      expect(setDoc).toHaveBeenCalledTimes(1);
      const [ref, data] = setDoc.mock.calls[0];
      expect(ref.path).toBe('users/user-123/bookmarks/tale-456');
      expect(data.taleId).toBe('tale-456');
      expect(data.taleTitle).toBe('Mythic Quest');
      expect(data.coverUrl).toBe('http://img.jpg');
      expect(data.authorName).toBe('Scribe');
      expect(data.chapterCount).toBe(12);
      expect(data.era).toBe('Mythic');
      expect(data.bookmarkedAt).toBeDefined();
    });

    it('returns null if userId or taleId is missing', async () => {
      const { setDoc } = await import('@fb/index.js');
      await addToBookmarks({ userId: '', taleId: 'tale-456' });
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('blocks adding bookmark if rate-limited', async () => {
      const { checkRateLimit } = await import('@/utils');
      const { setDoc } = await import('@fb/index.js');
      vi.mocked(checkRateLimit).mockReturnValue(false);

      await addToBookmarks({ userId: 'u1', taleId: 't1' });

      expect(setDoc).not.toHaveBeenCalled();
    });
  });

  describe('removeFromBookmarks', () => {
    it('calls deleteDoc', async () => {
      const { deleteDoc } = await import('@fb/index.js');
      const { removeBookmarkOffline } = await import('@/utils');

      await removeFromBookmarks({ userId: 'user-123', taleId: 'tale-456' });

      expect(removeBookmarkOffline).toHaveBeenCalledWith('tale-456');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('getBookmarks', () => {
    it('returns empty array if no userId', async () => {
      const result = await getBookmarks({ userId: '' });
      expect(result).toEqual([]);
    });

    it('returns bookmarks when they exist', async () => {
      const { getDocs } = await import('@fb/index.js');
      const mockDocs = [
        { id: 'b1', data: () => ({ taleId: 't1', taleTitle: 'Tale 1' }) },
        { id: 'b2', data: () => ({ taleId: 't2', taleTitle: 'Tale 2' }) },
      ];
      getDocs.mockResolvedValueOnce({ empty: false, docs: mockDocs });

      const result = await getBookmarks({ userId: 'user-123' });

      expect(result).toHaveLength(2);
      expect(result[0].taleTitle).toBe('Tale 1');
      expect(getDocs).toHaveBeenCalled();
    });

    it('returns empty array when no bookmarks found', async () => {
      const { getDocs } = await import('@fb/index.js');
      getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

      const result = await getBookmarks({ userId: 'user-123' });

      expect(result).toEqual([]);
    });
  });

  describe('isBookmarked', () => {
    it('returns false if missing params', async () => {
      expect(await isBookmarked({ userId: '', taleId: 't1' })).toBe(false);
      expect(await isBookmarked({ userId: 'u1', taleId: '' })).toBe(false);
    });

    it('returns true if document exists', async () => {
      const { getDoc } = await import('@fb/index.js');
      getDoc.mockResolvedValueOnce({ exists: () => true });

      const result = await isBookmarked({ userId: 'u1', taleId: 't1' });
      expect(result).toBe(true);
    });

    it('returns false if document does not exist', async () => {
      const { getDoc } = await import('@fb/index.js');
      getDoc.mockResolvedValueOnce({ exists: () => false });

      const result = await isBookmarked({ userId: 'u1', taleId: 't1' });
      expect(result).toBe(false);
    });
  });
});
