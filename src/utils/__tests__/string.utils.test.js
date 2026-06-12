// src/utils/__tests__/string.utils.test.js
import { describe, it, expect, vi } from 'vitest';
import {
  escapeHtml,
  countWords,
  estimateReadMins,
  formatMs,
  getAvatarUrl,
  truncate,
  slugify,
} from '../string.utils.ts';

vi.mock('@config/app.config.js', () => ({
  WORDS_PER_MINUTE: 200,
  MS_PER_MINUTE: 60000,
  DICEBEAR_BASE_URL: 'https://avatars.dicebear.com/api/pixel-art',
}));

describe('String Utils', () => {
  describe('escapeHtml', () => {
    it('escapes special characters', () => {
      expect(escapeHtml('<b>"Me & You"</b>')).toBe('&lt;b&gt;&quot;Me &amp; You&quot;&lt;/b&gt;');
    });

    it('handles null/undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('countWords', () => {
    it('counts words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('  Extra   spaces  ')).toBe(2);
    });

    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });
  });

  describe('estimateReadMins', () => {
    it('calculates minutes based on word count', () => {
      expect(estimateReadMins(400)).toBe(2); // 400 / 200 = 2
      expect(estimateReadMins(100)).toBe(1); // 100 / 200 = 0.5 -> 1
    });

    it('always returns at least 1', () => {
      expect(estimateReadMins(0)).toBe(1);
    });
  });

  describe('formatMs', () => {
    it('formats ms into minutes string', () => {
      expect(formatMs(120000)).toBe('2m read');
    });

    it('returns empty string for less than 1 minute', () => {
      expect(formatMs(30000)).toBe('');
    });
  });

  describe('getAvatarUrl', () => {
    it('returns dicebear URL with seed', () => {
      expect(getAvatarUrl('user12345678')).toContain('seed=user1234');
    });

    it('uses "anon" if uid is missing', () => {
      expect(getAvatarUrl(null)).toContain('seed=anon');
    });
  });

  describe('truncate', () => {
    it('truncates text with ellipsis', () => {
      expect(truncate('Hello world', 5)).toBe('Hello...');
    });

    it('does not truncate if shorter than limit', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });
  });

  describe('slugify', () => {
    it('converts text to slug', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
      expect(slugify('  Spaced   Out  ')).toBe('spaced-out');
    });
  });
});
