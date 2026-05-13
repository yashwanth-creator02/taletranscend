// src/pages/contribution/cloud.js
// Saves and loads the current tale draft from Firestore.
//
// Draft ID lifecycle:
//   - On page load, checks ?draft=<id> URL param.
//   - If present, loads that draft.
//   - If absent, state.draftId stays 'new' until first cloud save,
//     at which point a Firestore doc is created and state.draftId is
//     updated + the URL param is set so refreshes reload the same draft.
//
// totalWordsWritten is computed from all chapters on every save and
// written to the draft document so the shelf/profile page can show
// accurate word counts without extra sub-collection reads.

import { auth, getDoc, getDocs, addDoc, setDoc, serverTimestamp, refs } from '@fb/index.js';

import { state } from './state.js';

/* ── Draft ID from URL ────────────────────────────────────────────── */

/**
 * Reads the ?draft=<id> URL param and sets state.draftId.
 * Call this before loadDraft().
 */
export function initDraftId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('draft');

  if (id) {
    state.draftId = id;
  }
}

/**
 * Pushes the current draftId into the URL without a page reload.
 * Called after the first cloud save so refreshes reload the same draft.
 */
function syncDraftIdToUrl() {
  const url = new URL(window.location.href);

  url.searchParams.set('draft', state.draftId);

  window.history.replaceState({}, '', url.toString());
}

/* ── Save Draft ───────────────────────────────────────────────────── */

/**
 * Persists the full draft (metadata + current chapter) to Firestore.
 *
 * If this is the first save (state.draftId === 'new'), creates a new
 * Firestore document and updates state.draftId + the URL param.
 *
 * Saves all metadata fields from state so they survive page refreshes.
 */
