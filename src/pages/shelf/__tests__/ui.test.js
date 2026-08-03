// src/pages/shelf/__tests__/ui.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  renderGrid,
  setGridLoading,
  setGridEmpty,
  setGridError,
  buildBookmarkCard,
  buildDraftCard,
  renderHeroStats,
  setActiveTab,
} from '../ui.js';
import { shelfState } from '../state.js';

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    setText: vi.fn((id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }),
    timeAgo: vi.fn(() => '2 days ago'),
  };
});

describe('ShelfUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="shelf-grid"></div>
      <div id="hero-stat-drafts"></div>
      <div id="hero-stat-bookmarks"></div>
      <div id="hero-stat-words"></div>
      <button class="shelf-tab" data-tab="bookmarked"></button>
      <button class="shelf-tab" data-tab="drafts"></button>
    `;
    shelfState.sortBy = 'date';
    shelfState.sortDir = 'desc';
  });

  describe('renderGrid', () => {
    it('renders bookmark cards', () => {
      const items = [{ id: 't1', title: 'Tale 1', progress: 50 }];
      renderGrid(items, 'bookmarked');
      const grid = document.getElementById('shelf-grid');
      expect(grid.innerHTML).toContain('Tale 1');
      expect(grid.innerHTML).toContain('50%');
    });

    it('renders draft cards', () => {
      const items = [{ id: 'd1', title: 'Draft 1', wordCount: 500 }];
      renderGrid(items, 'drafts');
      const grid = document.getElementById('shelf-grid');
      expect(grid.innerHTML).toContain('Draft 1');
      expect(grid.innerHTML).toContain('500 words');
    });

    it('shows empty state if no items', () => {
      renderGrid([], 'drafts');
      expect(document.getElementById('shelf-grid').textContent).toContain('No drafts match');
    });
  });

  describe('setGridLoading', () => {
    it('renders skeletons', () => {
      setGridLoading();
      expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('renderHeroStats', () => {
    it('updates stat elements', () => {
      renderHeroStats({ draftCount: 5, bookmarkCount: 10, wordsPreserved: 15000 });
      expect(document.getElementById('hero-stat-drafts').textContent).toBe('5');
      expect(document.getElementById('hero-stat-bookmarks').textContent).toBe('10');
      expect(document.getElementById('hero-stat-words').textContent).toBe('15k'); // Changed from 15,000
    });
  });

  describe('setActiveTab', () => {
    it('sets active class on correct tab', () => {
      setActiveTab('drafts');
      const dBtn = document.querySelector('[data-tab="drafts"]');
      const bBtn = document.querySelector('[data-tab="bookmarked"]');
      expect(dBtn.classList.contains('shelf-tab-active')).toBe(true);
      expect(bBtn.classList.contains('shelf-tab-active')).toBe(false);
    });
  });
});
