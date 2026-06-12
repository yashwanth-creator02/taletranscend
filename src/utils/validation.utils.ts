// src/utils/validation.utils.ts
import { z } from 'zod';

/**
 * Common regex patterns
 */
export const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;

/* ─────────────────────────────────────────────
   Comment Validation
   ───────────────────────────────────────────── */

export const CommentSchema = z.object({
  taleId: z.string().min(1, 'Tale ID is required'),
  text: z.string().min(1, 'Echo cannot be empty').max(5000, 'Echo is too long (max 5000 chars)'),
  type: z.enum(['general', 'chapter']),
  chapterIndex: z.number().nullable().optional(),
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().min(1, 'Author Name is required'),
  authorAvatarUrl: z.string().optional(),
  parentId: z.string().nullable().optional(),
  depth: z.number().min(0).max(5, 'Echo nesting is too deep'),
});

/* ─────────────────────────────────────────────
   Draft Validation
   ───────────────────────────────────────────── */

export const DraftMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  synopsis: z.string().max(2000, 'Synopsis is too long'),
  coverUrl: z.string().url().or(z.string().length(0)).optional(),
  era: z.string().max(100).optional(),
  tags: z.array(z.string()).max(10, 'Too many tags'),
  tone: z.string().max(50),
  language: z.string().max(50),
  visibility: z.enum(['public', 'unlisted', 'private']).optional().default('public'),
  audience: z.enum(['General', 'Mature', 'Young Adult']).optional().default('General'),
  contentWarnings: z.string().max(500).optional(),
  worldSetting: z.string().max(2000).optional(),
  authorNotes: z.string().max(2000).optional(),
  chapterCount: z.number().min(0),
  wordCount: z.number().min(0),
});

export const DraftChapterSchema = z.object({
  chapterNum: z.number().min(1),
  title: z.string().min(1, 'Chapter title is required').max(200),
  content: z.string().max(100000, 'Chapter is too long (max 100k chars)'),
  wordCount: z.number().min(0),
});

export const TaleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  authorAvatarUrl: z.string().optional(),
  description: z.string().max(1000),
  synopsis: z.string().max(2000),
  coverUrl: z.string().url().or(z.string().length(0)).optional(),
  era: z.string().max(100).optional(),
  tags: z.array(z.string()).max(10),
  tone: z.string().max(50),
  language: z.string().max(50),
  visibility: z.enum(['public', 'unlisted', 'private']).optional().default('public'),
  audience: z.enum(['General', 'Mature', 'Young Adult']).optional().default('General'),
  contentWarnings: z.array(z.string()).max(20).optional(),
  worldSetting: z.string().max(2000).optional(),
  authorNotes: z.string().max(2000).optional(),
  chapterCount: z.number().min(1, 'At least one chapter is required'),
  wordCount: z.number().min(0),
  estimatedReadMins: z.number().min(0),
  readCount: z.number().optional().default(0),
  commentCount: z.number().optional().default(0),
  reactionCount: z.number().optional().default(0),
  bookmarkCount: z.number().optional().default(0),
  status: z.enum(['draft', 'pending', 'published', 'rejected']).optional().default('draft'),
  isFeatured: z.boolean().optional().default(false),
  isEditorsPick: z.boolean().optional().default(false),
  searchKeywords: z.array(z.string()).max(50),
});

export const UserProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  bio: z.string().max(1000).optional(),
  pronouns: z.string().max(50).optional(),
  avatarUrl: z.string().url().or(z.string().length(0)).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().or(z.string().length(0)).optional(),
  twitterHandle: z.string().max(100).optional(),
  instagramHandle: z.string().max(100).optional(),
  readingGoal: z.number().min(0).max(1000).optional().default(30),
  favouriteGenres: z.array(z.string()).max(10).optional(),
});

/**
 * Generic validation helper
 */
export function validateData<T>(
  schema: z.Schema<T>,
  data: any
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  // result.error is a ZodError
  const firstIssue = result.error.issues[0];
  const error = firstIssue
    ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
    : 'Validation failed';
  return { success: false, error };
}
