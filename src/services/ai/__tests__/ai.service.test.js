// src/services/ai/__tests__/ai.service.test.js
//
// FIX (docs/MIGRATION_PLAN.md Phase 6.6): the original version of this test
// used REAL timers for the retry/backoff tests, one of which took 14+
// seconds — flagged in the original repo audit as a test-hygiene problem.
// This version uses vi.useFakeTimers() instead, fixing that properly rather
// than just moving the slowness somewhere else.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockEnsureApiKey = vi.fn();

vi.mock('@shared/components/apiKeyModal/apiKeyModal.js', () => ({
  ensureApiKey: (...args) => mockEnsureApiKey(...args),
}));

const { suggestTitle, refineMythicText, suggestName } = await import('../ai.service.js');

function mockFetchResponse(overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'Mocked AI response' }] } }],
    }),
    ...overrides,
  };
}

describe('ai.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEnsureApiKey.mockReset();
    mockEnsureApiKey.mockResolvedValue('fake-api-key');
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('input guards', () => {
    it('suggestTitle returns null for a too-short prompt without ever checking for a key', async () => {
      expect(await suggestTitle('short')).toBeNull();
      expect(mockEnsureApiKey).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('refineMythicText returns null for too-short text', async () => {
      expect(await refineMythicText('too short')).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('suggestName returns null for a too-short bio', async () => {
      expect(await suggestName('hi')).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('API key handling', () => {
    it('returns null without calling fetch if the user cancels the key prompt', async () => {
      mockEnsureApiKey.mockResolvedValue(null);
      const result = await suggestTitle('A long enough synopsis to pass the guard.');
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('sends the stored/entered key as a query param', async () => {
      fetch.mockResolvedValue(mockFetchResponse());
      await suggestTitle('A long enough synopsis to pass the guard.');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('key=fake-api-key'),
        expect.any(Object)
      );
    });
  });

  describe('successful responses', () => {
    it('suggestTitle returns the parsed text', async () => {
      fetch.mockResolvedValue(mockFetchResponse());
      const result = await suggestTitle('A long enough synopsis to pass the guard.');
      expect(result).toBe('Mocked AI response');
    });

    it('refineMythicText returns the parsed text', async () => {
      fetch.mockResolvedValue(mockFetchResponse());
      const result = await refineMythicText('This paragraph is definitely long enough to pass.');
      expect(result).toBe('Mocked AI response');
    });

    it('suggestName returns the parsed text', async () => {
      fetch.mockResolvedValue(mockFetchResponse());
      const result = await suggestName('A wandering chronicler of forgotten myths.');
      expect(result).toBe('Mocked AI response');
    });

    it('returns null if Gemini responds with no usable text', async () => {
      fetch.mockResolvedValue(mockFetchResponse({ json: async () => ({ candidates: [] }) }));
      const result = await suggestTitle('A long enough synopsis to pass the guard.');
      expect(result).toBeNull();
    });
  });

  describe('retry behavior (fake timers)', () => {
    it('retries on 429 and succeeds on the next attempt', async () => {
      fetch
        .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
        .mockResolvedValueOnce(mockFetchResponse());

      const promise = suggestTitle('A long enough synopsis to pass the guard.');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('Mocked AI response');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 5xx errors', async () => {
      fetch
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable' })
        .mockResolvedValueOnce(mockFetchResponse());

      const promise = suggestTitle('A long enough synopsis to pass the guard.');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('Mocked AI response');
    });

    it('gives up and returns null after exhausting retries', async () => {
      fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error' });

      const promise = suggestTitle('A long enough synopsis to pass the guard.');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
      // Initial attempt + 3 retries = 4 calls total
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('does NOT retry on 401 (invalid key) — retrying a bad key wastes the user\u2019s quota for nothing', async () => {
      fetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });

      const promise = suggestTitle('A long enough synopsis to pass the guard.');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 403 (revoked/forbidden key)', async () => {
      fetch.mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });

      const promise = suggestTitle('A long enough synopsis to pass the guard.');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on a network error (fetch throws)', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockFetchResponse());

      const promise = suggestTitle('A long enough synopsis to pass the guard.');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('Mocked AI response');
    });
  });
});
