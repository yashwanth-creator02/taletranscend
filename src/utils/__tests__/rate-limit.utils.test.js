// src/utils/__tests__/rate-limit.utils.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, resetRateLimit, getRemainingTime } from '../rate-limit.utils.ts';

describe('RateLimit Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Since _lastActionTimes is a module-level constant, we need to reset it
    // or use unique keys. I'll use unique keys and reset explicitly if needed.
    resetRateLimit('test-key');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first action', () => {
    expect(checkRateLimit('test-key', 1000)).toBe(true);
  });

  it('blocks subsequent actions within cooldown', () => {
    checkRateLimit('test-key', 1000);
    expect(checkRateLimit('test-key', 1000)).toBe(false);
  });

  it('allows actions after cooldown expires', () => {
    checkRateLimit('test-key', 1000);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit('test-key', 1000)).toBe(true);
  });

  it('can reset rate limit', () => {
    checkRateLimit('test-key', 1000);
    resetRateLimit('test-key');
    expect(checkRateLimit('test-key', 1000)).toBe(true);
  });

  it('returns 0 remaining time if not set', () => {
    expect(getRemainingTime('new-key', 1000)).toBe(0);
  });

  it('returns correct remaining time within cooldown', () => {
    checkRateLimit('test-key', 1000);
    vi.advanceTimersByTime(400);
    expect(getRemainingTime('test-key', 1000)).toBe(600);
  });

  it('returns 0 remaining time after cooldown expires', () => {
    checkRateLimit('test-key', 1000);
    vi.advanceTimersByTime(1500);
    expect(getRemainingTime('test-key', 1000)).toBe(0);
  });
});
