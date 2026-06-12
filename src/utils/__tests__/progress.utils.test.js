// src/utils/__tests__/progress.utils.test.js
import { describe, it, expect } from 'vitest';
import { getOverallProgress } from '../progress.utils.ts';

describe('Progress Utils', () => {
  describe('getOverallProgress', () => {
    it('calculates progress from flat map', () => {
      const result = getOverallProgress({
        chapterCount: 4,
        chaptersProgress: {
          0: 100,
          1: 100,
          2: 50,
          3: 0,
        },
      });
      // (1 + 1 + 0.5 + 0) / 4 = 2.5 / 4 = 0.625 -> 63%
      expect(result.percent).toBe(63);
      expect(result.totalChapters).toBe(4);
    });

    it('calculates progress from nested object map', () => {
      const result = getOverallProgress({
        chapterCount: 2,
        chaptersProgress: {
          0: { scrollPercent: 100 },
          1: { scrollPercent: 50 },
        },
      });
      // (1 + 0.5) / 2 = 0.75 -> 75%
      expect(result.percent).toBe(75);
    });

    it('handles missing chapters', () => {
      const result = getOverallProgress({
        chapterCount: 10,
        chaptersProgress: {
          0: 100,
        },
      });
      // (1 + 9*0) / 10 = 0.1 -> 10%
      expect(result.percent).toBe(10);
    });

    it('handles zero chapters', () => {
      const result = getOverallProgress({
        chapterCount: 0,
        chaptersProgress: {},
      });
      expect(result.percent).toBe(0);
      expect(result.totalChapters).toBe(0);
    });

    it('clamps values', () => {
      const result = getOverallProgress({
        chapterCount: 1,
        chaptersProgress: {
          0: 150,
        },
      });
      expect(result.percent).toBe(100);
    });
  });
});
