// src/pages/contribution/publish.js
// Handles the full tale publishing pipeline.
//
// Flow:
//   1. Validate tale has a title and at least one chapter with content
//   2. Save current draft to Firestore
//   3. Submit to pending_tales collection for review
//   4. Auto-approve (review is bypassed for now — structure exists for future moderation)
//   5. Write approved tale to community_tales (publicly visible)
//   6. Update draft with published status and taleId reference
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
} from '@fb/index.js';
import { state } from './state.js';
import { saveToCloud } from './cloud.js';

/**
 * Runs the full publish pipeline for the current tale.
 * Validates input, saves draft, submits for review, auto-approves,
 * and writes to community_tales.
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
    // -------------------- Step 1: Save draft --------------------
    await saveToCloud();

    // -------------------- Step 2: Submit to pending review --------------------
    const userId = auth.currentUser.uid;
    const authorName = auth.currentUser.displayName || `Scribe ${userId.slice(0, 5)}`;

    const pendingRef = collection(db, 'artifacts', appId, 'public', 'pending_tales');

    const pendingDoc = await addDoc(pendingRef, {
      title: taleTitle,
      authorId: userId,
      authorName,
      chapters: state.chapters.map((ch, idx) => ({
        chapterNum: idx,
        title: ch.title || 'Untitled Chapter',
        content: ch.content || '',
      })),
      chapterCount: state.chapters.length,
      status: 'pending',
      submittedAt: serverTimestamp(),
    });

    // -------------------- Step 3: Auto-approve --------------------
    // Review is bypassed for now. This update exists so future moderation
    // logic can check status before the next step runs.
    await updateDoc(pendingDoc, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
    });

    // -------------------- Step 4: Write to community_tales --------------------
    const communityRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'community_tales',
      pendingDoc.id
    );

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

    // Write each chapter as a subcollection document
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

    // -------------------- Step 5: Update draft with published reference --------------------
    const draftRef = doc(db, 'artifacts', appId, 'users', userId, 'drafts', 'current');

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
 * Extracts a short description from the first chapter's content.
 * Used as the tale description in community_tales if none is provided.
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
 * Updates the status indicator in the editor footer.
 *
 * @param {string} message - Status message to display
 * @param {'loading'|'success'|'error'} type - Visual style
 */
function showStatus(message, type) {
  const status = document.getElementById('stat-status');
  if (!status) return;

  const colors = {
    loading: 'text-indigo-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
  };

  // Remove all color classes first
  status.classList.remove('text-indigo-400', 'text-emerald-400', 'text-red-400');
  status.classList.add(colors[type] || '');
  status.textContent = message;
}

/**
 * Disables or enables the publish button to prevent double submissions.
 *
 * @param {boolean} disabled - Whether to disable the button
 */
function setPublishButtonState(disabled) {
  const btn = document.getElementById('publish-btn');
  if (!btn) return;

  btn.disabled = disabled;
  btn.textContent = disabled ? 'Publishing...' : 'Publish';
  btn.classList.toggle('opacity-50', disabled);
  btn.classList.toggle('cursor-not-allowed', disabled);
}
