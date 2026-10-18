// src/utils/__tests__/sanitize.utils.test.js
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../sanitize.utils.ts';

describe('Sanitize Utils', () => {
  describe('sanitizeHtml', () => {
    it('removes scripts and event handlers', () => {
      const dirty = '<p>Hello <script>alert(1)</script><img src="x" onerror="alert(2)"></p>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onerror');
      expect(clean).toContain('<p>Hello <img src="x"></p>');
    });

    it('allows safe tags', () => {
      const dirty = '<h1>Title</h1><p>Paragraph with <b>bold</b> and <i>italics</i></p>';
      const clean = sanitizeHtml(dirty);
      expect(clean).toBe(dirty);
    });

    it('handles empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null)).toBe('');
    });
  });
});
