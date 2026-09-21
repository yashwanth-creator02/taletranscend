// src/utils/__tests__/navigation.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initPageReveal, readyReveal, navigateTo, resolveHref, VIEWS_PATH } from '../navigation.ts';
import { initDevMode } from '../dev.utils.ts';

vi.mock('../dev.utils.ts', () => ({ initDevMode: vi.fn() }));

describe('Navigation Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    document.documentElement.style.opacity = '';
    document.documentElement.style.transition = '';
    document.body.innerHTML = '';
    document.body.style.opacity = '';
    document.body.style.pointerEvents = '';

    delete window.location;
    window.location = { href: '' };

    // Default to "motion allowed" so the fade path is the one under test.
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('initPageReveal', () => {
    it('initialises dev mode', () => {
      initPageReveal();
      expect(initDevMode).toHaveBeenCalled();
    });

    it('does not hide the document', () => {
      // The boot fade is a CSS animation with `forwards` now. If this ever
      // starts setting opacity again, a failed module import will once more
      // leave users looking at a blank page.
      initPageReveal();
      expect(document.documentElement.style.opacity).toBe('');
    });
  });

  describe('readyReveal', () => {
    it('is a no-op and never throws', () => {
      expect(() => readyReveal()).not.toThrow();
      expect(document.documentElement.style.opacity).toBe('');
    });
  });

  describe('resolveHref', () => {
    it('resolves a bare view name to a root-relative .html path', () => {
      expect(resolveHref('library')).toBe('/library.html');
    });

    it('resolves a view filename', () => {
      expect(resolveHref('library.html')).toBe('/library.html');
    });

    it('preserves query strings', () => {
      expect(resolveHref('tale.html?id=abc')).toBe('/tale.html?id=abc');
    });

    it('appends .html to a bare name carrying a query', () => {
      expect(resolveHref('tale?id=abc')).toBe('/tale.html?id=abc');
    });

    it('strips a leading ./', () => {
      expect(resolveHref('./shelf.html')).toBe('/shelf.html');
    });

    it('leaves root-relative paths alone', () => {
      expect(resolveHref('/shelf')).toBe('/shelf');
    });

    it('leaves absolute, mailto and hash targets alone', () => {
      expect(resolveHref('https://example.com')).toBe('https://example.com');
      expect(resolveHref('//cdn.example.com/x')).toBe('//cdn.example.com/x');
      expect(resolveHref('mailto:a@b.co')).toBe('mailto:a@b.co');
      expect(resolveHref('#section')).toBe('#section');
    });

    it('never produces a source-tree path', () => {
      // Regression guard: VIEWS_PATH was '/src/views/', which leaked the
      // repository layout into every URL and bypassed the Firebase rewrites.
      expect(VIEWS_PATH).toBe('/');
      expect(resolveHref('profile')).not.toContain('src/views');
    });
  });

  describe('navigateTo', () => {
    it('does nothing without a target', () => {
      navigateTo(null);
      expect(window.location.href).toBe('');
    });

    it('resolves view names before navigating', () => {
      navigateTo('library');
      vi.runAllTimers();
      expect(window.location.href).toBe('/library.html');
    });

    it('handles absolute URLs', () => {
      navigateTo('https://google.com');
      vi.runAllTimers();
      expect(window.location.href).toBe('https://google.com');
    });

    it('handles root-relative paths', () => {
      navigateTo('/home');
      vi.runAllTimers();
      expect(window.location.href).toBe('/home');
    });

    it('applies the fade-out transition to the body', () => {
      document.body.style.opacity = '1';
      navigateTo('profile');
      expect(document.body.style.opacity).toBe('0');
      expect(document.body.style.pointerEvents).toBe('none');
    });

    it('navigates immediately and without fading when motion is reduced', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn() })
      );
      document.body.style.opacity = '1';
      navigateTo('profile');
      expect(window.location.href).toBe('/profile.html');
      expect(document.body.style.opacity).toBe('1');
    });
  });
});
