// src/pages/reader/__tests__/highlights.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyDOMHighlights,
  jumpToHighlight,
  openQuoteModal,
  closeQuoteModal,
  QUOTE_MODAL_HOST_ID,
} from '../highlights.js';
import { showToast } from '@ui/components/toast.js';

vi.mock('@ui/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

describe('Reader Highlights Module', () => {
  let container;
  let scroller;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();

    scroller = document.createElement('div');
    scroller.id = 'scroller';
    scroller.scrollTop = 0;
    scroller.scrollTo = vi.fn();
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
    });

    container = document.createElement('div');
    container.id = 'article-body';
    scroller.appendChild(container);
    document.body.appendChild(scroller);
  });

  afterEach(() => {
    closeQuoteModal();
    document.body.innerHTML = '';
  });

  describe('applyDOMHighlights', () => {
    it('gracefully handles missing container or empty highlights', () => {
      expect(() => applyDOMHighlights([], null)).not.toThrow();
      expect(() => applyDOMHighlights(null, container)).not.toThrow();
    });

    it('wraps matched text in article-body in a styled mark element', () => {
      container.innerHTML = '<p>The ancient chronicle of the stars and moons.</p>';
      const highlights = [{ id: 'hl-1', text: 'ancient chronicle', color: 'gold' }];

      applyDOMHighlights(highlights, container);

      const mark = container.querySelector('#highlight-hl-1');
      expect(mark).not.toBeNull();
      expect(mark.tagName.toLowerCase()).toBe('mark');
      expect(mark.className).toContain('reader-highlight');
      expect(mark.className).toContain('reader-highlight--gold');
      expect(mark.dataset.highlightId).toBe('hl-1');
      expect(mark.textContent).toBe('ancient chronicle');
    });

    it('clears previous highlight marks when re-applied', () => {
      container.innerHTML = '<p>The ancient chronicle of the stars.</p>';
      applyDOMHighlights([{ id: 'hl-1', text: 'ancient chronicle', color: 'gold' }], container);
      expect(container.querySelectorAll('mark.reader-highlight').length).toBe(1);

      // Re-apply with empty highlights
      applyDOMHighlights([], container);
      expect(container.querySelectorAll('mark.reader-highlight').length).toBe(0);
      expect(container.textContent).toContain('The ancient chronicle of the stars.');
    });

    it('handles multiple highlights across distinct paragraphs', () => {
      container.innerHTML = `
        <p>First passage mentioning Alexandria.</p>
        <p>Second passage mentioning Atlantis.</p>
      `;
      const highlights = [
        { id: 'hl-1', text: 'Alexandria', color: 'violet' },
        { id: 'hl-2', text: 'Atlantis', color: 'mint' },
      ];

      applyDOMHighlights(highlights, container);

      const mark1 = container.querySelector('#highlight-hl-1');
      const mark2 = container.querySelector('#highlight-hl-2');
      expect(mark1).not.toBeNull();
      expect(mark2).not.toBeNull();
      expect(mark1.className).toContain('reader-highlight--violet');
      expect(mark2.className).toContain('reader-highlight--mint');
    });
  });

  describe('jumpToHighlight', () => {
    it('scrolls container to target highlight position and pulses focus class', () => {
      container.innerHTML = `
        <p>Introduction</p>
        <p><mark id="highlight-hl-jump" class="reader-highlight">Target Quote</mark></p>
      `;
      const target = document.getElementById('highlight-hl-jump');
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
        top: 300,
        left: 50,
        right: 250,
        bottom: 330,
        width: 200,
        height: 30,
      });

      const result = jumpToHighlight('hl-jump', { scroller });
      expect(result).toBe(true);
      expect(scroller.scrollTo).toHaveBeenCalledWith({
        top: 300 - 0 + 0 - 64,
        behavior: 'smooth',
      });
      expect(target.classList.contains('highlight-focused')).toBe(true);
    });

    it('displays toast when target highlight is not present', () => {
      const result = jumpToHighlight('non-existent', { scroller });
      expect(result).toBe(false);
      expect(showToast).toHaveBeenCalledWith('Highlight not found in this fragment.', 'info');
    });

    it('triggers onClosePanel on mobile viewport', () => {
      container.innerHTML =
        '<p><mark id="highlight-hl-mobile" class="reader-highlight">Mobile Quote</mark></p>';
      const target = document.getElementById('highlight-hl-mobile');
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        left: 0,
        right: 100,
        bottom: 120,
        width: 100,
        height: 20,
      });

      const originalInnerWidth = window.innerWidth;
      window.innerWidth = 600;
      const onClose = vi.fn();

      jumpToHighlight('hl-mobile', { scroller, onClosePanel: onClose });
      expect(onClose).toHaveBeenCalled();

      window.innerWidth = originalInnerWidth;
    });
  });

  describe('Quote Share Card Modal', () => {
    it('opens quote modal and renders into body', () => {
      openQuoteModal({
        quote: 'Knowledge is preserved across epochs.',
        taleTitle: 'The Eternal Archive',
        authorName: 'Lady Seraphina',
        coverUrl: 'https://images.example/cover.jpg',
        chapterNum: 2,
      });

      const host = document.getElementById(QUOTE_MODAL_HOST_ID);
      expect(host).not.toBeNull();
      expect(host.textContent).toContain('Knowledge is preserved across epochs.');
      expect(host.textContent).toContain('The Eternal Archive');
      expect(host.textContent).toContain('Lady Seraphina');
      expect(host.textContent).toContain('Fragment 2');
    });

    it('copies quote attribution text on copy button click', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      openQuoteModal({
        quote: 'A bold statement.',
        taleTitle: 'Tale 1',
        authorName: 'Scribe A',
      });

      const host = document.getElementById(QUOTE_MODAL_HOST_ID);
      const copyBtn = host.querySelector('[data-copy-quote]');
      copyBtn.click();

      expect(writeTextMock).toHaveBeenCalledWith('"A bold statement."\n\n— Scribe A, Tale 1');
      await Promise.resolve();
      expect(showToast).toHaveBeenCalledWith('Quote copied to clipboard.', 'success');
    });

    it('closes modal on close button click', () => {
      openQuoteModal({ quote: 'Test quote' });
      expect(document.getElementById(QUOTE_MODAL_HOST_ID)).not.toBeNull();

      const host = document.getElementById(QUOTE_MODAL_HOST_ID);
      const closeBtn = host.querySelector('[data-modal-close]');
      closeBtn.click();

      expect(document.getElementById(QUOTE_MODAL_HOST_ID)).toBeNull();
    });

    it('closes modal on Escape key press', () => {
      openQuoteModal({ quote: 'Test quote' });
      expect(document.getElementById(QUOTE_MODAL_HOST_ID)).not.toBeNull();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(document.getElementById(QUOTE_MODAL_HOST_ID)).toBeNull();
    });
  });
});
