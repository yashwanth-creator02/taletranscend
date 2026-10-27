// src/utils/__tests__/error-navigation.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ERROR_CONTEXT_KEY,
  classifyError,
  clearErrorContext,
  describeError,
  errorPagePath,
  getErrorCodeFromPath,
  isErrorPagePath,
  navigateToErrorPage,
  readErrorContext,
  routeError,
} from '../error-navigation.ts';

function installLocation(pathname = '/library.html', search = '') {
  delete window.location;
  window.location = {
    pathname,
    search,
    href: `http://localhost:3000${pathname}${search}`,
    origin: 'http://localhost:3000',
    replace: vi.fn(),
    assign: vi.fn(),
  };
  return window.location;
}

describe('error navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T10:00:00Z'));
    sessionStorage.clear();
    installLocation();
    vi.stubGlobal('navigator', { ...navigator, onLine: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  describe('paths', () => {
    it.each([
      ['/400', 400],
      ['/401.html', 401],
      ['/403/', 403],
      ['/404?from=library', 404],
      ['/500', 500],
      ['/504/', 504],
    ])('reads %s as %i', (pathname, expected) => {
      expect(getErrorCodeFromPath(pathname)).toBe(expected);
      expect(isErrorPagePath(pathname)).toBe(true);
    });

    it.each(['/', '/403x', '/tales/403', '/reader.html', '', '/999'])(
      'rejects %s as an error page',
      (pathname) => {
        expect(getErrorCodeFromPath(pathname)).toBeNull();
        expect(isErrorPagePath(pathname)).toBe(false);
      }
    );

    it('maps every supported code to its html page', () => {
      expect(errorPagePath(403)).toBe('/403.html');
      expect(errorPagePath(999)).toBe('/500.html');
    });
  });

  describe('classifyError', () => {
    it('maps Firebase permission failures to 403', () => {
      expect(classifyError({ code: 'permission-denied' })).toBe(403);
      expect(classifyError({ code: 'firestore/permission-denied' })).toBe(403);
    });

    it('maps auth failures and rate limits', () => {
      expect(classifyError({ code: 'auth/unauthenticated' })).toBe(401);
      expect(classifyError({ code: 'resource-exhausted' })).toBe(429);
      expect(classifyError({ code: 'too-many-requests' })).toBe(429);
    });

    it('reads HTTP status from the error or its response', () => {
      expect(classifyError({ status: 502 })).toBe(502);
      expect(classifyError({ response: { status: 504 } })).toBe(504);
    });

    it('maps chunk load failures to 500', () => {
      expect(classifyError({ name: 'ChunkLoadError', message: 'Loading chunk 42 failed' })).toBe(
        500
      );
      expect(
        classifyError({ name: 'TypeError', message: 'Failed to fetch dynamically imported module' })
      ).toBe(500);
    });

    it('maps network failures to 503', () => {
      expect(classifyError(new TypeError('Failed to fetch'))).toBe(503);
    });

    it('ignores cancellations', () => {
      expect(classifyError({ name: 'AbortError' })).toBeNull();
      expect(classifyError({ code: 'cancelled' })).toBeNull();
    });

    it('uses a fallback only when asked', () => {
      expect(classifyError(new Error('boom'))).toBeNull();
      expect(classifyError(new Error('boom'), { fallback: 500 })).toBe(500);
    });

    it('describes errors without leaking messages', () => {
      expect(describeError({ code: 'permission-denied' })).toBe('permission-denied');
      expect(describeError({ status: 503 })).toBe('HTTP 503');
      expect(describeError(new TypeError('secret detail'))).toBe('TypeError');
      expect(describeError(new Error('secret detail'))).toBeUndefined();
    });
  });

  describe('navigateToErrorPage', () => {
    it('stores context and replaces the current entry', () => {
      const location = installLocation('/library.html', '?page=2');

      expect(navigateToErrorPage(503, { reason: 'unavailable' })).toBe(true);

      expect(location.replace).toHaveBeenCalledWith('/503.html');
      expect(readErrorContext()).toMatchObject({
        code: 503,
        source: '/library.html?page=2',
        reason: 'unavailable',
        createdAt: Date.now(),
      });
    });

    it('refuses to redirect from an error page', () => {
      const location = installLocation('/403');

      expect(navigateToErrorPage(500)).toBe(false);
      expect(location.replace).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(ERROR_CONTEXT_KEY)).toBeNull();
    });

    it('drops unsafe source paths', () => {
      navigateToErrorPage(403, { source: '//evil.example/path' });

      expect(readErrorContext().source).toBe('/');
    });

    it('routes known errors through routeError', () => {
      const location = installLocation('/tale.html', '?id=abc');

      expect(routeError({ code: 'permission-denied' })).toBe(403);
      expect(location.replace).toHaveBeenCalledWith('/403.html');
      expect(readErrorContext().source).toBe('/tale.html?id=abc');
    });

    it('does not route unclassified errors without a fallback', () => {
      const location = installLocation('/toc.html');

      expect(routeError(new Error('boom'))).toBeNull();
      expect(location.replace).not.toHaveBeenCalled();
    });
  });

  describe('readErrorContext', () => {
    it('rejects and removes expired context', () => {
      navigateToErrorPage(500);
      vi.advanceTimersByTime(6 * 60 * 1000);

      expect(readErrorContext()).toBeNull();
      expect(sessionStorage.getItem(ERROR_CONTEXT_KEY)).toBeNull();
    });

    it('clears context on demand', () => {
      navigateToErrorPage(500);
      clearErrorContext();

      expect(readErrorContext()).toBeNull();
    });

    it('rejects malformed context', () => {
      sessionStorage.setItem(ERROR_CONTEXT_KEY, '{"code":"403"}');

      expect(readErrorContext()).toBeNull();
      expect(sessionStorage.getItem(ERROR_CONTEXT_KEY)).toBeNull();
    });
  });
});
