// src/firebase/refs.js
// Centralized Firestore reference builders.
// All Firestore access goes through here — no raw path strings anywhere else.
//
// Every ref here corresponds to a PATHS entry in paths.js.
// Usage:
//   import { refs } from '@fb/refs.js';
//   const snap = await getDoc(refs.tale(taleId));

import { db } from './db.js';
import { doc, collection } from 'firebase/firestore';
import { PATHS } from './paths.js';

export const refs = {
  // ── Public Tales ──────────────────────────────────────────────────

  /** All tales collection */
  tales: () => collection(db, PATHS.publicTales()),

  /** Single tale document */
  tale: (taleId) => doc(db, PATHS.publicTale(taleId)),

  /** Chapters subcollection for a tale */
  chapters: (taleId) => collection(db, PATHS.publicTaleChapters(taleId)),

  /** Single chapter document */
  chapter: (taleId, index) => doc(db, PATHS.publicTaleChapter(taleId, index)),

  /** Comments subcollection for a tale */
  comments: (taleId) => collection(db, PATHS.publicTaleComments(taleId)),

  /** Single comment document */
  comment: (taleId, commentId) => doc(db, PATHS.publicTaleComment(taleId, commentId)),

  /** Likes subcollection inside a comment */
  commentLikes: (taleId, commentId) => collection(db, PATHS.commentLikes(taleId, commentId)),

  /** Single like document (keyed by userId) */
  commentLike: (taleId, commentId, uid) => doc(db, PATHS.commentLike(taleId, commentId, uid)),

  /** Reactions subcollection for a tale */
  taleReactions: (taleId) => collection(db, PATHS.taleReactions(taleId)),

  /** Single reaction document (keyed by userId) */
  taleReaction: (taleId, uid) => doc(db, PATHS.taleReaction(taleId, uid)),

  /** Versions subcollection for a tale */
  taleVersions: (taleId) => collection(db, PATHS.taleVersions(taleId)),

  /** Single version document */
  taleVersion: (taleId, versionId) => doc(db, PATHS.taleVersion(taleId, versionId)),

  // ── Public Meta ───────────────────────────────────────────────────

  /** Featured / trending / new arrivals document */
  featured: () => doc(db, PATHS.featured()),

  /** Global stats document */
  globalStats: () => doc(db, PATHS.globalStats()),

  // ── Tags ──────────────────────────────────────────────────────────

  /** All tags collection */
  tags: () => collection(db, PATHS.tags()),

  /** Single tag document */
  tag: (tag) => doc(db, PATHS.tag(tag)),

  // ── User Profile ──────────────────────────────────────────────────

  /** User profile document */
  user: (uid) => doc(db, PATHS.user(uid)),

  /** Reader preferences document */
  readerPrefs: (uid) => doc(db, PATHS.readerPrefs(uid)),

  // ── Bookmarks ─────────────────────────────────────────────────────

  /** All bookmarks for a user */
  bookmarks: (uid) => collection(db, PATHS.bookmarks(uid)),

  /** Single bookmark document */
  bookmark: (uid, taleId) => doc(db, PATHS.bookmark(uid, taleId)),

  // ── Reading Lists ─────────────────────────────────────────────────

  /** All reading lists for a user */
  lists: (uid) => collection(db, PATHS.lists(uid)),

  /** Single reading list document */
  list: (uid, listId) => doc(db, PATHS.list(uid, listId)),

  /** Tales subcollection inside a list */
  listTales: (uid, listId) => collection(db, PATHS.listTales(uid, listId)),

  /** Single tale entry in a list */
  listTale: (uid, listId, taleId) => doc(db, PATHS.listTale(uid, listId, taleId)),

  // ── Drafts ────────────────────────────────────────────────────────

  /** All drafts for a user */
  drafts: (uid) => collection(db, PATHS.drafts(uid)),

  /** Single draft document */
  draft: (uid, draftId) => doc(db, PATHS.draft(uid, draftId)),

  /** Chapters subcollection inside a draft */
  draftChapters: (uid, draftId) => collection(db, PATHS.draftChapters(uid, draftId)),

  /** Single chapter inside a draft */
  draftChapter: (uid, draftId, index) => doc(db, PATHS.draftChapter(uid, draftId, index)),

  // ── Reader Progress ───────────────────────────────────────────────

  /** All progress documents for a user */
  progressList: (uid) => collection(db, PATHS.progressList(uid)),

  /** Single tale progress document */
  progress: (uid, taleId) => doc(db, PATHS.progress(uid, taleId)),

  /** Chapters subcollection inside a progress document */
  progressChapters: (uid, taleId) => collection(db, PATHS.progressChapters(uid, taleId)),

  /** Single chapter progress document */
  progressChapter: (uid, taleId, index) => doc(db, PATHS.progressChapter(uid, taleId, index)),

  // ── Reading History ───────────────────────────────────────────────

  /** All reading history for a user */
  readingHistory: (uid) => collection(db, PATHS.readingHistory(uid)),

  /** Single reading history entry */
  readingHistoryEntry: (uid, taleId) => doc(db, PATHS.readingHistoryEntry(uid, taleId)),

  // ── Social ────────────────────────────────────────────────────────

  /** Users this user is following */
  following: (uid) => collection(db, PATHS.following(uid)),

  /** Single following entry */
  followingEntry: (uid, targetUid) => doc(db, PATHS.followingEntry(uid, targetUid)),

  /** Users following this user */
  followers: (uid) => collection(db, PATHS.followers(uid)),

  /** Single follower entry */
  followerEntry: (uid, followerUid) => doc(db, PATHS.followerEntry(uid, followerUid)),

  // ── Notifications ─────────────────────────────────────────────────

  /** All notifications for a user */
  notifications: (uid) => collection(db, PATHS.notifications(uid)),

  /** Single notification document */
  notification: (uid, notificationId) => doc(db, PATHS.notification(uid, notificationId)),

  // ── Achievements ──────────────────────────────────────────────────

  /** All achievements for a user */
  achievements: (uid) => collection(db, PATHS.achievements(uid)),

  /** Single achievement document */
  achievement: (uid, achievementId) => doc(db, PATHS.achievement(uid, achievementId)),
};
