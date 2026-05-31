// src/firebase/paths.js
// Centralized source of truth for all Firestore path strings.
// Every path used anywhere in the app must be defined here.
// No raw path strings are permitted outside this file.
//
// Single collection 'tales' replaces the old community_tales / pending_tales split.
// Status field on the tale document handles the moderation pipeline.

const APP_ROOT = 'v1/taletranscend/projects/v1';

export { APP_ROOT };

export const PATHS = {
  // ── Public Tales ──────────────────────────────────────────────────

  /** All tales (published, pending, draft) */
  publicTales: () => `${APP_ROOT}/public/data/tales`,

  /** Single tale document */
  publicTale: (taleId) => `${APP_ROOT}/public/data/tales/${taleId}`,

  /** Chapters subcollection */
  publicTaleChapters: (taleId) => `${APP_ROOT}/public/data/tales/${taleId}/chapters`,

  /** Single chapter document */
  publicTaleChapter: (taleId, index) =>
    `${APP_ROOT}/public/data/tales/${taleId}/chapters/${String(index)}`,

  /** Comments subcollection */
  publicTaleComments: (taleId) => `${APP_ROOT}/public/data/tales/${taleId}/comments`,

  /** Single comment document */
  publicTaleComment: (taleId, commentId) =>
    `${APP_ROOT}/public/data/tales/${taleId}/comments/${commentId}`,

  /** Likes subcollection inside a comment */
  commentLikes: (taleId, commentId) =>
    `${APP_ROOT}/public/data/tales/${taleId}/comments/${commentId}/likes`,

  /** Single like document (keyed by userId) */
  commentLike: (taleId, commentId, uid) =>
    `${APP_ROOT}/public/data/tales/${taleId}/comments/${commentId}/likes/${uid}`,

  /** Reactions subcollection (one doc per user) */
  taleReactions: (taleId) => `${APP_ROOT}/public/data/tales/${taleId}/reactions`,

  /** Single reaction document (keyed by userId) */
  taleReaction: (taleId, uid) => `${APP_ROOT}/public/data/tales/${taleId}/reactions/${uid}`,

  /** Versions subcollection (snapshots on each publish) */
  taleVersions: (taleId) => `${APP_ROOT}/public/data/tales/${taleId}/versions`,

  /** Single version document */
  taleVersion: (taleId, versionId) =>
    `${APP_ROOT}/public/data/tales/${taleId}/versions/${versionId}`,

  // ── Public Meta ───────────────────────────────────────────────────

  /** featured / trending / new arrivals — admin-controlled */
  featured: () => `${APP_ROOT}/public/meta/featured`,

  /** Global counters */
  globalStats: () => `${APP_ROOT}/public/meta/stats`,

  // ── Tags ──────────────────────────────────────────────────────────

  /** All tags */
  tags: () => `${APP_ROOT}/public/data/tags`,

  /** Single tag document */
  tag: (tag) => `${APP_ROOT}/public/data/tags/${tag}`,

  // ── User Profile ──────────────────────────────────────────────────

  /** User profile document */
  user: (uid) => `${APP_ROOT}/users/${uid}`,

  /** Reader preferences — single document */
  readerPrefs: (uid) => `${APP_ROOT}/users/${uid}/preferences/reader`,

  // ── Bookmarks ─────────────────────────────────────────────────────

  /** All bookmarks for a user */
  bookmarks: (uid) => `${APP_ROOT}/users/${uid}/bookmarks`,

  /** Single bookmark document (keyed by taleId) */
  bookmark: (uid, taleId) => `${APP_ROOT}/users/${uid}/bookmarks/${taleId}`,

  // ── Reading Lists ─────────────────────────────────────────────────

  /** All reading lists for a user */
  lists: (uid) => `${APP_ROOT}/users/${uid}/lists`,

  /** Single list document */
  list: (uid, listId) => `${APP_ROOT}/users/${uid}/lists/${listId}`,

  /** Tales subcollection inside a reading list */
  listTales: (uid, listId) => `${APP_ROOT}/users/${uid}/lists/${listId}/tales`,

  /** Single tale entry in a reading list */
  listTale: (uid, listId, taleId) => `${APP_ROOT}/users/${uid}/lists/${listId}/tales/${taleId}`,

  // ── Drafts ────────────────────────────────────────────────────────

  /** All drafts for a user */
  drafts: (uid) => `${APP_ROOT}/users/${uid}/drafts`,

  /** Single draft document */
  draft: (uid, draftId) => `${APP_ROOT}/users/${uid}/drafts/${draftId}`,

  /** Chapters subcollection inside a draft */
  draftChapters: (uid, draftId) => `${APP_ROOT}/users/${uid}/drafts/${draftId}/chapters`,

  /** Single chapter inside a draft */
  draftChapter: (uid, draftId, index) =>
    `${APP_ROOT}/users/${uid}/drafts/${draftId}/chapters/${String(index)}`,

  // ── Reader Progress ───────────────────────────────────────────────

  /** All progress documents for a user */
  progressList: (uid) => `${APP_ROOT}/users/${uid}/readerProgress`,

  /** Single tale progress document */
  progress: (uid, taleId) => `${APP_ROOT}/users/${uid}/readerProgress/${taleId}`,

  /** Chapters subcollection inside a progress document */
  progressChapters: (uid, taleId) => `${APP_ROOT}/users/${uid}/readerProgress/${taleId}/chapters`,

  /** Single chapter progress document */
  progressChapter: (uid, taleId, index) =>
    `${APP_ROOT}/users/${uid}/readerProgress/${taleId}/chapters/${String(index)}`,

  // ── Reading History ───────────────────────────────────────────────

  /** All reading history entries for a user */
  readingHistory: (uid) => `${APP_ROOT}/users/${uid}/readingHistory`,

  /** Single reading history entry (keyed by taleId) */
  readingHistoryEntry: (uid, taleId) => `${APP_ROOT}/users/${uid}/readingHistory/${taleId}`,

  // ── Social ────────────────────────────────────────────────────────

  /** Users this user is following */
  following: (uid) => `${APP_ROOT}/users/${uid}/following`,

  /** Single following document (keyed by targetUid) */
  followingEntry: (uid, targetUid) => `${APP_ROOT}/users/${uid}/following/${targetUid}`,

  /** Users following this user */
  followers: (uid) => `${APP_ROOT}/users/${uid}/followers`,

  /** Single follower document (keyed by followerUid) */
  followerEntry: (uid, followerUid) => `${APP_ROOT}/users/${uid}/followers/${followerUid}`,

  // ── Notifications ─────────────────────────────────────────────────

  /** All notifications for a user */
  notifications: (uid) => `${APP_ROOT}/users/${uid}/notifications`,

  /** Single notification document */
  notification: (uid, notificationId) => `${APP_ROOT}/users/${uid}/notifications/${notificationId}`,

  // ── Achievements ──────────────────────────────────────────────────

  /** All achievements for a user */
  achievements: (uid) => `${APP_ROOT}/users/${uid}/achievements`,

  /** Single achievement document (keyed by achievement slug) */
  achievement: (uid, achievementId) => `${APP_ROOT}/users/${uid}/achievements/${achievementId}`,
};
