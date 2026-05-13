// src/firebase/paths.js

// src/firebase/paths.js

/**
 * TaleTranscend Path Configuration
 * Centralized source of truth for Firestore paths.
 */

// Your new Production Root
const APP_ROOT = 'v1/taletranscend/projects/pro-version';

export const PATHS = {
  // --- PUBLIC DATA ---
  publicTales: () => `${APP_ROOT}/public/data/community_tales`,
  publicTale: (taleId) => `${APP_ROOT}/public/data/community_tales/${taleId}`,
  pendingTales: () => `${APP_ROOT}/public/data/pending_tales`,

  // --- USER DATA ---
  user: (uid) => `${APP_ROOT}/users/${uid}`,

  bookmarks: (uid) => `${APP_ROOT}/users/${uid}/bookmarks`,
  bookmark: (uid, taleId) => `${APP_ROOT}/users/${uid}/bookmarks/${taleId}`,

  drafts: (uid) => `${APP_ROOT}/users/${uid}/drafts`,
  draft: (uid, draftId) => `${APP_ROOT}/users/${uid}/drafts/${draftId}`,

  progressList: (uid) => `${APP_ROOT}/users/${uid}/readerProgress`,
  progress: (uid, taleId) => `${APP_ROOT}/users/${uid}/readerProgress/${taleId}`,

  draftChapters: (uid, draftId) => `${APP_ROOT}/users/${uid}/drafts/${draftId}/chapters`,
  draftChapter: (uid, draftId, index) =>
    `${APP_ROOT}/users/${uid}/drafts/${draftId}/chapters/${index}`,
  publicTaleChapters: (taleId) => `${APP_ROOT}/public/data/community_tales/${taleId}/chapters`,
  publicTaleComments: (taleId) => `${APP_ROOT}/public/data/community_tales/${taleId}/comments`,
  progressChapters: (uid, taleId) => `${APP_ROOT}/users/${uid}/readerProgress/${taleId}/chapters`,
  progressChapter: (uid, taleId, index) =>
    `${APP_ROOT}/users/${uid}/readerProgress/${taleId}/chapters/${index}`,
};
