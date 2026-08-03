// src/features/shelf/__tests__/content.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadBookmarkedTales,
  loadDrafts,
  computeAndRenderHeroStats,
  applyFilterSort,
} from '../content.js';
import { shelfState } from '../state.js';
import * as services from '@services/index.js';
import * as ui from '../ui.js';

vi.mock('@services/index.js', () => ({
  getBookmarks: vi.fn(),
  getUserDrafts: vi.fn(),
  getOverallProgress: vi.fn(() => ({ percent: 0 })),
  getAllLocalChapters: vi.fn(() => []),
}));

vi.mock('../ui.js', () => ({
  renderGrid: vi.fn(),
  renderHeroStats: vi.fn(),
  setGridLoading: vi.fn(),
  setGridEmpty: vi.fn(),
  setGridError: vi.fn(),
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('ShelfContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shelfState.bookmarkedTales = [];
    shelfState.drafts = [];
    shelfState.filterQuery = '';
    shelfState.sortBy = 'date';
    shelfState.sortDir = 'desc';
  });

  describe('loadBookmarkedTales', () => {
    it('fetches and renders bookmarks', async () => {
      const mockBookmarks = [
        {
          taleId: 't1',
          taleTitle: 'T1',
          coverUrl: 'url1',
          authorName: 'A1',
          era: 'E1',
          chapterCount: 5,
        },
      ];
      vi.mocked(services.getBookmarks).mockResolvedValue(mockBookmarks);

      await loadBookmarkedTales('u1');

      expect(shelfState.bookmarkedTales).toHaveLength(1);
      expect(ui.renderGrid).toHaveBeenCalledWith(expect.anything(), 'bookmarked');
    });

    it('uses cache if available', async () => {
      shelfState.bookmarkedTales = [{ id: 't1', title: 'T1' }];
      await loadBookmarkedTales('u1');
      expect(services.getBookmarks).not.toHaveBeenCalled();
      expect(ui.renderGrid).toHaveBeenCalled();
    });
  });

  describe('loadDrafts', () => {
    it('fetches and renders drafts', async () => {
      const mockDrafts = [{ id: 'd1', title: 'D1', wordCount: 100 }];
      vi.mocked(services.getUserDrafts).mockResolvedValue(mockDrafts);

      await loadDrafts('u1');

      expect(shelfState.drafts).toHaveLength(1);
      expect(ui.renderGrid).toHaveBeenCalledWith(expect.anything(), 'drafts');
    });
  });

  describe('computeAndRenderHeroStats', () => {
    it('calculates totals and updates UI', () => {
      shelfState.bookmarkedTales = [{}, {}];
      shelfState.drafts = [{ wordCount: 1000 }, { wordCount: 2000 }];

      computeAndRenderHeroStats();

      expect(ui.renderHeroStats).toHaveBeenCalledWith({
        bookmarkCount: 2,
        draftCount: 2,
        wordsPreserved: 3000,
      });
    });
  });

  describe('applyFilterSort', () => {
    const items = [
      { title: 'Alpha', era: 'Mythic', progress: 10 },
      { title: 'Beta', era: 'Future', progress: 50 },
    ];

    it('filters by query', () => {
      shelfState.filterQuery = 'alpha';
      const result = applyFilterSort(items);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Alpha');
    });

    it('sorts by title', () => {
      shelfState.sortBy = 'title';
      shelfState.sortDir = 'asc';
      const result = applyFilterSort(items);
      expect(result[0].title).toBe('Alpha');

      shelfState.sortDir = 'desc';
      const result2 = applyFilterSort(items);
      expect(result2[0].title).toBe('Beta');
    });
  });
});
