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
import { cacheService } from '@services/cache.service.js';
import { getAuthorStatus, registerAuthor } from '@services/author.service.js';
import {
  navigateTo,
  taleUrl,
  countWords,
  estimateReadMins,
  safeAsync,
  guardOffline,
  createLogger,
  validateData,
  TaleSchema,
  DraftChapterSchema,
} from '@/utils';

import { state } from './state.js';
import { saveAllChapters, syncMetadataFromDom } from './cloud.js';

const log = createLogger('Publish');

/* ─────────────────────────────────────────────
   Author Registration Wall Prompt
   ───────────────────────────────────────────── */

/**
 * Displays the Author Registration Wall modal and waits for completion or dismissal.
 *
 * @param {string} userId
 * @param {import('@services/author.service.js').AuthorStatus} [currentStatus]
 * @returns {Promise<import('@services/author.service.js').AuthorStatus|null>}
 */
export function promptAuthorRegistrationWall(userId, currentStatus = null) {
  return new Promise((resolve) => {
    const modal = document.getElementById('author-registration-wall-modal');
    const form = document.getElementById('author-registration-wall-form');
    const penNameInput = document.getElementById('wall-pen-name');
    const emailInput = document.getElementById('wall-author-email');
    const bioInput = document.getElementById('wall-author-bio');
    const errorEl = document.getElementById('wall-form-error');
    const cancelBtn = document.getElementById('btn-cancel-wall');
    const submitBtn = document.getElementById('btn-confirm-wall');
    const submitText = document.getElementById('wall-submit-text');

    if (!modal || !form || !penNameInput || !emailInput) {
      log.warn('Author registration wall modal elements not found in DOM');
      resolve(null);
      return;
    }

    // Prefill inputs
    penNameInput.value = currentStatus?.penName || auth.currentUser?.displayName || '';
    emailInput.value = currentStatus?.authorEmail || auth.currentUser?.email || '';
    if (bioInput) bioInput.value = currentStatus?.authorBio || '';

    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    penNameInput.focus();

    const cleanup = () => {
      form.removeEventListener('submit', handleSubmit);
      if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleKeydown);
    };

    const closeModal = () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      cleanup();
    };

    const handleCancel = () => {
      closeModal();
      resolve(null);
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      const penName = penNameInput.value.trim();
      const authorEmail = emailInput.value.trim();
      const authorBio = bioInput ? bioInput.value.trim() : '';

      if (!penName || penName.length < 2) {
        if (errorEl) {
          errorEl.textContent = 'Please enter a pen name of at least 2 characters.';
          errorEl.classList.remove('hidden');
        }
        penNameInput.focus();
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!authorEmail || !emailRegex.test(authorEmail)) {
        if (errorEl) {
          errorEl.textContent = 'Please enter a valid author correspondence email.';
          errorEl.classList.remove('hidden');
        }
        emailInput.focus();
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Registering…';

      try {
        const updatedStatus = await registerAuthor(userId, {
          penName,
          authorEmail,
          authorBio,
        });
        showToast('Scribe registration sealed! Resuming publication…', 'success');
        closeModal();
        resolve(updatedStatus);
      } catch (err) {
        log.error('Author registration wall submission failed', err);
        if (errorEl) {
          errorEl.textContent = err.message || 'Failed to complete registration.';
          errorEl.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Register & Publish';
      }
    };

    form.addEventListener('submit', handleSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeydown);
  });
}

/* ─────────────────────────────────────────────
   Publish Pipeline
   ───────────────────────────────────────────── */

/**
 * Runs the full publishing pipeline.
 * Validates state, checks author registration wall, writes to tales collection, then redirects.
 */
