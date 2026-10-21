import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderEmptyState, renderErrorState, renderEmptySearchState } from '../feedback.js';

vi.mock('@/ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('Feedback Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="container"></div>';
  });

  describe('renderEmptyState', () => {
    it('renders message and icon', () => {
      const container = document.getElementById('container');
      renderEmptyState(container, { message: 'Nothing here', icon: 'archive' });

      expect(container.innerHTML).toContain('Nothing here');
      expect(container.innerHTML).toContain('data-lucide="archive"');
    });

    it('renders subMessage if provided', () => {
      const container = document.getElementById('container');
      renderEmptyState(container, { subMessage: 'Try searching' });
      expect(container.innerHTML).toContain('Try searching');
    });
  });

  describe('renderErrorState', () => {
    it('renders error message', () => {
      const container = document.getElementById('container');
      renderErrorState(container, { message: 'Big Error' });
      expect(container.innerHTML).toContain('Big Error');
      expect(container.innerHTML).toContain('data-lucide="triangle-alert"');
    });
  });

  describe('renderEmptySearchState', () => {
    it('renders search query and suggested topic chips', () => {
      const container = document.getElementById('container');
      const onClear = vi.fn();
      const onSelect = vi.fn();

      renderEmptySearchState(container, {
        query: 'Atlantis',
        suggestions: ['Mythic', 'Ancient'],
        onClear,
        onSelectSuggestion: onSelect,
      });

      expect(container.innerHTML).toContain('No chronicles match "Atlantis"');
      expect(container.innerHTML).toContain('Mythic');
      expect(container.innerHTML).toContain('Ancient');

      // Test reset button
      container.querySelector('#empty-search-reset-btn')?.click();
      expect(onClear).toHaveBeenCalled();

      // Test suggestion chip button
      container.querySelector('.empty-search-topic-btn')?.click();
      expect(onSelect).toHaveBeenCalledWith('Mythic');
    });
  });
});
