import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTaleProgressData } from '../progress.utils.service.js';
import { getDocs, refs } from '@fb/index.js';

vi.mock('@fb/index.js', () => ({
  getDocs: vi.fn(),
  refs: {
    progressChapters: vi.fn(),
  },
}));

vi.mock('@/utils', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('progress.utils.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTaleProgressData', () => {
    it('should fetch and format chapter progress data', async () => {
      const mockDocs = [
        { id: '0', data: () => ({ scrollPercent: 0.5 }) },
        { id: '1', data: () => ({ scrollPercent: 0.8 }) },
        { id: '2', data: () => ({}) }, // Missing scrollPercent should default to 0
      ];
      const mockSnap = {
        docs: mockDocs,
        forEach: (cb) => mockDocs.forEach(cb),
      };

      getDocs.mockResolvedValue(mockSnap);
      refs.progressChapters.mockReturnValue('mock-ref');

      const result = await getTaleProgressData('user-1', 'tale-1');

      expect(refs.progressChapters).toHaveBeenCalledWith('user-1', 'tale-1');
      expect(getDocs).toHaveBeenCalledWith('mock-ref');
      expect(result).toEqual({
        0: 0.5,
        1: 0.8,
        2: 0,
      });
    });

    it('should return empty object and log error on failure', async () => {
      getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await getTaleProgressData('user-1', 'tale-1');

      expect(result).toEqual({});
    });
  });
});
