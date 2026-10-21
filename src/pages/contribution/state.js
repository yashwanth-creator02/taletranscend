// src/pages/contribution/state.js
// Centralised state for the tale editor.
// All editor modules read and write through this shared object.
// Fields mirror the Firestore draft document schema.

import { createLogger } from '@/utils';

const log = createLogger('State');

export const state = {
  // ── Identity ──────────────────────────────────────────────────────
  // Firestore draft document ID.
  // Populated from ?draft=<id> URL param on load, or set after first cloud save.
  // 'new' means the draft hasn't been saved to Firestore yet.
  draftId: 'new',

  // Firestore published tale document ID if editing an existing published tale.
  // Populated from ?taleId=<id> URL param.
  publishedTaleId: null,

  // ── Tale Metadata ─────────────────────────────────────────────────
  title: '',
  synopsis: '',
  coverUrl: '',
  era: '',
  tags: [], // string[]
  tone: 'Mythic',
  language: 'English',
  visibility: 'Public',
  audience: 'General',
  publicationStatus: 'ongoing',
  contentWarnings: '',
  worldSetting: '',
  authorNotes: '',

  // Moderation state of the draft document. Must be written on every save:
  // firestore.rules requires `status` on both draft create and update.
  status: 'draft',

  // Indices of draft chapter documents confirmed to exist on disk. Seeded by
  // loadDraft() and extended by _saveChapter() after each successful write.
  // _saveChapter() consults this to decide whether `createdAt` is required
  // (create rule) or must be preserved (update rule).
  savedChapterIndices: new Set(),

  // ── Chapters ──────────────────────────────────────────────────────
  // Array of { title: string, content: string }
  chapters: [],

  // Index of the chapter currently loaded in the editor
  currentChapterIndex: 0,

  // ── UI Flags ──────────────────────────────────────────────────────
  // True when there are unsaved changes in the current chapter
  isDirty: false,
};

log.info('Global editor state initialized');
