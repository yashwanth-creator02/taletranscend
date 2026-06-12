// src/utils/__tests__/function.utils.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, once } from '../function.utils.ts';

describe('Function Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('debounces a function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('throttles a function', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('once', () => {
    it('only executes once', () => {
      const fn = vi.fn((x) => x * 2);
      const single = once(fn);

      expect(single(2)).toBe(4);
      expect(single(3)).toBe(4);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
