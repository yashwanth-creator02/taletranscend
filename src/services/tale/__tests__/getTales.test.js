// src/services/tale/__tests__/getTales.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTales, getTalesPage, getTalesPageNumbered, getTalesByAuthor } from '../getTales.js';
import { getDocs, getCountFromServer, refs } from '@fb/index.js';

describe('GetTalesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTales', () => {
    it('returns normalized tales', async () => {
      const mockDocs = [
        { id: 't1', data: () => ({ title: 'Tale 1', status: 'published' }) },
        { id: 't2', data: () => ({ title: 'Tale 2', status: 'published' }) },
      ];
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const result = await getTales();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Tale 1');
    });

    it('returns empty array if no tales found', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const result = await getTales();
      expect(result).toEqual([]);
    });

    it('handles "after" cursor', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 't3', data: () => ({ title: 'Tale 3' }) }],
      });

      await getTales({ after: { id: 't2' } });
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getTalesPage', () => {
    it('returns tales and lastDoc cursor', async () => {
      const mockDocs = [
        { id: 't1', data: () => ({ title: 'Tale 1' }) },
        { id: 't2', data: () => ({ title: 'Tale 2' }) },
      ];
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const result = await getTalesPage({ count: 2 });
      expect(result.tales).toHaveLength(2);
      expect(result.lastDoc.id).toBe('t2');
    });
  });

  describe('getTalesPageNumbered', () => {
    it('returns paged tales and total count', async () => {
      // Mock getCountFromServer
      vi.mocked(getCountFromServer).mockResolvedValueOnce({
        data: () => ({ count: 10 }),
      });

      // Mock getDocs for page 1
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 't1', data: () => ({ title: 'Tale 1' }) }],
      });

      const result = await getTalesPageNumbered({ page: 1, perPage: 1 });
      expect(result.total).toBe(10);
      expect(result.tales).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('handles second page with cursor fetch', async () => {
      vi.mocked(getCountFromServer).mockResolvedValueOnce({
        data: () => ({ count: 10 }),
      });

      // Mock first call to getDocs (to get cursor)
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [{ id: 't1', data: () => ({ title: 'Tale 1' }) }],
      });

      // Mock second call to getDocs (to get page data)
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 't2', data: () => ({ title: 'Tale 2' }) }],
      });

      const result = await getTalesPageNumbered({ page: 2, perPage: 1 });
      expect(result.tales[0].id).toBe('t2');
      expect(getDocs).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTalesByAuthor', () => {
    it('returns empty array if no authorId', async () => {
      const result = await getTalesByAuthor(null);
      expect(result).toEqual([]);
    });

    it('returns tales for author', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 't1', data: () => ({ authorId: 'a1', title: 'T1' }) }],
      });

      const result = await getTalesByAuthor('a1');
      expect(result).toHaveLength(1);
      expect(result[0].authorId).toBe('a1');
    });
  });
});
