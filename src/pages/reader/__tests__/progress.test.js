import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { updateReaderProgress, bindScrollProgress, restoreScrollProgress } from '../progress.js';

// Mock logger
vi.mock('@/utils', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('Reader Progress', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="progressBar" style="width: 0%"></div>
      <div id="topBarPct">0%</div>
      <div id="scroller" style="height: 500px; overflow: scroll;">
        <div style="height: 2000px;">Content</div>
      </div>
      <button id="backToTop" class="hidden"></button>
    `;

    // Mock scrollHeight and clientHeight which are 0 in JSDOM by default
    const scroller = document.getElementById('scroller');
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(scroller, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(scroller, 'scrollTop', { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateReaderProgress', () => {
    it('updates progress bar width and percentage text', () => {
      updateReaderProgress({ scrollPercent: 50 });

      const progressBar = document.getElementById('progressBar');
      const pctText = document.getElementById('topBarPct');

      expect(progressBar.style.width).toBe('50%');
      expect(pctText.textContent).toBe('50%');
    });

    it('rounds percentage text', () => {
      updateReaderProgress({ scrollPercent: 33.333 });
      expect(document.getElementById('topBarPct').textContent).toBe('33%');
    });
    it('updates progress-bar and top-bar-pct kebab-case IDs as well', () => {
      document.body.innerHTML += `
        <div id="progress-bar" style="width: 0%"></div>
        <div id="top-bar-pct">0%</div>
      `;
      updateReaderProgress({ scrollPercent: 75 });
      expect(document.getElementById('progress-bar').style.width).toBe('75%');
      expect(document.getElementById('top-bar-pct').textContent).toBe('75%');
    });
  });

  describe('bindScrollProgress', () => {
    it('updates UI and calls onScroll when scrolling', () => {
      const onScroll = vi.fn();
      const cleanup = bindScrollProgress({ onScroll });

      const scroller = document.getElementById('scroller');
      scroller.scrollTop = 750; // (2000 - 500) = 1500 max scroll. 750 is 50%.

      // Dispatch scroll event
      scroller.dispatchEvent(new Event('scroll'));

      expect(onScroll).toHaveBeenCalledWith(50, 750);
      expect(document.getElementById('progressBar').style.width).toBe('50%');

      cleanup();
    });

    it('calculates progress based strictly on article-body dimensions when present', () => {
      // Setup article-body inside scroller with additional content below (e.g. comments)
      const scroller = document.getElementById('scroller');
      scroller.innerHTML = `
        <div style="height: 100px;">Header</div>
        <article id="article-body">Tale Content</article>
        <div style="height: 1000px;">Discussions</div>
      `;
      const article = document.getElementById('article-body');
      Object.defineProperty(article, 'offsetTop', { value: 100, configurable: true });
      Object.defineProperty(article, 'offsetHeight', { value: 900, configurable: true });
      // articleTop = 100, articleHeight = 900, scroller clientHeight = 500.
      // endScroll = 100 + 900 - 500 = 500.
      // When scrollTop is 500, user reached bottom of article -> 100%.

      const onScroll = vi.fn();
      const cleanup = bindScrollProgress({ onScroll });

      // Scroll to 250 (halfway through tale content)
      scroller.scrollTop = 250;
      scroller.dispatchEvent(new Event('scroll'));
      expect(onScroll).toHaveBeenLastCalledWith(50, 250);

      // Scroll to 500 (end of tale content)
      scroller.scrollTop = 500;
      scroller.dispatchEvent(new Event('scroll'));
      expect(onScroll).toHaveBeenLastCalledWith(100, 500);

      cleanup();
    });

    it('makes 100% progress persistent so scrolling back up remains at 100%', () => {
      const onScroll = vi.fn();
      const cleanup = bindScrollProgress({ onScroll });

      const scroller = document.getElementById('scroller');

      // Scroll to 100%
      scroller.scrollTop = 1500;
      scroller.dispatchEvent(new Event('scroll'));
      expect(onScroll).toHaveBeenLastCalledWith(100, 1500);
      expect(document.getElementById('progressBar').style.width).toBe('100%');
      expect(document.getElementById('topBarPct').textContent).toBe('100%');

      // Scroll back to top
      scroller.scrollTop = 0;
      scroller.dispatchEvent(new Event('scroll'));
      expect(onScroll).toHaveBeenLastCalledWith(100, 0);
      expect(document.getElementById('progressBar').style.width).toBe('100%');
      expect(document.getElementById('topBarPct').textContent).toBe('100%');

      cleanup();
    });

    it('locks progress at 100% immediately when initialPercent is 100', () => {
      const onScroll = vi.fn();
      const cleanup = bindScrollProgress({ onScroll, initialPercent: 100 });

      expect(document.getElementById('progressBar').style.width).toBe('100%');
      expect(document.getElementById('topBarPct').textContent).toBe('100%');

      const scroller = document.getElementById('scroller');
      scroller.scrollTop = 200;
      scroller.dispatchEvent(new Event('scroll'));
      expect(onScroll).toHaveBeenLastCalledWith(100, 200);

      cleanup();
    });

    it('shows/hides backToTop button based on scroll position', () => {
      const onScroll = vi.fn();
      bindScrollProgress({ onScroll });

      const scroller = document.getElementById('scroller');
      const backToTop = document.getElementById('backToTop');

      // Scroll past 600
      scroller.scrollTop = 601;
      scroller.dispatchEvent(new Event('scroll'));
      expect(backToTop.classList.contains('hidden')).toBe(false);

      // Scroll back below 600
      scroller.scrollTop = 599;
      scroller.dispatchEvent(new Event('scroll'));
      expect(backToTop.classList.contains('hidden')).toBe(true);
    });

    it('returns a no-op cleanup if scroller is not found', () => {
      document.body.innerHTML = '';
      const cleanup = bindScrollProgress({ onScroll: vi.fn() });
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  describe('restoreScrollProgress', () => {
    it('restores scroll position using ResizeObserver', () => {
      // Mock ResizeObserver
      let observerCallback;
      const mockObserve = vi.fn();
      const mockDisconnect = vi.fn();

      global.ResizeObserver = class {
        constructor(cb) {
          observerCallback = cb;
        }
        observe = mockObserve;
        disconnect = mockDisconnect;
      };

      restoreScrollProgress({ scrollPercent: 50 });

      const scroller = document.getElementById('scroller');
      expect(mockObserve).toHaveBeenCalledWith(scroller);

      // Trigger the observer callback
      observerCallback();

      expect(scroller.scrollTop).toBe(750); // 50% of (2000 - 500)
      expect(mockDisconnect).toHaveBeenCalled();

      delete global.ResizeObserver;
    });

    it('does nothing if scrollPercent is too low or invalid', () => {
      restoreScrollProgress({ scrollPercent: 1 });
      const scroller = document.getElementById('scroller');
      expect(scroller.scrollTop).toBe(0);
    });

    it('restores scroll position even if scrollPercent is 100', () => {
      let observerCallback;
      const mockObserve = vi.fn();
      const mockDisconnect = vi.fn();

      global.ResizeObserver = class {
        constructor(cb) {
          observerCallback = cb;
        }
        observe = mockObserve;
        disconnect = mockDisconnect;
      };

      restoreScrollProgress({ scrollPercent: 100 });
      const scroller = document.getElementById('scroller');
      expect(mockObserve).toHaveBeenCalledWith(scroller);

      observerCallback();

      expect(scroller.scrollTop).toBe(1500); // 100% of (2000 - 500)
      expect(mockDisconnect).toHaveBeenCalled();

      delete global.ResizeObserver;
    });

    it('restores exact scroll position when scrollTop is provided', () => {
      let observerCallback;
      const mockObserve = vi.fn();
      const mockDisconnect = vi.fn();

      global.ResizeObserver = class {
        constructor(cb) {
          observerCallback = cb;
        }
        observe = mockObserve;
        disconnect = mockDisconnect;
      };

      restoreScrollProgress({ scrollTop: 420 });
      const scroller = document.getElementById('scroller');
      expect(mockObserve).toHaveBeenCalledWith(scroller);

      observerCallback();

      expect(scroller.scrollTop).toBe(420);
      expect(mockDisconnect).toHaveBeenCalled();

      delete global.ResizeObserver;
    });
  });
});
