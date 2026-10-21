// src/services/__tests__/auth-memory.storage.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AUTH_MEMORY_KEY,
  AUTH_MEMORY_VERSION,
  HAS_VISITED_KEY,
  clearAuthMemory,
  getAuthMemory,
  hasAuthMemory,
  isRememberedDurably,
  rememberAuth,
} from '../auth-memory.storage.js';

describe('auth-memory.storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('rememberAuth', () => {
    it('writes a versioned durable record by default', () => {
      const written = rememberAuth({ uid: 'u1', anonymous: false, method: 'google' });

      expect(written.scope).toBe('local');
      expect(JSON.parse(localStorage.getItem(AUTH_MEMORY_KEY))).toMatchObject({
        v: AUTH_MEMORY_VERSION,
        uid: 'u1',
        anonymous: false,
        method: 'google',
      });
      expect(sessionStorage.getItem(AUTH_MEMORY_KEY)).toBeNull();
    });

    it('writes a session-scoped record when not durable', () => {
      const written = rememberAuth(
        { uid: 'u2', anonymous: true, method: 'guest' },
        {
          durable: false,
        }
      );

      expect(written.scope).toBe('session');
      expect(JSON.parse(sessionStorage.getItem(AUTH_MEMORY_KEY))).toMatchObject({
        uid: 'u2',
        anonymous: true,
        method: 'guest',
      });
      expect(localStorage.getItem(AUTH_MEMORY_KEY)).toBeNull();
    });

    it('clears the other storage area so the two cannot disagree', () => {
      rememberAuth({ uid: 'old' }, { durable: false });
      rememberAuth({ uid: 'new' }, { durable: true });

      expect(JSON.parse(localStorage.getItem(AUTH_MEMORY_KEY)).uid).toBe('new');
      expect(sessionStorage.getItem(AUTH_MEMORY_KEY)).toBeNull();
    });

    it('defaults missing fields instead of writing undefined', () => {
      const written = rememberAuth();

      expect(written.uid).toBeNull();
      expect(written.anonymous).toBe(false);
      expect(written.method).toBe('unknown');
      expect(typeof written.at).toBe('number');
    });
  });

  describe('getAuthMemory', () => {
    it('returns null when nothing is remembered', () => {
      expect(getAuthMemory()).toBeNull();
      expect(hasAuthMemory()).toBe(false);
    });

    it('prefers the durable record over the session one', () => {
      rememberAuth({ uid: 'session-user' }, { durable: false });
      rememberAuth({ uid: 'durable-user' }, { durable: true });

      expect(getAuthMemory()).toMatchObject({ uid: 'durable-user', scope: 'local' });
    });

    it('reads a session record when no durable one exists', () => {
      rememberAuth({ uid: 'session-user' }, { durable: false });

      expect(getAuthMemory()).toMatchObject({ uid: 'session-user', scope: 'session' });
      expect(hasAuthMemory()).toBe(true);
    });

    it('treats corrupt JSON as absent', () => {
      localStorage.setItem(AUTH_MEMORY_KEY, '{not json');
      expect(getAuthMemory()).toBeNull();
    });

    it('treats a record from an unknown version as absent', () => {
      localStorage.setItem(AUTH_MEMORY_KEY, JSON.stringify({ v: 99, uid: 'u1' }));
      expect(getAuthMemory()).toBeNull();
    });

    it('treats a non-object record as absent', () => {
      localStorage.setItem(AUTH_MEMORY_KEY, '"a string"');
      expect(getAuthMemory()).toBeNull();
    });
  });

  describe('isRememberedDurably', () => {
    it('defaults to true when nothing is remembered', () => {
      expect(isRememberedDurably()).toBe(true);
    });

    it('reports a durable record as durable', () => {
      rememberAuth({ uid: 'u1', method: 'google' });
      expect(isRememberedDurably()).toBe(true);
    });

    it('reports a session-only record as not durable', () => {
      rememberAuth({ uid: 'u1', method: 'google' }, { durable: false });
      expect(isRememberedDurably()).toBe(false);
    });

    it('honours the fallback when nothing is remembered', () => {
      expect(isRememberedDurably(false)).toBe(false);
    });
  });

  describe('clearAuthMemory', () => {
    it('clears both scopes and the legacy visit flag by default', () => {
      // Seeded directly: rememberAuth() would clear the other area itself.
      localStorage.setItem(
        AUTH_MEMORY_KEY,
        JSON.stringify({ v: AUTH_MEMORY_VERSION, uid: 'u1', method: 'google', at: 1 })
      );
      sessionStorage.setItem(
        AUTH_MEMORY_KEY,
        JSON.stringify({ v: AUTH_MEMORY_VERSION, uid: 'u1', method: 'google', at: 1 })
      );
      localStorage.setItem(HAS_VISITED_KEY, 'true');

      clearAuthMemory();

      expect(localStorage.getItem(AUTH_MEMORY_KEY)).toBeNull();
      expect(sessionStorage.getItem(AUTH_MEMORY_KEY)).toBeNull();
      expect(localStorage.getItem(HAS_VISITED_KEY)).toBeNull();
    });

    it('keeps the session record when only the durable scope is cleared', () => {
      localStorage.setItem(
        AUTH_MEMORY_KEY,
        JSON.stringify({ v: AUTH_MEMORY_VERSION, uid: 'u1', method: 'google', at: 1 })
      );
      sessionStorage.setItem(
        AUTH_MEMORY_KEY,
        JSON.stringify({ v: AUTH_MEMORY_VERSION, uid: 'u1', method: 'google', at: 1 })
      );
      localStorage.setItem(HAS_VISITED_KEY, 'true');

      clearAuthMemory({ session: false });

      expect(localStorage.getItem(AUTH_MEMORY_KEY)).toBeNull();
      expect(localStorage.getItem(HAS_VISITED_KEY)).toBeNull();
      expect(sessionStorage.getItem(AUTH_MEMORY_KEY)).not.toBeNull();
    });

    it('clears a session-only record when the session scope is cleared', () => {
      rememberAuth({ uid: 'u1' }, { durable: false });

      clearAuthMemory();

      expect(sessionStorage.getItem(AUTH_MEMORY_KEY)).toBeNull();
    });
  });

  describe('when storage refuses the write', () => {
    it('returns null and leaves the existing memory untouched', () => {
      localStorage.setItem(
        AUTH_MEMORY_KEY,
        JSON.stringify({ v: AUTH_MEMORY_VERSION, uid: 'existing', method: 'gate', at: 1 })
      );
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const written = rememberAuth({ uid: 'new' }, { durable: true });

      expect(written).toBeNull();
      // Losing the previous memory entirely would bounce a just-signed-in
      // visitor straight back to the login gate, so it must survive.
      expect(JSON.parse(localStorage.getItem(AUTH_MEMORY_KEY)).uid).toBe('existing');
      expect(setItem).toHaveBeenCalled();
    });

    it('reports that nothing is remembered', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(rememberAuth({ uid: 'new' })).toBeNull();
      expect(getAuthMemory()).toBeNull();
    });
  });
});
