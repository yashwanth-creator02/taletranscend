import { describe, it, expect } from 'vitest';
import { createDraft, createDraftChapter } from '../draft.schema.js';

describe('createDraft', () => {
  it('returns draft with safe defaults', () => {
    const draft = createDraft('draft-1', 'user-123');

    expect(draft.id).toBe('draft-1');
    expect(draft.userId).toBe('user-123');
    expect(draft.title).toBe('Untitled Draft');
    expect(draft.status).toBe('draft');
    expect(draft.chapters).toEqual([]);
    expect(draft.createdAt).toBeInstanceOf(Date);
  });

  it('merges provided data', () => {
    const draft = createDraft('draft-2', 'user-123', {
      title: 'My Story',
      synopsis: 'A great tale',
    });

    expect(draft.title).toBe('My Story');
    expect(draft.synopsis).toBe('A great tale');
  });
});

describe('createDraftChapter', () => {
  it('returns chapter with defaults', () => {
    const chapter = createDraftChapter('ch-1', 1);

    expect(chapter.id).toBe('ch-1');
    expect(chapter.chapterNum).toBe(1);
    expect(chapter.title).toBe('Chapter 1');
    expect(chapter.content).toBe('');
  });
});
