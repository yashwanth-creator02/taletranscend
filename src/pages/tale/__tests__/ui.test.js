// src/pages/tale/__tests__/ui.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTale, renderChapters, showArchiveSkeletons } from '../ui.js';
import * as services from '@services/index.js';
import { getChapterProgress } from '@services/reader/localProgress.service.js';

vi.mock('@services/index.js', () => ({
  getTotalReadTime: vi.fn(() => Promise.resolve(60000)), // 1 min
}));

vi.mock('@services/reader/localProgress.service.js', () => ({
  getChapterProgress: vi.fn(),
}));

vi.mock('@ui/components/icons.js', () => ({
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
  };
});

describe('TaleUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="chapter-list"></div>
      <div id="display-title"></div>
      <div id="display-description"></div>
      <div id="display-author"></div>
      <div id="display-chapters"></div>
      <div id="sidebar-chapter-count"></div>
      <div id="tale-era"></div>
      <div id="tale-genre"></div>
      <div id="tale-language"></div>
      <div id="loading-indicator"></div>
      <div id="header-tale-title"></div>
      <img id="display-cover" />
      <div id="hero-section"></div>
      <div id="lore-tag-list"></div>
      <div id="read-time"></div>
    `;
  });

  describe('showArchiveSkeletons', () => {
    it('renders skeleton loaders', () => {
      showArchiveSkeletons();
      expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('renderTale', () => {
    it('populates metadata into DOM', async () => {
      const mockTale = {
        title: 'Mythic Quest',
        description: 'An epic journey',
        chapterCount: 12,
        authorName: 'Scribe',
        era: 'Mythic',
        genre: 'Epic',
        language: 'Ancient',
        tags: ['quest', 'hero'],
        authorId: 'u1',
      };

      await renderTale('user1', mockTale, 't1');

      expect(document.getElementById('display-title').textContent).toBe('Mythic Quest');
      expect(document.getElementById('display-description').textContent).toBe('An epic journey');
      expect(document.getElementById('display-author').textContent).toBe('Scribe');
      expect(document.getElementById('lore-tag-list').children.length).toBe(2);
      expect(document.getElementById('read-time').textContent).toBe('1 min read');
    });
  });

  describe('renderChapters', () => {
    it('renders chapter list with progress icons', () => {
      const chapters = [{ title: 'Chapter 1' }, { title: 'Chapter 2' }];

      vi.mocked(getChapterProgress).mockImplementation(({ chapterIndex }) => {
        if (chapterIndex === 0) return { finished: true };
        return null;
      });

      renderChapters('user1', chapters, 't1');

      const items = document.querySelectorAll('.chapter-item');
      expect(items).toHaveLength(2);
      expect(items[0].innerHTML).toContain('check-circle-2'); // Completed
      expect(items[1].innerHTML).toContain('circle'); // Not started
    });

    it('renders empty state if no chapters', () => {
      renderChapters('user1', [], 't1');
      expect(document.getElementById('chapter-list').textContent).toContain(
        'No chronicles detected'
      );
    });
  });
});
