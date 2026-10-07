// src/pages/tale/__tests__/ui.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderTale, renderChapters, showArchiveSkeletons } from '../ui.js';
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

    it('renders publicationStatus, displays author edit button, and hides inquire controls when user is author', async () => {
      document.body.innerHTML += `
        <div id="display-status"></div>
        <div id="display-status-dot"></div>
        <a id="edit-tale-btn-desktop" class="hidden"></a>
        <a id="edit-tale-btn-mobile" class="hidden"></a>
        <div id="author-actions-mobile" class="hidden"></div>
        <button id="tab-btn-letter"></button>
        <div id="content-letter"></div>
        <div class="chronicler-invite-card"></div>
      `;

      const mockTale = {
        title: 'Completed Tale',
        authorId: 'author-123',
        publicationStatus: 'completed',
        tags: [],
      };

      await renderTale('author-123', mockTale, 'tale-abc');

      expect(document.getElementById('display-status').textContent).toBe('Completed');
      expect(document.getElementById('display-status-dot').className).toContain('bg-indigo-400');
      const editBtn = document.getElementById('edit-tale-btn-desktop');
      expect(editBtn.classList.contains('hidden')).toBe(false);
      expect(editBtn.style.display).toBe('inline-flex');
      expect(editBtn.getAttribute('href')).toBe('/contribution.html?taleId=tale-abc');
      expect(document.getElementById('author-actions-mobile').classList.contains('hidden')).toBe(
        false
      );
      expect(document.getElementById('author-actions-mobile').style.display).toBe('block');
      expect(document.getElementById('tab-btn-letter').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('content-letter').classList.contains('hidden')).toBe(true);
      expect(document.querySelector('.chronicler-invite-card').classList.contains('hidden')).toBe(
        true
      );
    });

    it('hides author edit button and displays inquire controls when user is not author or anonymous', async () => {
      document.body.innerHTML += `
        <a id="edit-tale-btn-desktop"></a>
        <a id="edit-tale-btn-mobile"></a>
        <div id="author-actions-mobile"></div>
        <button id="tab-btn-letter" class="hidden"></button>
        <div id="content-letter" class="hidden"></div>
        <div class="chronicler-invite-card hidden"></div>
      `;

      const mockTale = {
        title: 'Reader Tale',
        authorId: 'author-123',
        tags: [],
      };

      await renderTale('reader-456', mockTale, 'tale-abc');

      expect(document.getElementById('edit-tale-btn-desktop').classList.contains('hidden')).toBe(
        true
      );
      expect(document.getElementById('edit-tale-btn-desktop').style.display).toBe('none');
      expect(document.getElementById('author-actions-mobile').classList.contains('hidden')).toBe(
        true
      );
      expect(document.getElementById('author-actions-mobile').style.display).toBe('none');
      expect(document.getElementById('tab-btn-letter').classList.contains('hidden')).toBe(false);
      expect(document.querySelector('.chronicler-invite-card').classList.contains('hidden')).toBe(
        false
      );

      // Also ensure anonymous user with anonymous tale author is NOT treated as author
      await renderTale('anonymous', { title: 'Anon Tale', authorId: 'anonymous' }, 'tale-xyz');
      expect(document.getElementById('edit-tale-btn-desktop').style.display).toBe('none');
      expect(document.getElementById('author-actions-mobile').style.display).toBe('none');
    });

    it('populates resonance count and initial active state when isResonated is true', async () => {
      document.body.innerHTML += `
        <span id="resonance-count">0</span>
        <span id="resonance-count-mobile">0</span>
        <button id="resonance-btn-desktop">
          <i></i>
          <span class="resonance-label">Align Souls</span>
        </button>
      `;

      const mockTale = {
        title: 'Resonant Tale',
        reactionCount: 27,
      };

      await renderTale('user-1', mockTale, 'tale-1', true);

      expect(document.getElementById('resonance-count').textContent).toBe('27');
      expect(document.getElementById('resonance-count-mobile').textContent).toBe('27');
      const btn = document.getElementById('resonance-btn-desktop');
      expect(btn.classList.contains('is-aligned')).toBe(true);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.querySelector('.resonance-label').textContent).toBe('Souls Aligned');
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
