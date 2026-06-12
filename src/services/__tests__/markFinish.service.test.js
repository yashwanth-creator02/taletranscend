import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markTaleFinished } from '../markFinish.service.js';
import {
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  writeBatch,
  refs,
  db,
  serverTimestamp,
} from '@fb/index.js';

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

describe('MarkFinishService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('markTaleFinished', () => {
    it('should return early if missing required params', async () => {
      await markTaleFinished({ userId: 'u1' });
      expect(getDoc).not.toHaveBeenCalled();
    });

    it("should mark tale as finished, creating progress doc if it doesn't exist", async () => {
      // Setup mocks
      getDoc
        .mockResolvedValueOnce({ exists: () => false }) // progressSnap
        .mockResolvedValueOnce({
          // taleSnap
          exists: () => true,
          data: () => ({ title: 'Tale Title', coverUrl: 'cover.jpg' }),
        });

      getDocs.mockResolvedValue({
        empty: false,
        docs: [
          { ref: 'chapterRef1', data: () => ({}) },
          { ref: 'chapterRef2', data: () => ({}) },
        ],
        forEach(cb) {
          this.docs.forEach(cb);
        },
      });

      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      writeBatch.mockReturnValue(mockBatch);
      serverTimestamp.mockReturnValue('mock-timestamp');

      await markTaleFinished({ userId: 'u1', taleId: 't1' });

      expect(refs.progress).toHaveBeenCalledWith('u1', 't1');
      expect(refs.tale).toHaveBeenCalledWith('t1');

      // Should create progress doc
      expect(setDoc).toHaveBeenCalledWith(expect.anything(), {
        status: 'finished',
        finishedAt: 'mock-timestamp',
        lastReadAt: 'mock-timestamp',
        totalReadTimeMs: 0,
        taleTitle: 'Tale Title',
        coverUrl: 'cover.jpg',
        createdAt: 'mock-timestamp',
        updatedAt: 'mock-timestamp',
      });

      // Should update chapters in batch
      expect(getDocs).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();

      // Should update tale status to finished
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
        status: 'finished',
        finishedAt: 'mock-timestamp',
        lastReadAt: 'mock-timestamp',
        taleTitle: 'Tale Title',
        coverUrl: 'cover.jpg',
        updatedAt: 'mock-timestamp',
      });
    });

    it('should proceed if tale metadata fetch fails', async () => {
      getDoc
        .mockResolvedValueOnce({ exists: () => true, data: () => ({}) }) // progressSnap
        .mockRejectedValueOnce(new Error('Metadata fail')); // taleSnap

      getDocs.mockResolvedValue({ empty: true });

      await markTaleFinished({ userId: 'u1', taleId: 't1' });

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          taleTitle: '',
          coverUrl: '',
        })
      );
    });

    it('should not update chapters if none found', async () => {
      getDoc
        .mockResolvedValueOnce({ exists: () => true, data: () => ({}) })
        .mockResolvedValueOnce({ exists: () => false });

      getDocs.mockResolvedValue({ empty: true });

      await markTaleFinished({ userId: 'u1', taleId: 't1' });

      expect(writeBatch).not.toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();
    });
  });
});
