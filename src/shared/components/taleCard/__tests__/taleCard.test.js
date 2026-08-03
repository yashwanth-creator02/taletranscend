// src/shared/components/taleCard/__tests__/taleCard.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderTaleCards,
  fetchTalesMetadata,
  renderCardsSkeleton,
} from '@shared/components/taleCard/taleCard.js';
import * as services from '@services/index.js';

vi.mock('@services/index.js', () => ({
  getTotalReadTime: vi.fn(),
  getBookmarks: vi.fn(),
  getTaleProgressData: vi.fn(),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getOverallProgress: vi.fn(() => ({ percent: 50 })),
    formatMs: vi.fn((ms) => `${ms}ms`),
  };
});

describe('TaleCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="container"></div>';
  });

  describe('renderCardsSkeleton', () => {
    it('renders the requested number of skeletons', () => {
      const container = document.getElementById('container');
      renderCardsSkeleton(container, 3);
      const skeletons = container.querySelectorAll('.tale-card.animate-pulse');
      expect(skeletons.length).toBe(3);
    });
  });

  describe('fetchTalesMetadata', () => {
    it('returns empty maps if no tales provided', async () => {
      const result = await fetchTalesMetadata('u1', []);
      expect(result.progressSnapshots).toEqual([]);
      expect(result.bookmarkMap).toEqual({});
    });

    it('fetches progress, bookmarks, and read times', async () => {
      vi.mocked(services.getTaleProgressData).mockResolvedValue({ c1: true });
      vi.mocked(services.getBookmarks).mockResolvedValue([{ taleId: 't1' }]);
      vi.mocked(services.getTotalReadTime).mockResolvedValue(5000);

      const result = await fetchTalesMetadata('u1', [{ id: 't1' }]);

      expect(result.progressSnapshots).toHaveLength(1);
      expect(result.bookmarkMap['t1']).toBe(true);
      expect(result.readTimeMap['t1']).toBe(5000);
    });
  });

  describe('renderTaleCards', () => {
    it('renders cards into the container', () => {
      const container = document.getElementById('container');
      const tales = [{ id: 't1', title: 'Tale 1', chapterCount: 5 }];
      const metadata = {
        progressSnapshots: [{}],
        bookmarkMap: { t1: true },
        readTimeMap: { t1: 1000 },
      };

      renderTaleCards(container, tales, metadata);

      expect(container.innerHTML).toContain('Tale 1');
      expect(container.innerHTML).toContain('bookmark-minus'); // because it is bookmarked
    });
  });
});
