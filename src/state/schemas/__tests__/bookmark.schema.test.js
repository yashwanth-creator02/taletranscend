import { describe, it, expect } from 'vitest';
import { createBookmark } from '../bookmark.schema.js';

describe('createBookmark', () => {
  it('returns bookmark with required fields', () => {
    const bookmark = createBookmark('user-1', 'tale-1');

    expect(bookmark.userId).toBe('user-1');
    expect(bookmark.taleId).toBe('tale-1');
    expect(bookmark.createdAt).toBeInstanceOf(Date);
  });

  it('includes optional tale metadata', () => {
    const bookmark = createBookmark('user-1', 'tale-1', {
      title: 'The Ember Archive',
      coverUrl: 'https://example.com/cover.jpg',
    });

    expect(bookmark.title).toBe('The Ember Archive');
    expect(bookmark.coverUrl).toBe('https://example.com/cover.jpg');
  });
});
