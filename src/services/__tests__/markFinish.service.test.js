import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markTaleFinished } from '../markFinish.service.js';
import { getDoc, getDocs, writeBatch, refs, serverTimestamp } from '@fb/index.js';
import { markAllChaptersRead } from '@services/reader/localProgress.service.js';
import { cacheService } from '@services/cache.service.js';

// Mock @/utils
vi.mock('@/utils', async () => {
  const actual = await vi.importActual('@/utils');
  return {
    ...actual,
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    }),
  };
});

// Mock localProgress
vi.mock('@services/reader/localProgress.service.js', () => ({
  markAllChaptersRead: vi.fn(),
}));

// Mock cacheService
vi.mock('@services/cache.service.js', () => ({
  cacheService: {
    invalidateProgress: vi.fn(),
    invalidateTale: vi.fn(),
    invalidateTales: vi.fn(),
  },
}));

describe('MarkFinishService', () => {
  let mockBatch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch = {
      set: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    writeBatch.mockReturnValue(mockBatch);
    serverTimestamp.mockReturnValue('mock-timestamp');
  });

  describe('markTaleFinished', () => {
    it('should return early if missing required params', async () => {
      await markTaleFinished({ userId: 'u1' });
      expect(getDoc).not.toHaveBeenCalled();
    });

    it('should mark tale and all its chapters as finished in Firestore and local storage', async () => {
      // Mock tale metadata with 2 chapters
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ title: 'Tale Title', coverUrl: 'cover.jpg', chapterCount: 2 }),
      });

      // Mock existing progress chapters query
      getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      await markTaleFinished({ userId: 'u1', taleId: 't1' });

      expect(refs.progress).toHaveBeenCalledWith('u1', 't1');
      expect(refs.tale).toHaveBeenCalledWith('t1');

      // Should batch set chapter 0 and chapter 1 to 100%
      expect(refs.progressChapter).toHaveBeenCalledWith('u1', 't1', 0);
      expect(refs.progressChapter).toHaveBeenCalledWith('u1', 't1', 1);

      // Total batch.set calls: 2 chapters + 1 progress doc = 3
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();

      // Tale-level progress doc set to finished
      expect(mockBatch.set).toHaveBeenCalledWith(
        refs.progress('u1', 't1'),
        expect.objectContaining({
          status: 'finished',
          finishedAt: 'mock-timestamp',
          lastReadAt: 'mock-timestamp',
          taleTitle: 'Tale Title',
          coverUrl: 'cover.jpg',
          chapterCount: 2,
        }),
        { merge: true }
      );

      // Local storage and cache updated
      expect(markAllChaptersRead).toHaveBeenCalledWith({
        userId: 'u1',
        taleId: 't1',
        chapterCount: 2,
      });
      expect(cacheService.invalidateProgress).toHaveBeenCalledWith('u1', 't1');
      expect(cacheService.invalidateTale).toHaveBeenCalledWith('t1');
      expect(cacheService.invalidateTales).toHaveBeenCalled();
    });

    it('should proceed and default chapterCount to 1 if tale metadata fetch fails', async () => {
      getDoc.mockRejectedValueOnce(new Error('Metadata fail'));
      getDocs
        .mockResolvedValueOnce({ empty: true, docs: [] }) // progressChapters
        .mockResolvedValueOnce({ empty: true, docs: [] }); // chapters fallback

      await markTaleFinished({ userId: 'u1', taleId: 't1' });

      expect(mockBatch.set).toHaveBeenCalledTimes(2); // 1 chapter (index 0) + 1 progress doc
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(markAllChaptersRead).toHaveBeenCalledWith({
        userId: 'u1',
        taleId: 't1',
        chapterCount: 1,
      });
    });

    it('should include any pre-existing chapter documents beyond chapterCount', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ title: 'Tale Title', coverUrl: 'cover.jpg', chapterCount: 1 }),
      });

      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: '0' }, { id: '1' }],
        forEach(cb) {
          this.docs.forEach(cb);
        },
      });

      await markTaleFinished({ userId: 'u1', taleId: 't1' });

      // Chapter 0 (from loop) and Chapter 1 (from existing docs)
      expect(refs.progressChapter).toHaveBeenCalledWith('u1', 't1', 0);
      expect(refs.progressChapter).toHaveBeenCalledWith('u1', 't1', '1');
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
