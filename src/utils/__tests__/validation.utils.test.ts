// src/utils/__tests__/validation.utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  CommentSchema,
  DraftMetadataSchema,
  DraftChapterSchema,
  TaleSchema,
  UserProfileSchema,
  validateData,
} from '../validation.utils.ts';

describe('Validation Utils', () => {
  describe('CommentSchema', () => {
    const validComment = {
      taleId: 't1',
      text: 'Great tale!',
      type: 'general',
      authorId: 'u1',
      authorName: 'Scribe',
      depth: 0,
    };

    it('validates a correct comment', () => {
      const result = validateData(CommentSchema, validComment);
      expect(result.success).toBe(true);
    });

    it('rejects empty text', () => {
      const result = validateData(CommentSchema, { ...validComment, text: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('cannot be empty');
      }
    });

    it('rejects too long text', () => {
      const result = validateData(CommentSchema, { ...validComment, text: 'a'.repeat(5001) });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('too long');
      }
    });

    it('rejects too deep nesting', () => {
      const result = validateData(CommentSchema, { ...validComment, depth: 6 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('too deep');
      }
    });
  });

  describe('DraftMetadataSchema', () => {
    const validMetadata = {
      title: 'Legend of the Roots',
      synopsis: 'A deep dive into history.',
      coverUrl: 'https://example.com/cover.jpg',
      era: 'Ancient',
      tags: ['History', 'Culture'],
      tone: 'Mythic',
      language: 'English',
      visibility: 'public',
      audience: 'General',
      chapterCount: 1,
      wordCount: 500,
    };

    it('validates correct metadata', () => {
      const result = validateData(DraftMetadataSchema, validMetadata);
      expect(result.success).toBe(true);
    });

    it('rejects missing title', () => {
      const result = validateData(DraftMetadataSchema, { ...validMetadata, title: '' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid URL', () => {
      const result = validateData(DraftMetadataSchema, { ...validMetadata, coverUrl: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });

  describe('DraftChapterSchema', () => {
    const validChapter = {
      chapterNum: 1,
      title: 'The Beginning',
      content: 'Once upon a time...',
      wordCount: 4,
    };

    it('validates correct chapter', () => {
      const result = validateData(DraftChapterSchema, validChapter);
      expect(result.success).toBe(true);
    });

    it('rejects missing chapter title', () => {
      const result = validateData(DraftChapterSchema, { ...validChapter, title: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('TaleSchema', () => {
    const validTale = {
      title: 'Legend of the Roots',
      authorId: 'u1',
      authorName: 'Scribe',
      description: 'A tale of history.',
      synopsis: 'A deep dive.',
      tags: ['History'],
      tone: 'Mythic',
      language: 'English',
      searchKeywords: ['legend'],
      chapterCount: 1,
      wordCount: 500,
      estimatedReadMins: 5,
    };

    it('validates correct tale', () => {
      const result = validateData(TaleSchema, validTale);
      expect(result.success).toBe(true);
    });

    it('rejects missing authorId', () => {
      const result = validateData(TaleSchema, { ...validTale, authorId: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('UserProfileSchema', () => {
    const validProfile = {
      name: 'Yash',
      bio: 'Lover of tales.',
      readingGoal: 50,
    };

    it('validates correct profile', () => {
      const result = validateData(UserProfileSchema, validProfile);
      expect(result.success).toBe(true);
    });

    it('rejects invalid website URL', () => {
      const result = validateData(UserProfileSchema, { ...validProfile, website: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });
});
