import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getContinueReading,
  getUserPublishedTales,
  getUserDrafts,
  computeAndSyncStats,
} from '../profile.service.js';

// Mock Firebase
vi.mock('@fb/index.js', () => ({
  refs: {
    tale: vi.fn((tid) => ({ path: `tales/${tid}` })),
    drafts: vi.fn((uid) => ({ path: `users/${uid}/drafts` })),
    draftChapters: vi.fn((uid, did) => ({ path: `users/${uid}/drafts/${did}/chapters` })),
    user: vi.fn((uid) => ({ path: `users/${uid}` })),
  },
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

// Mock localProgress.service.js (readStorage)
vi.mock('../../reader/localProgress.service.js', () => ({
  readStorage: vi.fn(),
}));

// Mock @state/index.js
vi.mock('@state/index.js', () => ({
  createTale: vi.fn((id, data) => ({ id, ...data })),
  createDraft: vi.fn((id, data) => ({ id, ...data })),
}));

// Mock ../tale/getTales.js
vi.mock('../../tale/getTales.js', () => ({
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
      const { readStorage } = await import('../../reader/localProgress.service.js');
      readStorage.mockReturnValue({});
      expect(await getContinueReading('u1')).toEqual([]);
    });

    it('returns continue reading list', async () => {
      const { readStorage } = await import('../../reader/localProgress.service.js');
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
      const { getTalesByAuthor } = await import('../../tale/getTales.js');
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
      const [ref, data] = updateDoc.mock.calls[0];
      expect(data.totalWordsWritten).toBe(300);
    });
  });
});
