// src/pages/contribution/cloud.js
// Saves and loads the current tale draft from Firestore.
//
// Draft ID lifecycle:
//   - On page load, checks ?draft=<id> URL param.
//   - If present, loads that draft.
//   - If absent, state.draftId stays 'new' until first cloud save,
//     at which point a Firestore doc is created and state.draftId is
//     updated + the URL param is set so refreshes reload the same draft.

import { auth, getDoc, getDocs, addDoc, setDoc, serverTimestamp, refs } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { countWords, setInput, getInput, setSelect } from '@/utils';
import { state } from './state.js';

/* ─────────────────────────────────────────────
   Draft ID from URL
   ───────────────────────────────────────────── */

/**
 * Reads the ?draft=<id> URL param and sets state.draftId.
 * Call this before loadDraft().
 */
export function initDraftId() {
  const id = new URLSearchParams(window.location.search).get('draft');
  if (id) state.draftId = id;
}

/**
 * Pushes the current draftId into the URL without a page reload.
 * Called after the first cloud save so refreshes reload the same draft.
 */
function _syncDraftIdToUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('draft', state.draftId);
  window.history.replaceState({}, '', url.toString());
}

/* ─────────────────────────────────────────────
   Save Draft
   ───────────────────────────────────────────── */

/**
 * Persists the full draft (metadata + current chapter) to Firestore.
 * If this is the first save (state.draftId === 'new'), creates a new
 * Firestore document and updates state.draftId + the URL param.
 */
