import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeTime, formatNumber } from '../format.utils.ts';

describe('formatDate', () => {
  it('formats a date string', () => {
    const date = new Date('2026-01-15T10:00:00Z');
    expect(formatDate(date)).toContain('2026');
  });

  it('handles string input', () => {
    expect(formatDate('2026-01-15')).toContain('2026');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent dates', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns days ago for older dates', () => {
    const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(daysAgo)).toContain('3');
  });
});

describe('formatNumber', () => {
  it('formats thousands with k', () => {
    expect(formatNumber(1500)).toBe('1.5k');
  });

  it('returns string for numbers under 1000', () => {
    expect(formatNumber(500)).toBe('500');
  });
});
