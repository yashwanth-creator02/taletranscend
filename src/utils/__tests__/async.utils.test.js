// src/utils/__tests__/async.utils.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeAsync, safeCall, isOffline, guardOffline } from '../async.utils.ts';
import { showToast } from '@ui/components/toast.js';

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

describe('Async Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safeAsync', () => {
    it('returns result on success', async () => {
      const result = await safeAsync(Promise.resolve('ok'));
      expect(result).toBe('ok');
    });

    it('returns fallback and logs on error', async () => {
      const result = await safeAsync(Promise.reject('error'), { fallback: 'fail' });
      expect(result).toBe('fail');
      expect(showToast).not.toHaveBeenCalled();
    });

    it('shows toast on error if message provided', async () => {
      await safeAsync(Promise.reject('error'), { errorMessage: 'Oops' });
      expect(showToast).toHaveBeenCalledWith('Oops', 'error');
    });

    it('calls onError callback', async () => {
      const onError = vi.fn();
      await safeAsync(Promise.reject('error'), { onError });
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('safeCall', () => {
    it('is a wrapper for safeAsync', async () => {
      const result = await safeCall(Promise.resolve('ok'), 'fail');
      expect(result).toBe('ok');
    });
  });

  describe('isOffline', () => {
    it('returns true if navigator.onLine is false', () => {
      vi.stubGlobal('navigator', { onLine: false });
      expect(isOffline()).toBe(true);
    });
  });

  describe('guardOffline', () => {
    it('shows toast and returns true if offline', () => {
      vi.stubGlobal('navigator', { onLine: false });
      const result = guardOffline();
      expect(result).toBe(true);
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('offline'), 'warning');
    });

    it('returns false if online', () => {
      vi.stubGlobal('navigator', { onLine: true });
      const result = guardOffline();
      expect(result).toBe(false);
    });
  });
});
