// src/pages/contribution/publish.js
// Full tale publishing pipeline.
//
// Flow:
//   1. Validate — title, at least one chapter with content
//   2. Sync metadata from DOM into state
//   3. Save all chapters to draft subcollection
//   4. Write tale document to tales collection with status='pending'
//   5. Auto-approve — updates status to 'published' (moderation hook ready)
//   6. Write each chapter to tales/{id}/chapters subcollection via refs
//   7. Update draft document with publishedTaleId reference
//
// Single tales collection replaces the old community_tales / pending_tales split.
// The status field on the tale document handles the moderation pipeline.

import { auth, setDoc, updateDoc, serverTimestamp, refs } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { createTale } from '@state/index.js';

import { state } from './state.js';
import { saveAllChapters, syncMetadataFromDom } from './cloud.js';

/* ─────────────────────────────────────────────
   Publish Pipeline
   ───────────────────────────────────────────── */

/**
 * Runs the full publishing pipeline.
 * Validates state, writes to the tales collection, then redirects to the new tale.
 */
export async function publishFullTale() {
  if (!auth.currentUser) {
    _setPublishStatus('You must be signed in to publish.', 'error');
    return;
  }

  syncMetadataFromDom();

  /* ── Validation ──────────────────────────────────────────────── */

  if (!state.title?.trim()) {
    _setPublishStatus('Add a title before publishing.', 'error');
    return;
  }

  if (!state.chapters.length) {
    _setPublishStatus('Add at least one chapter before publishing.', 'error');
    return;
  }

  if (!state.chapters.some((ch) => ch.content?.trim().length > 0)) {
    _setPublishStatus('At least one chapter must have content.', 'error');
    return;
  }

  _setPublishStatus('Publishing…', 'loading');
  _setPublishButtonsDisabled(true);

  try {
    const userId     = auth.currentUser.uid;
    const authorName = auth.currentUser.displayName || `Scribe ${userId.slice(0, 5)}`;

    /* ── Step 1: Save all chapters to draft ─────────────────── */

    await saveAllChapters(userId);

    /* ── Step 2: Determine tale ID ──────────────────────────── */

    // Reuse existing draft ID if available, otherwise generate a new one via
    // the tale ref (Firestore auto-ID approach: write with a known ref).
    const taleId = state.draftId !== 'new' ? state.draftId : _generateId();
    const taleRef = refs.tale(taleId);

    /* ── Step 3: Write tale with status=pending ─────────────── */

    const description = state.synopsis?.trim() || _extractDescription(state.chapters);
    const wordCount   = state.chapters.reduce((acc, ch) => {
      const words = ch.content?.trim() ? ch.content.trim().split(/\s+/).length : 0;
      return acc + words;
    }, 0);
    const estimatedReadMins = Math.ceil(wordCount / 225);

    await setDoc(taleRef, {
      title:              state.title,
      authorId:           userId,
      authorName,
      authorAvatarUrl:    '',
      description,
      synopsis:           state.synopsis || '',
      coverUrl:           state.coverUrl || '',
      era:                state.era || '',
      tags:               state.tags || [],
      tone:               state.tone || '',
      language:           state.language || 'English',
      visibility:         (state.visibility || 'public').toLowerCase(),
      audience:           state.audience || 'General',
      contentWarnings:    Array.isArray(state.contentWarnings)
        ? state.contentWarnings
        : (state.contentWarnings ? [state.contentWarnings] : []),
      worldSetting:       state.worldSetting || '',
      authorNotes:        state.authorNotes || '',
      chapterCount:       state.chapters.length,
      wordCount,
      estimatedReadMins,
      readCount:          0,
      commentCount:       0,
      reactionCount:      0,
      bookmarkCount:      0,
      status:             'pending',
      submittedAt:        serverTimestamp(),
      reviewedAt:         null,
      reviewedBy:         null,
      rejectionReason:    null,
      moderationNotes:    null,
      isFeatured:         false,
      isEditorsPick:      false,
      featuredAt:         null,
      searchKeywords:     _buildSearchKeywords(state.title, state.tags),
      publishedAt:        null,
      lastChapterAddedAt: serverTimestamp(),
      updatedAt:          serverTimestamp(),
      createdAt:          serverTimestamp(),
    });

    /* ── Step 4: Auto-approve (moderation hook) ─────────────── */

    // In a future version this step will be gated behind a moderation queue.
    // For now, auto-approve immediately after submission.
    await updateDoc(taleRef, {
      status:     'published',
      publishedAt: serverTimestamp(),
      reviewedAt:  serverTimestamp(),
      reviewedBy:  'auto-approve',
    });

    /* ── Step 5: Write chapters subcollection ───────────────── */

    await Promise.all(
      state.chapters.map(async (chapter, index) => {
        const chapterWordCount   = chapter.content?.trim()
          ? chapter.content.trim().split(/\s+/).length
          : 0;
        const chapterReadMins    = Math.ceil(chapterWordCount / 225);

        await setDoc(refs.chapter(taleId, index), {
          // chapterNum is 1-based for display — bug fix: was using index (0-based)
          chapterNum:        index + 1,
          title:             chapter.title?.trim() || `Fragment ${index + 1}`,
          content:           chapter.content || '',
          wordCount:         chapterWordCount,
          estimatedReadMins: chapterReadMins,
          publishedAt:       serverTimestamp(),
          updatedAt:         serverTimestamp(),
        });
      })
    );

    /* ── Step 6: Update draft with published reference ──────── */

    if (state.draftId !== 'new') {
      await updateDoc(refs.draft(userId, state.draftId), {
        publishedTaleId: taleId,
        lastPublishedAt: serverTimestamp(),
        updatedAt:       serverTimestamp(),
      });
    }

    showToast('Legend recorded in the archives.', 'success');
    _setPublishStatus('Published successfully!', 'success');

    setTimeout(() => {
      window.location.href = `tale.html?id=${taleId}`;
    }, 1500);
  } catch (error) {
    console.error('[publish] Pipeline failed:', error);
    showToast('Neural transmission failed.', 'error');
    _setPublishStatus('Publish failed. Please try again.', 'error');
  } finally {
    _setPublishButtonsDisabled(false);
  }
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

/**
 * Extracts a short description from the first chapter with content.
 *
 * @param {Array<{ content: string }>} chapters
 * @returns {string}
 */
function _extractDescription(chapters) {
  const first = chapters.find((ch) => ch.content?.trim().length > 0);
  if (!first) return '';
  return first.content.trim().slice(0, 200).replace(/\n/g, ' ') + '…';
}

/**
 * Builds lowercase search keywords from title words and tags.
 *
 * @param {string} title
 * @param {string[]} tags
 * @returns {string[]}
 */
function _buildSearchKeywords(title, tags) {
  const titleWords = (title || '').toLowerCase().split(/\s+/).filter(Boolean);
  const tagWords   = (tags || []).map((t) => t.toLowerCase());
  return [...new Set([...titleWords, ...tagWords])];
}

/**
 * Generates a random Firestore-style document ID.
 * Used when the draft has never been saved (draftId === 'new').
 *
 * @returns {string}
 */
function _generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Updates the status indicator in the editor header.
 *
 * @param {string} message
 * @param {'loading'|'success'|'error'} type
 */
export function setPublishStatus(message, type) {
  const status = document.getElementById('stat-status');
  if (!status) return;

  status.className = status.className.replace(/text-\w+-\d+/g, '').trim();

  const colors = {
    loading: 'text-indigo-400',
    success: 'text-emerald-400',
    error:   'text-red-400',
  };

  status.classList.add(colors[type] ?? 'text-zinc-500');
  status.textContent = message;
}

// Internal alias used within this file
const _setPublishStatus = setPublishStatus;

/**
 * Disables or re-enables the publish buttons during the pipeline.
 *
 * @param {boolean} disabled
 */
function _setPublishButtonsDisabled(disabled) {
  ['publish-btn', 'publish-btn-mobile'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.disabled = disabled;
    btn.classList.toggle('opacity-50', disabled);
    btn.classList.toggle('cursor-not-allowed', disabled);

    const spans = btn.querySelectorAll('span');
    if (spans.length) {
      spans.forEach((span) => {
        if (!span.classList.contains('hidden')) {
          span.textContent = disabled
            ? 'Publishing…'
            : (span.dataset.label ?? span.textContent);
        }
      });
    } else {
      btn.textContent = disabled ? 'Publishing…' : 'Publish';
    }
  });
}
