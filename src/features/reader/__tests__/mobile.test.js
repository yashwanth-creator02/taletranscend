// src/features/reader/__tests__/mobile.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initMobileDrawer, initSwipeNavigation, initToolbarAutoHide } from '../mobile.js';
import { readerState } from '../state.js';
import * as utils from '@/utils';

vi.mock('@/utils', () => ({
  navigateTo: vi.fn(),
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('ReaderMobile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="reader-settings-panel" class="hidden"></div>
      <button id="reader-settings-btn"></button>
      <button id="reader-settings-close"></button>
      <div id="mobile-toolbar"></div>
    `;
    readerState.settingsPanelOpen = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initMobileDrawer', () => {
    it('opens and closes the drawer', () => {
      initMobileDrawer();
      const panel = document.getElementById('reader-settings-panel');
      const openBtn = document.getElementById('reader-settings-btn');
      const closeBtn = document.getElementById('reader-settings-close');

      openBtn.click();
      expect(panel.classList.contains('is-open')).toBe(true);
      expect(readerState.settingsPanelOpen).toBe(true);

      closeBtn.click();
      expect(panel.classList.contains('is-open')).toBe(false);
      expect(readerState.settingsPanelOpen).toBe(false);

      vi.advanceTimersByTime(300);
      expect(panel.classList.contains('hidden')).toBe(true);
    });

    it('closes on backdrop click', () => {
      initMobileDrawer();
      const panel = document.getElementById('reader-settings-panel');
      panel.classList.add('is-open');
      readerState.settingsPanelOpen = true;

      panel.click();
      expect(panel.classList.contains('is-open')).toBe(false);
    });
  });

  describe('initSwipeNavigation', () => {
    it('navigates on horizontal swipe', () => {
      initSwipeNavigation({ prevUrl: 'prev.html', nextUrl: 'next.html' });

      // Simulate swipe left (next)
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      document.dispatchEvent(touchStart);
      document.dispatchEvent(touchEnd);

      expect(utils.navigateTo).toHaveBeenCalledWith('next.html');
    });

    it('does not navigate on small swipe', () => {
      initSwipeNavigation({ nextUrl: 'next.html' });

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 190, clientY: 100 }],
      });

      document.dispatchEvent(touchStart);
      document.dispatchEvent(touchEnd);

      expect(utils.navigateTo).not.toHaveBeenCalled();
    });
  });

  describe('initToolbarAutoHide', () => {
    it('hides toolbar on scroll down', () => {
      initToolbarAutoHide();
      const toolbar = document.getElementById('mobile-toolbar');

      // Set initial scroll
      window.scrollY = 0;

      // Scroll down
      window.scrollY = 100;
      window.dispatchEvent(new Event('scroll'));

      expect(toolbar.style.transform).toBe('translateY(100%)');

      // Scroll up
      window.scrollY = 50;
      window.dispatchEvent(new Event('scroll'));
      expect(toolbar.style.transform).toBe('translateY(0)');
    });
  });
});
