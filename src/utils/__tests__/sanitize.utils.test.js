import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeText } from '../sanitize.utils.ts';

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(input)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('removes script tags', () => {
    const input = '<script>alert("xss")</script><p>Safe content</p>';
    expect(sanitizeHtml(input)).toBe('<p>Safe content</p>');
  });

  it('removes event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(input)).not.toContain('onerror');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });
});

describe('escapeText', () => {
  it('escapes HTML entities', () => {
    expect(escapeText('<script>')).toBe('&lt;script&gt;');
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeText(null)).toBe('');
  });
});
