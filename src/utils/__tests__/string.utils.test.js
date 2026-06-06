import { describe, it, expect } from 'vitest';
import { escapeHtml, truncate, slugify } from '../string.utils.ts';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('truncate', () => {
  it('truncates long strings with ellipsis', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('returns original string if under limit', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });
});

describe('slugify', () => {
  it('converts to lowercase and replaces spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello @#$ World!')).toBe('hello-world');
  });
});