export async function saveToCloud() {
  if (!auth.currentUser) return;

  const userId = auth.currentUser.uid;

  // Sync metadata from DOM into state before saving
  syncMetadataFromDom();

  // Build Firestore payload
  const metadata = buildMetadataPayload();

  // First-time save: create a new draft document
  if (state.draftId === 'new') {
    const draftsCol = refs.drafts(userId);

    const newRef = await addDoc(draftsCol, {
      ...metadata,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Persist the generated Firestore doc ID into state
    state.draftId = newRef.id;

    // Keep the URL synced so refresh restores the same draft
    syncDraftIdToUrl();
  } else {
    // Existing draft: merge updates into the same document
    const draftRef = refs.draft(userId, state.draftId);

    await setDoc(
      draftRef,
      {
        ...metadata,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Save only the currently active chapter
  const chapter = state.chapters[state.currentChapterIndex];

  if (chapter) {
    await saveChapter(userId, state.currentChapterIndex, chapter);
  }

  // Draft is now synced
  state.isDirty = false;

  // Update save status UI
  const status = document.getElementById('stat-status');

  if (status) {
    status.className = status.className.replace(/text-\w+-\d+/g, '');
    status.classList.add('text-emerald-400');
    status.textContent = 'Saved to cloud';
  }
}

/**
 * Saves all chapters to Firestore in parallel.
 * Used during publish to ensure every chapter is persisted.
 *
 * @param {string} userId
 */
export async function saveAllChapters(userId) {
  await Promise.all(state.chapters.map((chapter, index) => saveChapter(userId, index, chapter)));
}

/**
 * Saves a single chapter document to the chapters sub-collection.
 *
 * @param {string} userId
 * @param {number} index
 * @param {{ title: string, content: string }} chapter
 */
async function saveChapter(userId, index, chapter) {
  const chapterRef = refs.draftChapter(userId, state.draftId, String(index));

  await setDoc(chapterRef, {
    chapterNum: index,
    title: chapter.title || 'Untitled Chapter',
    content: chapter.content || '',
    updatedAt: serverTimestamp(),
  });
}

/* ── Load Draft ───────────────────────────────────────────────────── */

/**
 * Loads the draft identified by state.draftId from Firestore.
 * Restores all metadata fields and chapters into state + DOM.
 *
 * @returns {Promise<boolean>} true if a draft was found and loaded
 */
export async function loadDraft() {
  if (!auth.currentUser) return false;

  if (state.draftId === 'new') return false;

  const userId = auth.currentUser.uid;

  // Load draft metadata document
  const draftRef = refs.draft(userId, state.draftId);
  const draftSnap = await getDoc(draftRef);

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
  state.visibility = data.visibility || 'Public';
  state.audience = data.audience || 'General';
  state.contentWarnings = data.contentWarnings || '';
  state.worldSetting = data.worldSetting || '';
  state.authorNotes = data.authorNotes || '';

  // Push metadata into DOM inputs
  syncMetadataToDom();

  // Fetch chapters sub-collection
  const chaptersRef = refs.draftChapters(userId, state.draftId);

  const chaptersSnap = await getDocs(chaptersRef);

  // Restore chapter list into state
  if (!chaptersSnap.empty) {
    state.chapters = chaptersSnap.docs
      .map((docSnap) => docSnap.data())
      .sort((a, b) => (a.chapterNum ?? 0) - (b.chapterNum ?? 0))
      .map((chapter) => ({
        title: chapter.title || 'Untitled Chapter',
        content: chapter.content || '',
      }));

    // Reset editor to first chapter
    state.currentChapterIndex = 0;
  }

  return true;
}

/* ── DOM ↔ State Sync ─────────────────────────────────────────────── */

/**
 * Reads all metadata input fields from the DOM into state.
 * Called before every cloud save.
 */
export function syncMetadataFromDom() {
  state.title = document.getElementById('tale-title')?.value.trim() ?? '';

  state.synopsis = document.getElementById('tale-synopsis')?.value.trim() ?? '';

  state.coverUrl = document.getElementById('cover-url')?.value.trim() ?? '';

  state.era = document.getElementById('tale-era')?.value.trim() ?? '';

  state.contentWarnings = document.getElementById('content-warnings')?.value.trim() ?? '';

  state.worldSetting = document.getElementById('world-setting')?.value.trim() ?? '';

  state.authorNotes = document.getElementById('story-notes')?.value.trim() ?? '';

  // Tags: comma-separated string → string[]
  const tagsRaw = document.getElementById('genre-tags')?.value ?? '';

  state.tags = tagsRaw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  state.tone = document.getElementById('story-tone')?.value ?? 'Mythic';

  state.language = document.getElementById('story-language')?.value ?? 'English';

  state.visibility = document.getElementById('story-visibility')?.value ?? 'Public';

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

  // Convert tags array back into a comma-separated string
  setInput('genre-tags', state.tags.join(', '));

  setInput('content-warnings', state.contentWarnings);
  setInput('world-setting', state.worldSetting);
  setInput('story-notes', state.authorNotes);

  setSelect('story-tone', state.tone);
  setSelect('story-language', state.language);
  setSelect('story-visibility', state.visibility);
  setSelect('target-audience', state.audience);

  // Restore saved cover preview
  if (state.coverUrl) {
    const preview = document.getElementById('tale-cover-preview');

    if (preview) {
      preview.src = state.coverUrl;
    }
  }
}

/* ── Firestore Payload ────────────────────────────────────────────── */

/**
 * Builds the metadata object written to the draft document.
 *
 * totalWordsWritten is denormalized so shelf/profile pages
 * never need to fetch all chapter sub-collections just to
 * display a word count.
 *
 * @returns {Object}
 */
function buildMetadataPayload() {
  // Compute total words across every chapter
  const totalWordsWritten = state.chapters.reduce((accumulator, chapter) => {
    const text = (chapter.content || '').trim();

    // Empty chapters contribute 0 words
    if (!text) return accumulator;

    return accumulator + text.split(/\s+/).length;
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

    // Useful summary stats
    chapterCount: state.chapters.length,
    totalWordsWritten,
  };
}

/* ── Tiny DOM helpers ─────────────────────────────────────────────── */

/**
 * Safely sets an input value if the element exists.
 *
 * @param {string} id
 * @param {string} value
 */
function setInput(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.value = value ?? '';
  }
}

/**
 * Safely sets a <select> value if the option exists.
 *
 * @param {string} id
 * @param {string} value
 */
function setSelect(id, value) {
  const el = document.getElementById(id);

  if (!el || !value) return;

  const optionExists = [...el.options].find((option) => option.value === value);

  if (optionExists) {
    el.value = value;
  }
}
