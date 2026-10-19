// src/utils/__tests__/navigation.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initPageReveal,
  readyReveal,
  navigateTo,
  resolveHref,
  VIEWS_PATH,
  isNewUser,
  markUserVisited,
  acknowledgeGate,
  checkNewUserGate,
  HAS_VISITED_KEY,
} from '../navigation.ts';
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

    it('does not append .html to static assets', () => {
      expect(resolveHref('logo.png')).toBe('/logo.png');
      expect(resolveHref('/logo.png')).toBe('/logo.png');
      expect(resolveHref('icon.svg')).toBe('/icon.svg');
      expect(resolveHref('./logo.png')).toBe('/logo.png');
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

    it('restores body opacity and pointerEvents when pageshow event fires', () => {
      document.body.style.opacity = '0';
      document.body.style.pointerEvents = 'none';

      window.dispatchEvent(new Event('pageshow'));

      expect(document.body.style.opacity).toBe('');
      expect(document.body.style.pointerEvents).toBe('');
      expect(document.body.classList.contains('booted')).toBe(true);
    });
  });

  describe('isNewUser', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it('returns false by default in test environment', () => {
      expect(isNewUser()).toBe(false);
    });

    it('returns true when ignoreTestEnv is true and no prior visits or auth exist', () => {
      expect(isNewUser(true)).toBe(true);
    });

    it('returns false when HAS_VISITED_KEY exists', () => {
      localStorage.setItem(HAS_VISITED_KEY, 'true');
      expect(isNewUser(true)).toBe(false);
    });

    it('returns false when a durable auth record exists', () => {
      localStorage.setItem(
        'tt_auth',
        JSON.stringify({ v: 1, uid: 'u1', anonymous: false, method: 'google', at: 1 })
      );
      expect(isNewUser(true)).toBe(false);
    });

    it('returns false when only a session-scoped auth record exists', () => {
      sessionStorage.setItem(
        'tt_auth',
        JSON.stringify({ v: 1, uid: null, anonymous: true, method: 'gate', at: 1 })
      );
      expect(isNewUser(true)).toBe(false);
    });

    it('ignores auth records written by an unknown schema version', () => {
      localStorage.setItem(
        'tt_auth',
        JSON.stringify({ v: 99, uid: 'u1', anonymous: false, method: 'google', at: 1 })
      );
      expect(isNewUser(true)).toBe(true);
    });

    it('ignores corrupt auth records instead of throwing', () => {
      localStorage.setItem('tt_auth', '{not json');
      expect(isNewUser(true)).toBe(true);
    });

    it('no longer infers a session from the legacy firebase:authUser key', () => {
      // Regression guard: that key is the Firebase v8 format; the modern SDK
      // persists in IndexedDB, so a localStorage probe can never match.
      localStorage.setItem('firebase:authUser:apiKey:[DEFAULT]', JSON.stringify({ uid: '123' }));
      expect(isNewUser(true)).toBe(true);
      expect(localStorage.getItem(HAS_VISITED_KEY)).toBeNull();
    });
  });

  describe('markUserVisited', () => {
    it('sets HAS_VISITED_KEY in localStorage', () => {
      localStorage.clear();
      markUserVisited();
      expect(localStorage.getItem(HAS_VISITED_KEY)).toBe('true');
    });
  });

  describe('acknowledgeGate', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it('writes a durable record when nothing is remembered', () => {
      acknowledgeGate();

      const record = JSON.parse(localStorage.getItem('tt_auth'));
      expect(record).toMatchObject({ v: 1, method: 'gate', anonymous: false });
      expect(sessionStorage.getItem('tt_auth')).toBeNull();
    });

    it('does not overwrite an existing auth record', () => {
      localStorage.setItem(
        'tt_auth',
        JSON.stringify({ v: 1, uid: 'u1', anonymous: false, method: 'google', at: 1 })
      );

      acknowledgeGate();

      expect(JSON.parse(localStorage.getItem('tt_auth')).method).toBe('google');
    });

    it('does not upgrade a session-only login to a durable one', () => {
      sessionStorage.setItem(
        'tt_auth',
        JSON.stringify({ v: 1, uid: 'u1', anonymous: false, method: 'google', at: 1 })
      );

      acknowledgeGate();

      expect(localStorage.getItem('tt_auth')).toBeNull();
    });

    it('does nothing when the legacy visit flag already exists', () => {
      localStorage.setItem(HAS_VISITED_KEY, 'true');

      acknowledgeGate();

      expect(localStorage.getItem('tt_auth')).toBeNull();
    });
  });

  describe('checkNewUserGate', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      delete window.location;
      window.location = {
        pathname: '/',
        search: '',
        hash: '',
        replace: vi.fn(),
        href: '',
      };
    });

    it('returns false if not a new user', () => {
      localStorage.setItem(HAS_VISITED_KEY, 'true');
      const redirected = checkNewUserGate(true);
      expect(redirected).toBe(false);
      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('returns false for a remembered login', () => {
      localStorage.setItem(
        'tt_auth',
        JSON.stringify({ v: 1, uid: 'u1', anonymous: false, method: 'google', at: 1 })
      );
      const redirected = checkNewUserGate(true);
      expect(redirected).toBe(false);
      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('does not redirect if already on login page', () => {
      window.location.pathname = '/login.html';
      const redirected = checkNewUserGate(true);
      expect(redirected).toBe(false);
      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('redirects new user on home page to /login.html without returnUrl', () => {
      window.location.pathname = '/';
      const redirected = checkNewUserGate(true);
      expect(redirected).toBe(true);
      expect(window.location.replace).toHaveBeenCalledWith('/login.html');
    });

    it('redirects new user with returnUrl if visiting deep link', () => {
      window.location.pathname = '/library.html';
      window.location.search = '?filter=myth';
      const redirected = checkNewUserGate(true);
      expect(redirected).toBe(true);
      expect(window.location.replace).toHaveBeenCalledWith(
        '/login.html?returnUrl=%2Flibrary.html%3Ffilter%3Dmyth'
      );
    });
  });
});
