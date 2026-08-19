// src/services/ai/__tests__/apiKey.storage.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredApiKey, hasApiKey, setApiKey, clearApiKey } from '../apiKey.storage.js';

describe('apiKey.storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStoredApiKey', () => {
    it('returns null when nothing is stored', () => {
      expect(getStoredApiKey()).toBeNull();
    });

    it('returns the stored key', () => {
      setApiKey('my-test-key');
      expect(getStoredApiKey()).toBe('my-test-key');
    });
  });

  describe('hasApiKey', () => {
    it('returns false when nothing is stored', () => {
      expect(hasApiKey()).toBe(false);
    });

    it('returns true once a key is stored', () => {
      setApiKey('my-test-key');
      expect(hasApiKey()).toBe(true);
    });

    it('returns false for a whitespace-only stored value', () => {
      localStorage.setItem('taletranscend:gemini_api_key', '   ');
      expect(hasApiKey()).toBe(false);
    });
  });

  describe('setApiKey', () => {
    it('stores a trimmed key', () => {
      setApiKey('  my-test-key  ');
      expect(getStoredApiKey()).toBe('my-test-key');
    });

    it('throws for an empty string', () => {
      expect(() => setApiKey('')).toThrow();
    });

    it('throws for a whitespace-only string', () => {
      expect(() => setApiKey('   ')).toThrow();
    });

    it('throws for a non-string value', () => {
      expect(() => setApiKey(null)).toThrow();
      expect(() => setApiKey(undefined)).toThrow();
      expect(() => setApiKey(123)).toThrow();
    });
  });

  describe('clearApiKey', () => {
    it('removes a previously stored key', () => {
      setApiKey('my-test-key');
      clearApiKey();
      expect(getStoredApiKey()).toBeNull();
    });

    it('does not throw when called with nothing stored', () => {
      expect(() => clearApiKey()).not.toThrow();
    });
  });
});
