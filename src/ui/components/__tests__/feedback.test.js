// src/ui/components/__tests__/feedback.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderEmptyState, renderErrorState } from '../feedback.js';

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
});
