// src/utils/__tests__/navigation.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initPageReveal, readyReveal, navigateTo, VIEWS_PATH } from '../navigation.ts';
import { initDevMode } from '../dev.utils.ts';

vi.mock('../dev.utils.ts', () => ({
  initDevMode: vi.fn(),
}));

describe('Navigation Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Reset document state
    document.documentElement.style.opacity = '';
    document.documentElement.style.transition = '';
    document.body.innerHTML = '';

    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };

    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb) => cb());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initPageReveal', () => {
    it('sets initial opacity and transition', () => {
      initPageReveal();
      expect(document.documentElement.style.opacity).toBe('0');
      expect(document.documentElement.style.transition).toContain('opacity');
      expect(initDevMode).toHaveBeenCalled();
    });
  });

  describe('readyReveal', () => {
    it('sets opacity to 1 via requestAnimationFrame', () => {
      readyReveal();
      expect(document.documentElement.style.opacity).toBe('1');
    });
  });

  describe('navigateTo', () => {
    it('does nothing if no target provided', () => {
      navigateTo(null);
      expect(window.location.href).toBe('');
    });

    it('resolves view names to views path', () => {
      navigateTo('library');
      vi.runAllTimers();
      expect(window.location.href).toBe(`${VIEWS_PATH}library`);
    });

    it('handles absolute URLs', () => {
      navigateTo('https://google.com');
      vi.runAllTimers();
      expect(window.location.href).toBe('https://google.com');
    });

    it('handles root relative paths', () => {
      navigateTo('/home');
      vi.runAllTimers();
      expect(window.location.href).toBe('/home');
    });

    it('applies fade-out transition to body', () => {
      document.body.style.opacity = '1';
      navigateTo('profile');
      expect(document.body.style.opacity).toBe('0');
      expect(document.body.style.pointerEvents).toBe('none');
    });
  });
});
