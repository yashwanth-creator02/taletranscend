// src/pages/reader/__tests__/toc.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildTOC, updateTOCScrollSpy } from '../toc.js';
import { readerState } from '../state.js';
import { renderTocPanel } from '../templates.js';

vi.mock('../templates.js', () => ({
  renderTocPanel: vi.fn(() => 'mock-toc-html'),
}));

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
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

    readerState.chapters = [{ id: 'c1', sections: [] }];
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
});
