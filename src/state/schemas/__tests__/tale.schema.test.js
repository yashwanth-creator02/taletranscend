import { describe, it, expect } from 'vitest';
import { createTale, createChapter } from '../tale.schema.js';

describe('createTale', () => {
  it('returns a tale with safe defaults when given empty data', () => {
    const tale = createTale('test-123', {});

    expect(tale.id).toBe('test-123');
    expect(tale.title).toBe('Untitled Tale');
    expect(tale.status).toBe('draft');
    expect(tale.chapterCount).toBe(0);
    expect(tale.tags).toEqual([]);
    expect(tale.createdAt).toBeInstanceOf(Date);
  });

  it('preserves provided values over defaults', () => {
    const tale = createTale('test-456', {
      title: 'The Ember Archive',
      status: 'published',
      chapterCount: 3,
      tags: ['fantasy', 'mystery'],
    });

    expect(tale.title).toBe('The Ember Archive');
    expect(tale.status).toBe('published');
    expect(tale.chapterCount).toBe(3);
    expect(tale.tags).toEqual(['fantasy', 'mystery']);
  });

  it('coerces numeric strings to numbers', () => {
    const tale = createTale('test-789', {
      chapterCount: '5',
      wordCount: '4200',
    });

    expect(tale.chapterCount).toBe(5);
    expect(tale.wordCount).toBe(4200);
  });
});

describe('createChapter', () => {
  it('returns chapter with safe defaults', () => {
    const chapter = createChapter('ch-1', {});

    expect(chapter.id).toBe('ch-1');
    expect(chapter.chapterNum).toBe(1);
    expect(chapter.title).toBe('Untitled Chapter');
    expect(chapter.content).toBe('');
  });
});
