import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  syncChapterProgressToCloud,
  getCloudProgress,
  scheduleProgressSync,
} from '../cloudProgress.service.js';
import { getDoc, setDoc, getDocs, refs, serverTimestamp } from '@fb/index.js';
import { createChapterProgress, createTaleProgress } from '@state/index.js';

// Mock @state/index.js
vi.mock('@state/index.js', () => ({
  createChapterProgress: vi.fn((data) => ({ ...data, normalized: true })),
  createTaleProgress: vi.fn((id, data) => ({ id, ...data, normalized: true })),
}));

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
    // safeCall is used, we can keep it or mock it.
    // Let's keep it to test the actual behavior unless it's problematic.
  };
});

describe('CloudProgressService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default online
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  describe('syncChapterProgressToCloud', () => {
    it('should return early if missing required params', async () => {
      await syncChapterProgressToCloud({ userId: 'u1' });
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should return early if offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      await syncChapterProgressToCloud({
        userId: 'u1',
        taleId: 't1',
        chapterIndex: 0,
        scrollPercent: 50,
      });
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should sync progress to cloud when online', async () => {
      setDoc.mockResolvedValue(undefined);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await syncChapterProgressToCloud({
        userId: 'u1',
        taleId: 't1',
        chapterIndex: 0,
        scrollPercent: 50,
        lastCharacterOffset: 100,
        totalReadTimeMs: 5000,
      });

      expect(refs.progressChapter).toHaveBeenCalledWith('u1', 't1', 0);
      expect(refs.progress).toHaveBeenCalledWith('u1', 't1');
      expect(setDoc).toHaveBeenCalledTimes(2);
      expect(setDoc).toHaveBeenCalledWith(
        'users/u1/readerProgress/t1/chapters/0',
        {
          scrollPercent: 50,
          lastCharacterOffset: 100,
          updatedAt: 'mock-timestamp',
        },
        { merge: true }
      );
      expect(setDoc).toHaveBeenCalledWith(
        'users/u1/readerProgress/t1',
        {
          lastReadAt: 'mock-timestamp',
          totalReadTimeMs: 5000,
        },
        { merge: true }
      );
    });

    it('should handle sync failure silently', async () => {
      setDoc.mockRejectedValue(new Error('Firestore error'));

      // Should not throw
      await expect(
        syncChapterProgressToCloud({
          userId: 'u1',
          taleId: 't1',
          chapterIndex: 0,
          scrollPercent: 50,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('getCloudProgress', () => {
    it('should return null if missing params', async () => {
      expect(await getCloudProgress({ userId: 'u1' })).toBeNull();
    });

    it('should return null if no cloud progress exists', async () => {
      getDoc.mockResolvedValue({ exists: () => false });

      const result = await getCloudProgress({ userId: 'u1', taleId: 't1' });
      expect(result).toBeNull();
    });

    it('should retrieve and normalize cloud progress', async () => {
      const mockTaleData = { lastReadAt: 'ts' };
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockTaleData,
      });

      const mockChaptersSnap = {
        docs: [
          { id: '0', data: () => ({ scrollPercent: 10 }) },
          { id: '1', data: () => ({ scrollPercent: 20 }) },
        ],
        forEach(cb) {
          this.docs.forEach(cb);
        },
      };
      getDocs.mockResolvedValue(mockChaptersSnap);

      const result = await getCloudProgress({ userId: 'u1', taleId: 't1' });

      expect(refs.progress).toHaveBeenCalledWith('u1', 't1');
      expect(getDocs).toHaveBeenCalled();
      expect(createChapterProgress).toHaveBeenCalledTimes(2);
      expect(createTaleProgress).toHaveBeenCalledWith('t1', {
        ...mockTaleData,
        chapters: {
          0: { scrollPercent: 10, normalized: true },
          1: { scrollPercent: 20, normalized: true },
        },
      });
      expect(result).toEqual({
        id: 't1',
        lastReadAt: 'ts',
        chapters: {
          0: { scrollPercent: 10, normalized: true },
          1: { scrollPercent: 20, normalized: true },
        },
        normalized: true,
      });
    });

    it('should handle retrieval failure silently', async () => {
      getDoc.mockRejectedValue(new Error('Firestore error'));
      const result = await getCloudProgress({ userId: 'u1', taleId: 't1' });
      expect(result).toBeNull();
    });
  });

  describe('scheduleProgressSync', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should schedule a debounced sync', async () => {
      const payload = {
        userId: 'u1',
        taleId: 't1',
        chapterIndex: 0,
        scrollPercent: 50,
      };

      scheduleProgressSync(payload);

      // Should not have called sync yet
      expect(setDoc).not.toHaveBeenCalled();

      vi.runAllTimers();

      // Wait for the async syncChapterProgressToCloud to complete
      await Promise.resolve();
      await Promise.resolve();

      expect(setDoc).toHaveBeenCalled();
    });

    it('should debounce multiple calls', async () => {
      const payload = {
        userId: 'u1',
        taleId: 't1',
        chapterIndex: 0,
        scrollPercent: 50,
      };

      scheduleProgressSync(payload);
      scheduleProgressSync(payload);
      scheduleProgressSync(payload);

      vi.runAllTimers();

      await Promise.resolve();
      await Promise.resolve();

      // Should only call sync once for the last payload
      expect(setDoc).toHaveBeenCalledTimes(2); // One for chapter, one for tale
    });

    it('should return early if missing params', () => {
      scheduleProgressSync({ userId: 'u1' });
      vi.runAllTimers();
      expect(setDoc).not.toHaveBeenCalled();
    });
  });
});
