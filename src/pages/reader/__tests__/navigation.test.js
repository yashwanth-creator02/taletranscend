// src/pages/reader/__tests__/navigation.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyNavigation, goBackToTale } from '../navigation.js';
import { readerState } from '../state.js';
import * as utils from '@/utils';

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    navigateTo: vi.fn(),
  };
});

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

describe('ReaderNavigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="chapter-nav"></div>';
    vi.clearAllMocks();

    // Reset location mock if needed, but we mostly test the DOM and navigateTo call
    delete window.location;
    window.location = { href: 'http://localhost/reader.html?id=t1&chapterId=0' };
  });

  describe('applyNavigation', () => {
    it('renders prev and next buttons', () => {
      const nav = {
        hasPrev: true,
        hasNext: true,
        prevIndex: 0,
        nextIndex: 2,
        prevTitle: 'Prev Ch',
        nextTitle: 'Next Ch',
      };

      applyNavigation(nav);

      const container = document.getElementById('chapter-nav');
      expect(container.innerHTML).toContain('Prev Ch');
      expect(container.innerHTML).toContain('Next Ch');
      expect(container.querySelectorAll('[data-nav-index]').length).toBe(2);
    });

    it('handles only next button (start of tale)', () => {
      const nav = {
        hasPrev: false,
        hasNext: true,
        nextIndex: 1,
        nextTitle: 'Next Ch',
      };

      applyNavigation(nav);

      const container = document.getElementById('chapter-nav');
      expect(container.innerHTML).not.toContain('Previous');
      expect(container.innerHTML).toContain('Next Ch');
    });

    it('updates URL on button click', () => {
      const nav = { hasNext: true, nextIndex: 1, nextTitle: 'Next' };
      applyNavigation(nav);

      const btn = document.querySelector('[data-nav-index="1"]');
      btn.click();

      expect(window.location.href).toContain('chapterId=1');
    });
  });

  describe('goBackToTale', () => {
    it('navigates to tale page if taleId exists', () => {
      readerState.taleId = 'tale-123';
      goBackToTale();
      expect(utils.navigateTo).toHaveBeenCalledWith('tale.html?id=tale-123');
    });

    it('navigates to library if no taleId', () => {
      readerState.taleId = null;
      goBackToTale();
      expect(utils.navigateTo).toHaveBeenCalledWith('library.html');
    });
  });
});
