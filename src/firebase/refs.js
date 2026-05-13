// src/firebase/refs.js
// Centralized Firestore reference builders.
// All Firestore access goes through here — no raw path strings anywhere else.
//
// Usage:
//   import { refs } from '@fb/refs.js';
//   const snap = await getDoc(refs.tale(taleId));
//   const snap = await getDocs(refs.chapters(taleId));

import { db } from './db.js';
import { doc, collection } from 'firebase/firestore';
import { PATHS } from './paths.js';

export const refs = {
  // ==================== Public Tales ====================

  /** Single published tale document */
  tale: (taleId) => doc(db, PATHS.publicTale(taleId)),

  /** All published tales collection */
  tales: () => collection(db, PATHS.publicTales()),

  /** Chapters subcollection for a published tale */
  chapters: (taleId) => collection(db, PATHS.publicTaleChapters(taleId)),

  /** Single chapter document in a published tale */
  chapter: (taleId, index) => doc(db, `${PATHS.publicTaleChapters(taleId)}/${String(index)}`),

  /** Comments subcollection for a published tale */
  comments: (taleId) => collection(db, PATHS.publicTaleComments(taleId)),

  // ==================== Pending Review ====================

  /** Pending tales collection */
  pendingTales: () => collection(db, PATHS.pendingTales()),

  // ==================== User Profile ====================

  /** User profile document */
  user: (uid) => doc(db, PATHS.user(uid)),

  // ==================== Bookmarks ====================

  /** All bookmarks for a user */
  bookmarks: (uid) => collection(db, PATHS.bookmarks(uid)),

  /** Single bookmark document */
  bookmark: (uid, taleId) => doc(db, PATHS.bookmark(uid, taleId)),

  // ==================== Drafts ====================

  /** All drafts for a user */
  drafts: (uid) => collection(db, PATHS.drafts(uid)),

  /** Single draft document */
  draft: (uid, draftId) => doc(db, PATHS.draft(uid, draftId)),

  /** Chapters subcollection inside a draft */
  draftChapters: (uid, draftId) => collection(db, PATHS.draftChapters(uid, draftId)),

  /** Single chapter document inside a draft */
  draftChapter: (uid, draftId, index) => doc(db, PATHS.draftChapter(uid, draftId, String(index))),

  // ==================== Reader Progress ====================

  /** All progress documents for a user */
  progressList: (uid) => collection(db, PATHS.progressList(uid)),

  /** Single tale progress document */
  progress: (uid, taleId) => doc(db, PATHS.progress(uid, taleId)),

  /** Chapters subcollection inside a progress document */
  progressChapters: (uid, taleId) => collection(db, PATHS.progressChapters(uid, taleId)),

  /** Single chapter progress document */
  progressChapter: (uid, taleId, index) =>
    doc(db, PATHS.progressChapter(uid, taleId, String(index))),
};
