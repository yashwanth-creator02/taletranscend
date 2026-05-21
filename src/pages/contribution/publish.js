// src/pages/contribution/publish.js
// Full tale publishing pipeline.
//
// Flow:
//   1. Validate — title, at least one chapter with content
//   2. Sync metadata from DOM → state
//   3. Save all chapters to draft sub-collection
//   4. Submit to pending_tales
//   5. Auto-approve (moderation hook ready for future use)
//   6. Write to community_tales with all metadata fields
//   7. Write each chapter to community_tales/{id}/chapters sub-collection via refs
//   8. Update draft document with published reference
//
// The draft is preserved after publishing so the user can edit and re-publish.

import { auth, setDoc, addDoc, updateDoc, serverTimestamp, refs } from '@fb/index.js';
import { showToast } from '@/ui/components/toast.js';

import { state } from './state.js';
import { saveAllChapters, syncMetadataFromDom } from './cloud.js';

/* ── Publish Pipeline ─────────────────────────────────────────────── */

/**
 * Runs the full publish pipeline for the current tale.
 */
export async function publishFullTale() {
  // Authentication required
  if (!auth.currentUser) {
    setPublishStatus('You must be signed in to publish.', 'error');

    return;
  }

  // Sync all DOM fields into state before validation
  syncMetadataFromDom();

  /* ── Validation ─────────────────────────────────────────────── */

  // Title required
  if (!state.title) {
    setPublishStatus('Add a title before publishing.', 'error');

    return;
  }

  // At least one chapter required
  if (!state.chapters.length) {
    setPublishStatus('Add at least one chapter before publishing.', 'error');

    return;
  }

  // At least one chapter must contain content
  const hasContent = state.chapters.some((chapter) => chapter.content?.trim().length > 0);

  if (!hasContent) {
    setPublishStatus('At least one chapter must have content.', 'error');

    return;
  }

  // Publishing UI state
  setPublishStatus('Publishing…', 'loading');

  setPublishButtonsDisabled(true);

  try {
    const userId = auth.currentUser.uid;

    const authorName = auth.currentUser.displayName || `Scribe ${userId.slice(0, 5)}`;

    /* ── Step 1: Save all chapters to draft ─────────────────── */

    await saveAllChapters(userId);

    /* ── Step 2: Submit to pending_tales ────────────────────── */

    const pendingRef = refs.pendingTales();

    const pendingDoc = await addDoc(pendingRef, {
      title: state.title,
      authorId: userId,
      authorName,

      chapterCount: state.chapters.length,

      description: state.synopsis || extractDescription(state.chapters),

      coverUrl: state.coverUrl || '',

      era: state.era || '',

      tags: state.tags || [],

      tone: state.tone || '',

      language: state.language || 'English',

      visibility: state.visibility || 'Public',

      audience: state.audience || 'General',

      status: 'pending',

      submittedAt: serverTimestamp(),
    });

    /* ── Step 3: Auto-approve ───────────────────────────────── */

    // Moderation hook ready for future use
    await updateDoc(pendingDoc, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
    });

    /* ── Step 4: Write public tale ──────────────────────────── */

    const publicTaleRef = refs.tale(pendingDoc.id);

    await setDoc(publicTaleRef, {
      title: state.title,

      authorId: userId,

      authorName,

      description: state.synopsis || extractDescription(state.chapters),

      coverUrl: state.coverUrl || '',

      era: state.era || '',

      tags: state.tags || [],

      tone: state.tone || '',

      language: state.language || 'English',

      visibility: state.visibility || 'Public',

      audience: state.audience || 'General',

      chapterCount: state.chapters.length,

      status: 'published',

      publishedAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    });

    /* ── Step 5: Write chapters sub-collection ─────────────── */

    await Promise.all(
      state.chapters.map(async (chapter, index) => {
        const chapterRef = refs.chapter(pendingDoc.id, index);

        await setDoc(chapterRef, {
          chapterNum: index,

          title: chapter.title || 'Untitled Chapter',

          content: chapter.content || '',
        });
      })
    );

    /* ── Step 6: Update draft metadata ─────────────────────── */

    if (state.draftId !== 'new') {
      const draftRef = refs.draft(userId, state.draftId);

      await updateDoc(draftRef, {
        publishedTaleId: pendingDoc.id,

        lastPublishedAt: serverTimestamp(),
      });
    }

    // Success state
    showToast('Legend recorded in the archives.', 'success');
    setPublishStatus('Published successfully!', 'success');

    // Redirect to the newly published tale
    setTimeout(() => {
      window.location.href = `tale.html?id=${pendingDoc.id}`;
    }, 1500);
  } catch (error) {
    console.error('[publish] Pipeline failed:', error);
    showToast('Neural transmission failed.', 'error');
    setPublishStatus('Publish failed. Please try again.', 'error');
  } finally {
    setPublishButtonsDisabled(false);
  }
}

/* ── Helpers ──────────────────────────────────────────────────────── */

/**
 * Extracts a short description from the first chapter with content.
 * Fallback when synopsis is empty.
 *
 * @param {Array<{ content: string }>} chapters
 * @returns {string}
 */
function extractDescription(chapters) {
  const first = chapters.find((chapter) => chapter.content?.trim().length > 0);

  if (!first) return '';

  return first.content.trim().slice(0, 200).replace(/\n/g, ' ') + '…';
}

/**
 * Updates the status indicator in the editor header.
 * Shared single source of truth for publish UI feedback.
 *
 * @param {string} message
 * @param {'loading'|'success'|'error'} type
 */
export function setPublishStatus(message, type) {
  const status = document.getElementById('stat-status');

  if (!status) return;

  // Remove existing text color classes
  status.className = status.className.replace(/text-\w+-\d+/g, '').trim();

  const colors = {
    loading: 'text-indigo-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
  };

  status.classList.add(colors[type] ?? 'text-zinc-500');

  status.textContent = message;
}

/**
 * Disables or re-enables the publish buttons and updates their label.
 *
 * @param {boolean} disabled
 */
function setPublishButtonsDisabled(disabled) {
  ['publish-btn', 'publish-btn-mobile'].forEach((id) => {
    const button = document.getElementById(id);

    if (!button) return;

    button.disabled = disabled;

    button.classList.toggle('opacity-50', disabled);

    button.classList.toggle('cursor-not-allowed', disabled);

    // Preserve original labels if spans exist
    const spans = button.querySelectorAll('span');

    if (spans.length) {
      spans.forEach((span) => {
        if (!span.classList.contains('hidden')) {
          span.textContent = disabled ? 'Publishing…' : (span.dataset.label ?? span.textContent);
        }
      });
    } else {
      button.textContent = disabled ? 'Publishing…' : 'Publish';
    }
  });
}
