// src/state/index.js
// Central barrel for all state schemas and the app runtime state.
// Import everything state-related from here.
//
// Usage:
//   import { createUserProfile, createTale, appState } from '@state/index.js';

// ── Schemas ─────────────────────────────────────────────────────────

export {
  createUserProfile,
  createReaderPreferences,
  profileToFirestore,
} from './schemas/user.schema.js';

export { createTale, createChapter, createComment } from './schemas/tale.schema.js';

export {
  createTaleProgress,
  createChapterProgress,
  createLocalChapterProgress,
  createLocalTaleProgress,
  createReadingHistoryEntry,
} from './schemas/progress.schema.js';

export {
  createDraft,
  createDraftChapter,
  draftToFirestore,
  draftChapterToFirestore,
} from './schemas/draft.schema.js';

export { createBookmark, bookmarkToFirestore } from './schemas/bookmark.schema.js';

export { createNotification } from './schemas/notification.schema.js';

export { createAchievement, ACHIEVEMENT_REGISTRY } from './schemas/achievement.schema.js';

// ── App Runtime State ────────────────────────────────────────────────

export { appState } from './app.state.js';
