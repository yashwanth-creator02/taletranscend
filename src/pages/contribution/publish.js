// src/pages/contribution/publish.js
// Handles the full tale publishing pipeline.
//
// Flow:
//   1. Validate tale has a title and at least one chapter with content
//   2. Save all chapters to Firestore draft subcollection
//   3. Submit to pending_tales for review
//   4. Auto-approve (review bypassed for now — structure exists for future moderation)
//   5. Write approved tale to community_tales (publicly visible)
//   6. Write each chapter as a subcollection document in community_tales
//   7. Update draft document with published reference
//
// The draft is preserved after publishing so the user can edit and re-publish.

import {
  auth,
  db,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  appId,
  PATHS,
} from '@fb/index.js';
import { state } from './state.js';
import { saveAllChapters } from './cloud.js';

/**
 * Runs the full publish pipeline for the current tale.
 */
export async function publishFullTale() {
  if (!auth.currentUser) {
    showStatus('You must be logged in to publish.', 'error');
    return;
  }

  // -------------------- Validation --------------------
  const taleTitle = document.getElementById('tale-title')?.value.trim();

  if (!taleTitle) {
    showStatus('Please add a title before publishing.', 'error');
    return;
  }

  if (!state.chapters.length) {
    showStatus('Add at least one chapter before publishing.', 'error');
    return;
  }

  const hasContent = state.chapters.some((ch) => ch.content?.trim().length > 0);
  if (!hasContent) {
    showStatus('At least one chapter must have content.', 'error');
    return;
  }

  showStatus('Publishing...', 'loading');
  setPublishButtonState(true);

  try {
    const userId = auth.currentUser.uid;
    const authorName = auth.currentUser.displayName || `Scribe ${userId.slice(0, 5)}`;

    // -------------------- Step 1: Save all chapters to draft --------------------
    // Ensures every chapter is persisted before publishing,
    // not just the currently active one.
    await saveAllChapters(userId);

    // -------------------- Step 2: Submit to pending review --------------------
    const pendingRef = collection(db, PATHS.pendingTales());

    const pendingDoc = await addDoc(pendingRef, {
      title: taleTitle,
      authorId: userId,
      authorName,
      chapterCount: state.chapters.length,
      description: extractDescription(state.chapters),
      status: 'pending',
      submittedAt: serverTimestamp(),
    });

    // -------------------- Step 3: Auto-approve --------------------
    // Review is bypassed for now.
    // Future moderation checks status before the community_tales write.
    await updateDoc(pendingDoc, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
    });

    // -------------------- Step 4: Write to community_tales --------------------
    const communityRef = doc(db, PATHS.publicTale(pendingDoc.id));

    await setDoc(communityRef, {
      title: taleTitle,
      authorId: userId,
      authorName,
      description: extractDescription(state.chapters),
      chapterCount: state.chapters.length,
      status: 'published',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // -------------------- Step 5: Write chapters subcollection --------------------
    // Each chapter is its own document — mirrors the draft structure
    // and avoids the 1MB document size limit.
    await Promise.all(
      state.chapters.map((ch, idx) =>
        setDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'community_tales',
            pendingDoc.id,
            'chapters',
            String(idx)
          ),
          {
            chapterNum: idx,
            title: ch.title || 'Untitled Chapter',
            content: ch.content || '',
          }
        )
      )
    );

    // -------------------- Step 6: Update draft with published reference --------------------
    const draftRef = doc(db, PATHS.draft(userId, state.draftId));

    await updateDoc(draftRef, {
      publishedTaleId: pendingDoc.id,
      lastPublishedAt: serverTimestamp(),
    });

    showStatus('Published successfully.', 'success');

    // Navigate to the published tale after a short delay
    setTimeout(() => {
      window.location.href = `tale.html?id=${pendingDoc.id}`;
    }, 1500);
  } catch (err) {
    console.error('Publish failed:', err);
    showStatus('Publish failed. Please try again.', 'error');
  } finally {
    setPublishButtonState(false);
  }
}

/* ==================== Helpers ==================== */

/**
 * Extracts a short description from the first chapter with content.
 * Used as the tale description in community_tales.
 *
 * @param {Array<Object>} chapters - Array of chapter objects
 * @returns {string} First 200 characters of the first chapter's content
 */
function extractDescription(chapters) {
  const first = chapters.find((ch) => ch.content?.trim().length > 0);
  if (!first) return '';
  return first.content.trim().slice(0, 200).replace(/\n/g, ' ') + '...';
}

/**
 * Updates the status indicator in the editor header.
 *
 * @param {string} message - Status message
 * @param {'loading'|'success'|'error'} type - Visual style
 */
function showStatus(message, type) {
  const status = document.getElementById('stat-status');
  if (!status) return;

  status.classList.remove('text-indigo-400', 'text-emerald-400', 'text-red-400');

  const colors = {
    loading: 'text-indigo-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
  };

  status.classList.add(colors[type] || 'text-zinc-500');
  status.textContent = message;
}

/**
 * Disables or enables the publish button to prevent double submissions.
 *
 * @param {boolean} disabled - Whether to disable the button
 */
function setPublishButtonState(disabled) {
  const btns = [
    document.getElementById('publish-btn'),
    document.getElementById('publish-btn-mobile'),
  ];

  btns.forEach((btn) => {
    if (!btn) return;
    btn.disabled = disabled;
    btn.textContent = disabled ? 'Publishing...' : 'Publish';
    btn.classList.toggle('opacity-50', disabled);
    btn.classList.toggle('cursor-not-allowed', disabled);
  });
}
