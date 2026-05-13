// src/pages/contribution/cloud.js
// Saves and loads the current tale draft from Firestore.
//
// Firestore structure:
//   users/{userId}/drafts/{draftId}               <- title, chapterCount, updatedAt
//   users/{userId}/drafts/{draftId}/chapters/{idx} <- title, content, chapterNum

import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  appId,
  PATHS,
} from '@fb/index.js';
import { state } from './state.js';

/* ==================== Save Draft ==================== */

/**
 * Persists the current draft to Firestore.
 * Saves the tale title and chapter count to the parent document.
 * Saves each chapter as a separate document in the chapters subcollection.
 * Only the current chapter is written on each save to minimize writes.
 *
 * For a full save of all chapters (e.g. on publish), use saveAllChapters().
 */
export async function saveToCloud() {
  if (!auth.currentUser) return;

  const userId = auth.currentUser.uid;
  const taleTitle = document.getElementById('tale-title')?.value || '';

  const draftRef = doc(db, PATHS.draft(userId, state.draftId));

  // Update the parent draft document with metadata
  await setDoc(
    draftRef,
    {
      title: taleTitle,
      chapterCount: state.chapters.length,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Save only the current chapter to minimize Firestore writes
  const chapter = state.chapters[state.currentChapterIndex];
  if (chapter) {
    await saveChapter(userId, state.currentChapterIndex, chapter);
  }

  const status = document.getElementById('stat-status');
  if (status) status.textContent = 'Saved to Cloud';
}

/**
 * Saves all chapters to Firestore in parallel.
 * Used during publish to ensure all chapters are persisted before publishing.
 *
 * @param {string} userId - ID of the authenticated user
 */
export async function saveAllChapters(userId) {
  await Promise.all(state.chapters.map((ch, idx) => saveChapter(userId, idx, ch)));
}

/**
 * Saves a single chapter document to the chapters subcollection.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {number} index - Chapter index
 * @param {Object} chapter - Chapter object with title and content
 */
async function saveChapter(userId, index, chapter) {
  const chapterRef = doc(db, PATHS.draftChapter(userId, state.draftId, String(index)));

  await setDoc(chapterRef, {
    chapterNum: index,
    title: chapter.title || 'Untitled Chapter',
    content: chapter.content || '',
    updatedAt: serverTimestamp(),
  });
}

/* ==================== Load Draft ==================== */

/**
 * Loads the user's current draft from Firestore into local state.
 * Fetches the parent document for metadata and the chapters subcollection
 * for chapter content.
 * Returns true if a draft was found and loaded, false if none exists.
 *
 * @returns {Promise<boolean>} Whether a draft was found and loaded
 */
export async function loadDraft() {
  if (!auth.currentUser) return false;

  const userId = auth.currentUser.uid;

  const draftRef = doc(db, PATHS.draft(userId, state.draftId));

  const draftSnap = await getDoc(draftRef);
  if (!draftSnap.exists()) return false;

  const draftData = draftSnap.data();

  // Restore tale title
  const titleInput = document.getElementById('tale-title');
  if (titleInput && draftData.title) titleInput.value = draftData.title;

  // Fetch all chapters from subcollection
  const chaptersRef = collection(db, PATHS.draftChapters(userId, state.draftId));

  const chaptersSnap = await getDocs(chaptersRef);
  if (chaptersSnap.empty) return false;

  // Sort chapters by chapterNum and restore into state
  const chapters = chaptersSnap.docs
    .map((d) => d.data())
    .sort((a, b) => (a.chapterNum || 0) - (b.chapterNum || 0))
    .map((ch) => ({
      title: ch.title || 'Untitled Chapter',
      content: ch.content || '',
    }));

  state.chapters = chapters;
  state.currentChapterIndex = 0;

  return true;
}