export async function saveToCloud() {
  if (!auth.currentUser) return;

  const userId = auth.currentUser.uid;
  const payload = _buildMetadataPayload();

  if (state.draftId === 'new') {
    const newRef = await addDoc(refs.drafts(userId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    state.draftId = newRef.id;
    _syncDraftIdToUrl();
  } else {
    await setDoc(
      refs.draft(userId, state.draftId),
      { ...payload, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  // Save the currently active chapter
  const chapter = state.chapters[state.currentChapterIndex];
  if (chapter) {
    await _saveChapter(userId, state.currentChapterIndex, chapter);
  }

  state.isDirty = false;

  showToast('Draft preserved in the cloud.', 'success');

  const statusEl = document.getElementById('stat-status');
  if (statusEl) {
    statusEl.className = statusEl.className.replace(/text-\w+-\d+/g, '');
    statusEl.classList.add('text-emerald-400');
    statusEl.textContent = 'Saved to cloud';
  }
}

/**
 * Saves all chapters to Firestore in parallel.
 * Used during publish to ensure every chapter is persisted before
 * the public tale document is written.
 *
 * @param {string} userId
 */
export async function saveAllChapters(userId) {
  await Promise.all(state.chapters.map((chapter, index) => _saveChapter(userId, index, chapter)));
}

/**
 * Saves a single chapter to the draft's chapters subcollection.
 * Bug fix: was writing chapterNum: index (0-based). Fixed to index + 1 (1-based)
 * to match the finalized schema and the publish pipeline.
 *
 * @param {string} userId
 * @param {number} index
 * @param {{ title: string, content: string }} chapter
 */
async function _saveChapter(userId, index, chapter) {
  const text = (chapter.content || '').trim();
  const wordCount = countWords(text);

  await setDoc(refs.draftChapter(userId, state.draftId, String(index)), {
    // chapterNum is 1-based for display — bug fix: was index (0-based)
    chapterNum: index + 1,
    title: chapter.title?.trim() || `Fragment ${index + 1}`,
    content: chapter.content || '',
    wordCount,
    updatedAt: serverTimestamp(),
  });
}

/* ─────────────────────────────────────────────
   Load Draft
   ───────────────────────────────────────────── */

/**
 * Loads the draft identified by state.draftId from Firestore.
 * Restores all metadata fields and chapters into state + DOM.
 *
 * @returns {Promise<boolean>} true if a draft was found and loaded
 */
export async function loadDraft() {
  if (!auth.currentUser || state.draftId === 'new') return false;

  const userId = auth.currentUser.uid;
  const draftSnap = await getDoc(refs.draft(userId, state.draftId));
  if (!draftSnap.exists()) return false;

  const data = draftSnap.data();

  // Restore metadata into state
  state.title = data.title || '';
  state.synopsis = data.synopsis || '';
  state.coverUrl = data.coverUrl || '';
  state.era = data.era || '';
  state.tags = data.tags || [];
  state.tone = data.tone || 'Mythic';
  state.language = data.language || 'English';
  state.visibility = data.visibility || 'public';
  state.audience = data.audience || 'General';
  state.contentWarnings = data.contentWarnings || '';
  state.worldSetting = data.worldSetting || '';
  state.authorNotes = data.authorNotes || '';

  syncMetadataToDom();

  // Fetch chapters subcollection
  const chaptersSnap = await getDocs(refs.draftChapters(userId, state.draftId));

  if (!chaptersSnap.empty) {
    state.chapters = chaptersSnap.docs
      .map((d) => d.data())
      // Sort by chapterNum (1-based) ascending
      .sort((a, b) => (a.chapterNum ?? 1) - (b.chapterNum ?? 1))
      .map((ch) => ({
        title: ch.title || 'Untitled Chapter',
        content: ch.content || '',
      }));

    state.currentChapterIndex = 0;
  }

  return true;
}

/* ─────────────────────────────────────────────
   DOM <-> State Sync
   ───────────────────────────────────────────── */

/**
 * Reads all metadata input fields from the DOM into state.
 * Called before every cloud save and before publish validation.
 */
export function syncMetadataFromDom() {
  state.title = getInput('tale-title');
  state.synopsis = getInput('tale-synopsis');
  state.coverUrl = getInput('cover-url');
  state.era = getInput('tale-era');
  state.contentWarnings = getInput('content-warnings');
  state.worldSetting = getInput('world-setting');
  state.authorNotes = getInput('story-notes');

  // Tags: comma-separated string -> string[]
  state.tags = getInput('genre-tags')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  state.tone = document.getElementById('story-tone')?.value ?? 'Mythic';
  state.language = document.getElementById('story-language')?.value ?? 'English';
  state.visibility = document.getElementById('story-visibility')?.value ?? 'public';
  state.audience = document.getElementById('target-audience')?.value ?? 'General';
}

/**
 * Writes state metadata back into the DOM fields.
 * Called after a draft is loaded from Firestore.
 */
export function syncMetadataToDom() {
  setInput('tale-title', state.title);
  setInput('tale-synopsis', state.synopsis);
  setInput('cover-url', state.coverUrl);
  setInput('tale-era', state.era);
  setInput('genre-tags', state.tags.join(', '));
  setInput('content-warnings', state.contentWarnings);
  setInput('world-setting', state.worldSetting);
  setInput('story-notes', state.authorNotes);

  setSelect('story-tone', state.tone);
  setSelect('story-language', state.language);
  setSelect('story-visibility', state.visibility);
  setSelect('target-audience', state.audience);

  if (state.coverUrl) {
    const preview = document.getElementById('tale-cover-preview');
    if (preview) preview.src = state.coverUrl;
  }
}

/* ─────────────────────────────────────────────
   Firestore Payload Builder
   ───────────────────────────────────────────── */

/**
 * Builds the metadata object written to the draft document.
 * Denormalizes wordCount so shelf/profile never need sub-collection reads
 * just to display a word count.
 *
 * @returns {Object}
 */
function _buildMetadataPayload() {
  const wordCount = state.chapters.reduce((acc, ch) => {
    return acc + countWords(ch.content);
  }, 0);

  return {
    title: state.title,
    synopsis: state.synopsis,
    coverUrl: state.coverUrl,
    era: state.era,
    tags: state.tags,
    tone: state.tone,
    language: state.language,
    visibility: state.visibility,
    audience: state.audience,
    contentWarnings: state.contentWarnings,
    worldSetting: state.worldSetting,
    authorNotes: state.authorNotes,
    chapterCount: state.chapters.length,
    wordCount,
  };
}
