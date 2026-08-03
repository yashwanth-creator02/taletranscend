// src/pages/library/__tests__/filters.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyAllFilters,
  setupSearch,
  setupEraFilter,
  setupToneFilter,
  setupLengthFilter,
  setupSidebarFilter,
} from '../filters.js';
import { libraryState } from '../state.js';
import * as services from '@services/index.js';
import * as ui from '../ui.js';
import { renderCardsGrid } from '@/shared/components/taleCard/taleCard.js';

vi.mock('@services/index.js', () => ({
  getBookmarks: vi.fn(),
}));

vi.mock('../ui.js', () => ({
  buildEraChips: vi.fn(),
  setActiveEraChip: vi.fn(),
  setActiveSidebarBtn: vi.fn(),
}));

vi.mock('@shared/components/taleCard/taleCard.js', () => ({
  renderCardsGrid: vi.fn(),
}));

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('LibraryFilters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    libraryState.allTales = [
      {
        id: 't1',
        title: 'Epic Saga',
        era: 'Mythic',
        tone: 'Heroic',
        wordCount: 5000,
        authorId: 'u1',
      },
      {
        id: 't2',
        title: 'Short Poem',
        era: 'Future',
        tone: 'Dark',
        wordCount: 500,
        authorId: 'u2',
      },
      {
        id: 't3',
        title: 'Long Novel',
        era: 'Mythic',
        tone: 'Heroic',
        wordCount: 20000,
        authorId: 'u1',
      },
    ];
    libraryState.userId = 'u1';
    libraryState.activeEra = 'all';
    libraryState.activeTone = 'all';
    libraryState.activeLength = 'all';
    libraryState.searchQuery = '';
    libraryState.sidebarFilter = 'all';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('applyAllFilters', () => {
    it('filters by era', async () => {
      libraryState.activeEra = 'Mythic';
      await applyAllFilters();
      expect(libraryState.filteredTales).toHaveLength(2);
      expect(renderCardsGrid).toHaveBeenCalledWith(
        'u1',
        expect.arrayContaining([
          expect.objectContaining({ id: 't1' }),
          expect.objectContaining({ id: 't3' }),
        ])
      );
    });

    it('filters by tone', async () => {
      libraryState.activeTone = 'Dark';
      await applyAllFilters();
      expect(libraryState.filteredTales).toHaveLength(1);
      expect(libraryState.filteredTales[0].id).toBe('t2');
    });

    it('filters by length', async () => {
      libraryState.activeLength = 'short';
      await applyAllFilters();
      expect(libraryState.filteredTales).toHaveLength(1);
      expect(libraryState.filteredTales[0].id).toBe('t2');

      libraryState.activeLength = 'long';
      await applyAllFilters();
      expect(libraryState.filteredTales).toHaveLength(1);
      expect(libraryState.filteredTales[0].id).toBe('t3');
    });

    it('filters by search query', async () => {
      libraryState.searchQuery = 'saga';
      await applyAllFilters();
      expect(libraryState.filteredTales).toHaveLength(1);
      expect(libraryState.filteredTales[0].id).toBe('t1');
    });

    it('filters by sidebar "my-tales"', async () => {
      libraryState.sidebarFilter = 'my-tales';
      await applyAllFilters();
      expect(libraryState.filteredTales).toHaveLength(2);
      expect(libraryState.filteredTales.every((t) => t.authorId === 'u1')).toBe(true);
    });

    it('filters by sidebar "bookmarked"', async () => {
      libraryState.sidebarFilter = 'bookmarked';
      vi.mocked(services.getBookmarks).mockResolvedValue([{ taleId: 't1' }]);

      await applyAllFilters();

      expect(libraryState.filteredTales).toHaveLength(1);
      expect(libraryState.filteredTales[0].id).toBe('t1');
    });

    it('composes multiple filters correctly', async () => {
      libraryState.activeEra = 'Mythic';
      libraryState.searchQuery = 'long';

      await applyAllFilters();

      expect(libraryState.filteredTales).toHaveLength(1);
      expect(libraryState.filteredTales[0].id).toBe('t3'); // Mythic + "long" in title
    });
  });

  describe('setupSearch', () => {
    it('updates state and applies filters on input', () => {
      document.body.innerHTML = '<input id="search-input" />';
      setupSearch();
      const input = document.getElementById('search-input');
      input.value = 'test';
      input.dispatchEvent(new Event('input'));

      // Debounce is 220ms
      vi.advanceTimersByTime(220);
      expect(libraryState.searchQuery).toBe('test');
    });
  });
});
