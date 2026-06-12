// src/services/reader/__tests__/reader.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTaleMeta, getChapter } from '../reader.service.js';
import { refs, getDoc, getDocs } from '@fb/index.js';

describe('ReaderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTaleMeta', () => {
    it('returns null if no taleId is provided', async () => {
      const result = await getTaleMeta(null);
      expect(result).toBeNull();
    });

    it('returns normalized tale data if tale exists', async () => {
      const mockTaleData = { title: 'Test Tale', author: 'Author' };
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'tale-1',
        data: () => mockTaleData,
      });

      const result = await getTaleMeta('tale-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('tale-1');
      expect(result.title).toBe('Test Tale');
      expect(getDoc).toHaveBeenCalledWith(refs.tale('tale-1'));
    });

    it('throws error and returns fallback if tale does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
      });

      const result = await getTaleMeta('non-existent');
      expect(result).toBeNull(); // safeCall returns null on error
    });
  });

  describe('getChapter', () => {
    it('returns null if params are invalid', async () => {
      expect(await getChapter({ taleId: null, chapterIndex: 0 })).toBeNull();
      expect(await getChapter({ taleId: 't1', chapterIndex: null })).toBeNull();
    });

    it('returns chapter and navigation context', async () => {
      const mockChapters = [
        { id: 'c1', data: () => ({ title: 'Chapter 1', chapterNum: 1, content: '...' }) },
        { id: 'c2', data: () => ({ title: 'Chapter 2', chapterNum: 2, content: '...' }) },
        { id: 'c3', data: () => ({ title: 'Chapter 3', chapterNum: 3, content: '...' }) },
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockChapters,
      });

      const result = await getChapter({ taleId: 't1', chapterIndex: 1 });

      expect(result.chapter.title).toBe('Chapter 2');
      expect(result.navigation.hasPrev).toBe(true);
      expect(result.navigation.hasNext).toBe(true);
      expect(result.navigation.prevTitle).toBe('Chapter 1');
      expect(result.navigation.nextTitle).toBe('Chapter 3');
      expect(result.navigation.totalChapters).toBe(3);
    });

    it('handles first chapter correctly', async () => {
      const mockChapters = [
        { id: 'c1', data: () => ({ title: 'Chapter 1', chapterNum: 1, content: '...' }) },
        { id: 'c2', data: () => ({ title: 'Chapter 2', chapterNum: 2, content: '...' }) },
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockChapters,
      });

      const result = await getChapter({ taleId: 't1', chapterIndex: 0 });
      expect(result.navigation.hasPrev).toBe(false);
      expect(result.navigation.hasNext).toBe(true);
    });

    it('handles last chapter correctly', async () => {
      const mockChapters = [
        { id: 'c1', data: () => ({ title: 'Chapter 1', chapterNum: 1, content: '...' }) },
        { id: 'c2', data: () => ({ title: 'Chapter 2', chapterNum: 2, content: '...' }) },
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockChapters,
      });

      const result = await getChapter({ taleId: 't1', chapterIndex: 1 });
      expect(result.navigation.hasPrev).toBe(true);
      expect(result.navigation.hasNext).toBe(false);
    });

    it('sorts chapters by chapterNum before resolving index', async () => {
      const mockChapters = [
        { id: 'c2', data: () => ({ title: 'Chapter 2', chapterNum: 2 }) },
        { id: 'c1', data: () => ({ title: 'Chapter 1', chapterNum: 1 }) },
        { id: 'c3', data: () => ({ title: 'Chapter 3', chapterNum: 3 }) },
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: mockChapters,
      });

      // Request index 0 — should be Chapter 1 despite mock order
      const result = await getChapter({ taleId: 't1', chapterIndex: 0 });

      expect(result.chapter.title).toBe('Chapter 1');
      expect(result.navigation.nextTitle).toBe('Chapter 2');
    });

    it('returns null if chapter index is out of bounds', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [{ id: 'c1', data: () => ({ title: 'C1', chapterNum: 1 }) }],
      });

      const result = await getChapter({ taleId: 't1', chapterIndex: 5 });
      expect(result).toBeNull();
    });
  });
});
