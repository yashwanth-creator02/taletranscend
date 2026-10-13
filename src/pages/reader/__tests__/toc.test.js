// src/pages/reader/__tests__/toc.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTOC, updateTOCScrollSpy, bindTocEvents } from '../toc.js';
import { readerState } from '../state.js';
import { renderTocPanel } from '../templates.js';
import {
  markChapterRead,
  markChapterUnread,
  syncMarkChapterRead,
  syncMarkChapterUnread,
  downloadChapter,
} from '@services/index.js';
import { showToast } from '@ui/components/toast.js';

vi.mock('../templates.js', () => ({
  renderTocPanel: vi.fn(() => 'mock-toc-html'),
}));

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@services/index.js', () => ({
  markChapterRead: vi.fn(),
  markChapterUnread: vi.fn(),
  syncMarkChapterRead: vi.fn(),
  syncMarkChapterUnread: vi.fn(),
  downloadChapter: vi.fn(),
  getChapterProgress: vi.fn(),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  navigateTo: vi.fn(),
  readerUrl: vi.fn((taleId, idx) => `/reader?taleId=${taleId}&chapterId=${idx}`),
}));

describe('ReaderTOC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="scroller" style="height: 500px; overflow: scroll;">
        <div id="article-body">
          <h2 id="s1">Section 1</h2>
          <div style="height: 1000px"></div>
          <h3 id="s2">Section 2</h3>
        </div>
      </div>
      <div id="panel-content"></div>
    `;

    readerState.taleId = 'tale-1';
    readerState.userId = 'user-1';
    readerState.chapterIndex = 0;
    readerState.chapters = [{ id: 'c1', sections: [], title: 'Chapter 1' }];
    readerState.currentChapterId = 'c1';
    readerState.openTool = 'toc';
  });

  describe('buildTOC', () => {
    it('extracts sections from DOM and updates state', () => {
      buildTOC();
      const ch = readerState.chapters.find((c) => c.id === 'c1');
      expect(ch.sections).toHaveLength(2);
      expect(ch.sections[0].id).toBe('s1');
      expect(ch.sections[0].title).toBe('Section 1');
      expect(ch.sections[1].level).toBe(3);
    });
  });

  describe('updateTOCScrollSpy', () => {
    it('updates activeSection based on scroll position', () => {
      // Mock getBoundingClientRect
      const h2 = document.getElementById('s1');
      const h3 = document.getElementById('s2');
      const scroller = document.getElementById('scroller');

      vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: 0 });
      vi.spyOn(h2, 'getBoundingClientRect').mockReturnValue({ top: 200 }); // Not active yet (> 120)
      vi.spyOn(h3, 'getBoundingClientRect').mockReturnValue({ top: 500 });

      updateTOCScrollSpy();
      expect(readerState.activeSection).toBe(null);

      vi.spyOn(h2, 'getBoundingClientRect').mockReturnValue({ top: 50 }); // Now active (<= 120)
      updateTOCScrollSpy();
      expect(readerState.activeSection).toBe('s1');
      expect(renderTocPanel).toHaveBeenCalled();
    });
  });

  describe('bindTocEvents', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div class="toc-chapter-header">
          <button data-chapter-id="c1">Chapter 1</button>
          <div class="toc-chapter-menu-wrap">
            <button class="toc-menu-trigger" data-toc-menu-trigger="c1"></button>
            <div id="toc-menu-c1" class="toc-menu-dropdown hidden">
              <button class="toc-menu-item" data-action="mark-read" data-chapter-index="0" data-chapter-title="Chapter 1">Mark Read</button>
              <button class="toc-menu-item" data-action="mark-unread" data-chapter-index="0" data-chapter-title="Chapter 1">Mark Unread</button>
              <button class="toc-menu-item" data-action="download-chapter" data-chapter-index="0" data-chapter-title="Chapter 1">Download</button>
            </div>
          </div>
        </div>
      `;
    });

    it('toggles menu dropdown when clicking trigger', () => {
      bindTocEvents();
      const trigger = document.querySelector('[data-toc-menu-trigger="c1"]');
      const menu = document.getElementById('toc-menu-c1');

      expect(menu.classList.contains('hidden')).toBe(true);

      trigger.click();
      expect(menu.classList.contains('hidden')).toBe(false);

      trigger.click();
      expect(menu.classList.contains('hidden')).toBe(true);
    });

    it('marks chapter as read and shows toast', () => {
      const onRefresh = vi.fn();
      bindTocEvents({ onRefresh });

      const markReadBtn = document.querySelector('[data-action="mark-read"]');
      markReadBtn.click();

      expect(markChapterRead).toHaveBeenCalledWith({
        userId: 'user-1',
        taleId: 'tale-1',
        chapterIndex: 0,
      });
      expect(syncMarkChapterRead).toHaveBeenCalledWith({
        userId: 'user-1',
        taleId: 'tale-1',
        chapterIndex: 0,
      });
      expect(showToast).toHaveBeenCalledWith('Marked "Chapter 1" as read.', 'success');
      expect(onRefresh).toHaveBeenCalled();
    });

    it('marks chapter as unread and shows toast', () => {
      const onRefresh = vi.fn();
      bindTocEvents({ onRefresh });

      const markUnreadBtn = document.querySelector('[data-action="mark-unread"]');
      markUnreadBtn.click();

      expect(markChapterUnread).toHaveBeenCalledWith({
        userId: 'user-1',
        taleId: 'tale-1',
        chapterIndex: 0,
      });
      expect(syncMarkChapterUnread).toHaveBeenCalledWith({
        userId: 'user-1',
        taleId: 'tale-1',
        chapterIndex: 0,
      });
      expect(showToast).toHaveBeenCalledWith('Marked "Chapter 1" as unread.', 'info');
      expect(onRefresh).toHaveBeenCalled();
    });

    it('triggers chapter download when clicking download', () => {
      bindTocEvents();
      const downloadBtn = document.querySelector('[data-action="download-chapter"]');
      downloadBtn.click();

      expect(downloadChapter).toHaveBeenCalledWith(
        'tale-1',
        0,
        expect.objectContaining({
          taleTitle: readerState.taleTitle,
        })
      );
    });
  });
});
