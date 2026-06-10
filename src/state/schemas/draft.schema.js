// src/state/schemas/draft.schema.js
// Canonical shape for draft documents and their chapters.
// users/{uid}/drafts/{draftId} and .../chapters/{index}
// Mirrors the public tale schema with added isDirty tracking fields.

/* ─────────────────────────────────────────────
   Draft — users/{uid}/drafts/{draftId}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} Draft
 * @property {string}   id               - Firestore document ID, or 'new' before first save
 * @property {string}   title
 * @property {string}   synopsis
 * @property {string}   coverUrl
 * @property {string}   era
 * @property {string[]} tags
 * @property {string}   tone
 * @property {string}   language
 * @property {string}   visibility       - 'public' | 'unlisted'
 * @property {string}   audience         - 'General' | 'Mature' | 'Young Adult'
 * @property {string[]} contentWarnings
 * @property {string}   worldSetting
 * @property {string}   authorNotes
 * @property {number}   chapterCount
 * @property {number}   wordCount
 * @property {boolean}  isDirty          - True if unsaved local changes exist
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 */

/**
 * @param {string} id
 * @param {string} userId
 * @param {Partial<Draft>} data
 * @returns {Draft}
 */
export function createDraft(id, userId, data = {}) {
  return {
    id,
    userId,
    title: data.title || 'Untitled Draft',
    synopsis: data.synopsis ?? '',
    coverUrl: data.coverUrl ?? '',
    era: data.era ?? '',
    tags: data.tags ?? [],
    tone: data.tone ?? 'Mythic',
    language: data.language ?? 'English',
    visibility: data.visibility ?? 'public',
    audience: data.audience ?? 'General',
    contentWarnings: data.contentWarnings ?? [],
    worldSetting: data.worldSetting ?? '',
    authorNotes: data.authorNotes ?? '',
    chapterCount: Number(data.chapterCount ?? 0),
    wordCount: Number(data.wordCount ?? 0),
    status: data.status ?? 'draft',
    isDirty: data.isDirty ?? false,
    updatedAt: data.updatedAt ?? null,
    createdAt: data.createdAt
      ? data.createdAt.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt)
      : new Date(),
    chapters: data.chapters ?? [],
  };
}

/* ─────────────────────────────────────────────
   Draft Chapter — drafts/{draftId}/chapters/{index}
   ───────────────────────────────────────────── */

/**
 * @typedef {Object} DraftChapter
 * @property {string} id             - Document ID (string index, e.g. "0", "1")
 * @property {number} chapterNum     - Human-facing chapter number (1-based)
 * @property {string} title
 * @property {string} content
 * @property {number} wordCount
 * @property {import('firebase/firestore').Timestamp|null} updatedAt
 */

/**
 * @param {string} id
 * @param {number} chapterNum
 * @param {Partial<DraftChapter>} data
 * @returns {DraftChapter}
 */
export function createDraftChapter(id, chapterNum, data = {}) {
  return {
    id,
    chapterNum: chapterNum ?? data.chapterNum ?? Number(id) + 1,
    title: data.title || `Chapter ${chapterNum}`,
    content: data.content ?? '',
    wordCount: Number(data.wordCount ?? 0),
    updatedAt: data.updatedAt ?? null,
  };
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Strips client-only fields (id, isDirty) before writing a draft to Firestore.
 *
 * @param {Draft} draft
 * @returns {Object}
 */
export function draftToFirestore(draft) {
  const data = { ...draft };
  delete data.id;
  delete data.isDirty;
  return data;
}

/**
 * Strips client-only fields (id) before writing a draft chapter to Firestore.
 *
 * @param {DraftChapter} chapter
 * @returns {Object}
 */
export function draftChapterToFirestore(chapter) {
  const data = { ...chapter };
  delete data.id;
  return data;
}