export async function publishFullTale() {
  log.info('Publish pipeline initiated');
  if (!auth.currentUser) {
    log.warn('Publish requested without authenticated user');
    _setPublishStatus('You must be signed in to publish.', 'error');
    return;
  }

  if (guardOffline()) {
    log.warn('Publish requested while offline');
    _setPublishStatus('You are offline. Connect to publish.', 'error');
    return;
  }

  syncMetadataFromDom();

  /* ── Validation ──────────────────────────────────────────────── */

  if (!state.title?.trim()) {
    log.warn('Publish failed: missing title');
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

  const userId = auth.currentUser.uid;

  /* ── Author Registration Wall ───────────────────────────────── */
  let authorStatus = await safeAsync(getAuthorStatus(userId), {
    fallback: { isAuthor: false, penName: '', authorEmail: '', authorBio: '' },
    logContext: 'pages.contribution.publish.checkAuthorStatus',
  });

  if (!authorStatus?.isAuthor || !authorStatus?.authorEmail) {
    log.info('Author registration required before publishing', { userId });
    _setPublishStatus('Author registration required...', 'loading');
    const registered = await promptAuthorRegistrationWall(userId, authorStatus);
    if (!registered || !registered.isAuthor || !registered.authorEmail) {
      _setPublishStatus('Author registration required before publishing.', 'error');
      _setPublishButtonsDisabled(false);
      return;
    }
    authorStatus = registered;
  }

  _setPublishStatus('Submitting to the archive...', 'loading');
  _setPublishButtonsDisabled(true);

  const taleId = await safeAsync(_doPublish(userId, authorStatus), {
    errorMessage: 'Publishing failed. Your draft is safe — try again.',
    logContext: 'pages.contribution.publish.fullPipeline',
  });

  if (taleId) {
    const successMsg = state.publishedTaleId
      ? 'Legend updated in the archives.'
      : 'Legend recorded in the archives.';
    showToast(successMsg, 'success');
    _setPublishStatus(
      state.publishedTaleId ? 'Updated successfully!' : 'Published successfully!',
      'success'
    );

    setTimeout(() => {
      navigateTo(taleUrl(taleId));
    }, 1500);
  } else {
    _setPublishStatus('Publish failed. Please try again.', 'error');
    _setPublishButtonsDisabled(false);
  }
}

/**
 * Internal logic for the multi-step publishing process.
 * Separated so it can be wrapped by safeCall.
 *
 * @param {string} userId
 * @param {import('@services/author.service.js').AuthorStatus} [authorStatus]
 * @returns {Promise<string>} The published tale ID
 */
async function _doPublish(userId, authorStatus = null) {
  const status = authorStatus || (await getAuthorStatus(userId));
  const authorName =
    status?.penName || auth.currentUser.displayName || `Scribe ${userId.slice(0, 5)}`;
  const authorEmail = status?.authorEmail || '';

  /* ── Branch: Updating an already published tale ──────────── */
  if (state.publishedTaleId) {
    const id = state.publishedTaleId;
    const taleRef = refs.tale(id);

    const description = state.synopsis?.trim() || _extractDescription(state.chapters);
    const wordCount = state.chapters.reduce((acc, ch) => acc + countWords(ch.content), 0);
    const estimatedReadMins = estimateReadMins(wordCount);

    const updatePayload = {
      title: state.title,
      authorName,
      authorEmail,
      description,
      synopsis: state.synopsis || '',
      coverUrl: state.coverUrl || '',
      era: state.era || '',
      tags: state.tags || [],
      tone: state.tone || '',
      language: state.language || 'English',
      visibility: (state.visibility || 'public').toLowerCase(),
      audience: state.audience || 'General',
      publicationStatus: state.publicationStatus || 'ongoing',
      contentWarnings: Array.isArray(state.contentWarnings)
        ? state.contentWarnings
        : state.contentWarnings
          ? [state.contentWarnings]
          : [],
      worldSetting: state.worldSetting || '',
      authorNotes: state.authorNotes || '',
      chapterCount: state.chapters.length,
      wordCount,
      estimatedReadMins,
      searchKeywords: _buildSearchKeywords(state.title, state.tags),
      lastChapterAddedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await safeAsync(updateDoc(taleRef, updatePayload), {
      logContext: 'pages.contribution.publish.updatePublishedTaleDoc',
    });

    /* Write/Update all chapters */
    await safeAsync(
      Promise.all(
        state.chapters.map(async (chapter, index) => {
          const chapterWordCount = countWords(chapter.content);
          const chapterReadMins = estimateReadMins(chapterWordCount);

          const chapterPayload = {
            chapterNum: index + 1,
            title: chapter.title?.trim() || `Fragment ${index + 1}`,
            content: chapter.content || '',
            wordCount: chapterWordCount,
          };

          const chapterValidated = validateData(DraftChapterSchema, chapterPayload);
          if (!chapterValidated.success) {
            throw new Error(`Chapter ${index + 1} Validation Error: ${chapterValidated.error}`);
          }

          await setDoc(
            refs.chapter(id, index),
            {
              ...chapterValidated.data,
              estimatedReadMins: chapterReadMins,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        })
      ),
      { logContext: 'pages.contribution.publish.writePublishedChapters' }
    );

    cacheService.invalidateTale(id);
    cacheService.invalidateTales();

    return id;
  }

  /* ── Step 1: Save all chapters to draft ─────────────────── */
  await safeAsync(saveAllChapters(userId), {
    logContext: 'pages.contribution.publish.saveDraftChapters',
  });

  /* ── Step 2: Determine tale ID ──────────────────────────── */
  const id = state.draftId !== 'new' ? state.draftId : _generateId();
  const taleRef = refs.tale(id);

  /* ── Step 3: Write tale with status=pending ─────────────── */
  const description = state.synopsis?.trim() || _extractDescription(state.chapters);
  const wordCount = state.chapters.reduce((acc, ch) => acc + countWords(ch.content), 0);
  const estimatedReadMins = estimateReadMins(wordCount);

  const talePayload = {
    title: state.title,
    authorId: userId,
    authorName,
    authorEmail,
    authorAvatarUrl: '',
    description,
    synopsis: state.synopsis || '',
    coverUrl: state.coverUrl || '',
    era: state.era || '',
    tags: state.tags || [],
    tone: state.tone || '',
    language: state.language || 'English',
    visibility: (state.visibility || 'public').toLowerCase(),
    audience: state.audience || 'General',
    publicationStatus: state.publicationStatus || 'ongoing',
    contentWarnings: Array.isArray(state.contentWarnings)
      ? state.contentWarnings
      : state.contentWarnings
        ? [state.contentWarnings]
        : [],
    worldSetting: state.worldSetting || '',
    authorNotes: state.authorNotes || '',
    chapterCount: state.chapters.length,
    wordCount,
    estimatedReadMins,
    readCount: 0,
    commentCount: 0,
    reactionCount: 0,
    bookmarkCount: 0,
    status: 'pending',
    isFeatured: false,
    isEditorsPick: false,
    searchKeywords: _buildSearchKeywords(state.title, state.tags),
  };

  const taleValidated = validateData(TaleSchema, talePayload);
  if (!taleValidated.success) {
    throw new Error(`Validation Error: ${taleValidated.error}`);
  }

  await safeAsync(
    setDoc(taleRef, {
      ...taleValidated.data,
      submittedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      moderationNotes: null,
      publishedAt: null,
      lastChapterAddedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }),
    { logContext: 'pages.contribution.publish.writeTaleDoc' }
  );

  /* ── Step 4: Auto-approve (moderation hook) ─────────────── */
  await safeAsync(
    updateDoc(taleRef, {
      status: 'published',
      publishedAt: serverTimestamp(),
      reviewedAt: serverTimestamp(),
      reviewedBy: 'auto-approve',
    }),
    { logContext: 'pages.contribution.publish.autoApprove' }
  );

  /* ── Step 5: Write chapters subcollection ───────────────── */
  await safeAsync(
    Promise.all(
      state.chapters.map(async (chapter, index) => {
        const chapterWordCount = countWords(chapter.content);
        const chapterReadMins = estimateReadMins(chapterWordCount);

        const chapterPayload = {
          chapterNum: index + 1,
          title: chapter.title?.trim() || `Fragment ${index + 1}`,
          content: chapter.content || '',
          wordCount: chapterWordCount,
        };

        const chapterValidated = validateData(DraftChapterSchema, chapterPayload);
        if (!chapterValidated.success) {
          throw new Error(`Chapter ${index + 1} Validation Error: ${chapterValidated.error}`);
        }

        await setDoc(refs.chapter(id, index), {
          ...chapterValidated.data,
          estimatedReadMins: chapterReadMins,
          publishedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    ),
    { logContext: 'pages.contribution.publish.writeChapters' }
  );

  /* ── Step 6: Update draft with published reference ──────── */
  if (state.draftId !== 'new') {
    await safeAsync(
      updateDoc(refs.draft(userId, state.draftId), {
        publishedTaleId: id,
        lastPublishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { logContext: 'pages.contribution.publish.updateDraftRef' }
    );
  }

  return id;
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
  const tagWords = (tags || []).map((t) => t.toLowerCase());
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
    error: 'text-red-400',
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
  const isUpdate = Boolean(state.publishedTaleId);
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
          const defaultLabel = span.dataset.label ?? span.textContent;
          span.textContent = disabled ? (isUpdate ? 'Updating…' : 'Publishing…') : defaultLabel;
        }
      });
    } else {
      btn.textContent = disabled
        ? isUpdate
          ? 'Updating…'
          : 'Publishing…'
        : isUpdate
          ? 'Update'
          : 'Publish';
    }
  });
}

log.debug('Publish initialized');
