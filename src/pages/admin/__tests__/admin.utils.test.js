// src/pages/admin/__tests__/admin.utils.test.js
import { describe, expect, it } from 'vitest';
import {
  adminInitials,
  adminModuleDescription,
  formatAdminCount,
  formatAdminDate,
  toAdminDate,
  truncateAdminText,
} from '../admin.utils.js';

describe('admin utils', () => {
  it('formats Dates, Firestore timestamps, numbers, and ISO strings', () => {
    expect(formatAdminDate(new Date(2024, 0, 5, 9, 7))).toBe('05 Jan 2024, 09:07');
    expect(
      formatAdminDate({
        toDate: () => new Date(2023, 10, 12, 18, 3),
      })
    ).toBe('12 Nov 2023, 18:03');
    expect(formatAdminDate('2022-03-01T04:05:00')).toBe('01 Mar 2022, 04:05');
  });

  it('returns an em dash for missing or invalid timestamps', () => {
    expect(formatAdminDate(null)).toBe('\u2014');
    expect(formatAdminDate(undefined)).toBe('\u2014');
    expect(formatAdminDate('not-a-date')).toBe('\u2014');
    expect(toAdminDate({})).toBeNull();
  });

  it('compacts counts without losing the four-digit range', () => {
    expect(formatAdminCount(0)).toBe('0');
    expect(formatAdminCount(999)).toBe('999');
    expect(formatAdminCount(1500)).toBe('1.5k');
    expect(formatAdminCount(9999)).toBe('10.0k');
    expect(formatAdminCount(12000)).toBe('12k');
    expect(formatAdminCount(2_400_000)).toBe('2.4m');
    expect(formatAdminCount(Number.NaN)).toBe('\u2014');
  });

  it('truncates long text and trims whitespace', () => {
    expect(truncateAdminText('  short  ')).toBe('short');
    expect(truncateAdminText('abcdefghij', 5)).toBe('abcd\u2026');
    expect(truncateAdminText(null)).toBe('');
  });

  it('derives initials and falls back to the archive mark', () => {
    expect(adminInitials('Moderator')).toBe('M');
    expect(adminInitials('Archive Control')).toBe('AC');
    expect(adminInitials('')).toBe('TT');
  });

  it('describes every dashboard module with a non-empty string', () => {
    for (const id of [
      'overview',
      'users',
      'content',
      'deletions',
      'reports',
      'comments',
      'applications',
      'audit',
      'author',
      'unknown',
    ]) {
      expect(adminModuleDescription(id).length).toBeGreaterThan(10);
    }
  });
});
