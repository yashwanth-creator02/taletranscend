// src/pages/tale/comments.js
// Comment (Reflections & Echoes) system with threaded replies and pagination.
// Uses refs.comments() and refs.comment() exclusively — no raw path strings.

import {
  auth,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  collection,
  refs,
  db,
} from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { createComment } from '@state/index.js';
import {
  escapeHtml,
  createLogger,
  checkRateLimit,
  getRemainingTime,
  applyButtonCooldown,
  validateData,
  CommentSchema,
} from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { PATHS } from '@fb/paths.js';

const log = createLogger('Comments');
const PAGE_SIZE = 10;
const COMMENT_COOLDOWN_MS = 30000; // 30s

let _lastVisible = null;
let _allLoaded = false;
let _currentTaleId = null;
let _taleAuthorId = null;
let _isFetching = false;

/* ─────────────────────────────────────────────
   Init
   ───────────────────────────────────────────── */

/**
 * Initialises the comment section and loads the first page of comments.
 *
 * @param {string} taleId
 * @param {string|null} [taleAuthorId=null]
 */
export async function listenToComments(taleId, taleAuthorId = null) {
  _currentTaleId = taleId;
  _taleAuthorId = taleAuthorId;

  if (!_taleAuthorId && taleId) {
    try {
      const snap = await getDoc(refs.tale(taleId));
      if (snap?.exists?.()) {
        _taleAuthorId = snap.data()?.authorId || null;
      }
    } catch {
      // ignore
    }
  }

  log.info('Initializing reflections and echoes (comments)', {
    taleId,
    taleAuthorId: _taleAuthorId,
  });
  const list = document.getElementById('comments-list');
  if (!list) return;

  _bindDelegatedEvents(list);
  await _fetchComments(true);
}

/* ─────────────────────────────────────────────
   Post
   ───────────────────────────────────────────── */

/**
 * Submits a new top-level comment and refreshes the list.
 *
 * @param {string} taleId
 */
export async function postComment(taleId) {
  const input = document.getElementById('comment-text');
  const text = input?.value.trim();
  if (!text || !auth.currentUser) return;

  // Rate Limiting
  const userId = auth.currentUser.uid;
  const rateLimitKey = `comment:${userId}`;
  const btn = document.getElementById('post-btn');
  const originalText = 'Post Echo';

  if (!checkRateLimit(rateLimitKey, COMMENT_COOLDOWN_MS)) {
    showToast('Please wait before transmitting another echo.', 'warning');
    applyButtonCooldown(btn, COMMENT_COOLDOWN_MS, originalText, () =>
      getRemainingTime(rateLimitKey, COMMENT_COOLDOWN_MS)
    );
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Transmitting...';
  }

  // Validation
  const payload = {
    taleId,
    text,
    type: 'general',
    authorId: userId,
    authorName: auth.currentUser.displayName || 'Anonymous Scribe',
    authorAvatarUrl: '',
    depth: 0,
  };

  const validated = validateData(CommentSchema, payload);
  if (!validated.success) {
    showToast(validated.error, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
    return;
  }

  try {
    await addDoc(refs.comments(taleId), {
      ...validated.data,
      chapterIndex: null,
      parentId: null,
      replyCount: 0,
      likeCount: 0,
      isEdited: false,
      editedAt: null,
      isPinned: false,
      isHidden: false,
      reportCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (input) input.value = '';
    showToast('Echo transmitted to the weave.', 'success');
    await _fetchComments(true);

    // Start cooldown timer after success
    applyButtonCooldown(btn, COMMENT_COOLDOWN_MS, originalText, () =>
      getRemainingTime(rateLimitKey, COMMENT_COOLDOWN_MS)
    );
  } catch (err) {
    log.error('Post failed', err);
    showToast('Failed to post reflection. Please check your connection.', 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
}

/* ─────────────────────────────────────────────
   Fetch
   ───────────────────────────────────────────── */

async function _fetchComments(isInitial = false) {
  if (_isFetching || (_allLoaded && !isInitial)) return;
  _isFetching = true;

  const list = document.getElementById('comments-list');
  if (!list) {
    _isFetching = false;
    return;
  }

  if (isInitial) {
    list.innerHTML = `<div class="py-10 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronising Echoes...</div>`;
    _lastVisible = null;
    _allLoaded = false;
  }

  try {
    // Bug fix: was ordering by 'timestamp' — schema field is 'createdAt'
    const q = isInitial
      ? query(refs.comments(_currentTaleId), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))
      : query(
          refs.comments(_currentTaleId),
          orderBy('createdAt', 'desc'),
          startAfter(_lastVisible),
          limit(PAGE_SIZE)
        );

    const snap = await getDocs(q);

    if (isInitial) list.innerHTML = '';

    if (snap.empty && isInitial) {
      list.innerHTML = `<p class="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] text-center py-20">The echoes remain silent.</p>`;
      _isFetching = false;
      return;
    }

    _lastVisible = snap.docs[snap.docs.length - 1];
    _allLoaded = snap.docs.length < PAGE_SIZE;

    // Normalize through schema
    const comments = snap.docs.map((d) => createComment(d.id, d.data()));

    document.getElementById('load-more-btn-container')?.remove();

    list.insertAdjacentHTML('beforeend', comments.map(_renderComment).join(''));

    // Fetch replies for each newly rendered comment
    await Promise.all(comments.map((c) => _fetchReplies(c.id)));

    if (!_allLoaded) {
      list.insertAdjacentHTML(
        'beforeend',
        `<div id="load-more-btn-container" class="text-center pt-10">
          <button id="load-more-btn" class="px-8 py-3.5 glass-strong rounded-xl text-[9px] font-black uppercase tracking-[0.4em] text-indigo-300 hover:text-white transition-all">
            Retrieve More Echoes
          </button>
        </div>`
      );
      document
        .getElementById('load-more-btn')
        ?.addEventListener('click', () => _fetchComments(false));
    }

    initIcons(list);
  } catch (err) {
    log.error('Fetch failed', err);
  } finally {
    _isFetching = false;
  }
}

/* ─────────────────────────────────────────────
   Replies
   ───────────────────────────────────────────── */

async function _fetchReplies(commentId) {
  const container = document.getElementById(`replies-${commentId}`);
  if (!container) return;

  try {
    const repliesRef = refs.commentReplies
      ? refs.commentReplies(_currentTaleId, commentId)
      : collection(db, `${PATHS.publicTaleComment(_currentTaleId, commentId)}/replies`);

    const snap = await getDocs(query(repliesRef, orderBy('createdAt', 'asc'), limit(20)));

    if (snap.empty) return;

    container.innerHTML = snap.docs
      .map((d) => _renderReply({ id: d.id, parentId: commentId, ...d.data() }))
      .join('');
    initIcons(container);
  } catch (err) {
    log.error('Fetch replies failed', err);
  }
}

async function _handlePostReply(commentId, btn) {
  const input = document.getElementById(`reply-text-${commentId}`);
  const text = input?.value.trim();
  if (!text || !auth.currentUser) return;

  // Rate Limiting
  const userId = auth.currentUser.uid;
  const rateLimitKey = `comment:${userId}`;
  const originalText = 'Transmit';

  if (!checkRateLimit(rateLimitKey, COMMENT_COOLDOWN_MS)) {
    showToast('Please wait before transmitting another echo.', 'warning');
    applyButtonCooldown(btn, COMMENT_COOLDOWN_MS, originalText, () =>
      getRemainingTime(rateLimitKey, COMMENT_COOLDOWN_MS)
    );
    return;
  }

  btn.disabled = true;
  btn.textContent = '...';

  // Validation
  const payload = {
    taleId: _currentTaleId,
    text,
    type: 'general',
    authorId: userId,
    authorName: auth.currentUser.displayName || 'Anonymous Scribe',
    authorAvatarUrl: '',
    parentId: commentId,
    depth: 1, // Replies are always depth 1 for now in this UI
  };

  const validated = validateData(CommentSchema, payload);
  if (!validated.success) {
    showToast(validated.error, 'error');
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  try {
    const repliesRef = refs.commentReplies
      ? refs.commentReplies(_currentTaleId, commentId)
      : collection(db, `${PATHS.publicTaleComment(_currentTaleId, commentId)}/replies`);

    await addDoc(repliesRef, {
      ...validated.data,
      isEdited: false,
      editedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (input) input.value = '';
    document.getElementById(`reply-form-${commentId}`)?.classList.add('hidden');
    showToast('Echo back recorded.', 'success');
    await _fetchReplies(commentId);

    // The button is inside a form that might have been hidden, but let's apply anyway
    applyButtonCooldown(btn, COMMENT_COOLDOWN_MS, originalText, () =>
      getRemainingTime(rateLimitKey, COMMENT_COOLDOWN_MS)
    );
  } catch (err) {
    log.error('Post reply failed', err);
    showToast('Failed to echo back.', 'error');
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

/* ─────────────────────────────────────────────
   Edit Comment / Reply Operations
   ───────────────────────────────────────────── */

/**
 * Updates an existing comment's text and marks it as edited.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @param {string} newText
 */
export async function editComment(taleId, commentId, newText) {
  return updateDoc(refs.comment(taleId, commentId), {
    text: newText,
    isEdited: true,
    editedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Updates an existing reply's text and marks it as edited.
 *
 * @param {string} taleId
 * @param {string} commentId
 * @param {string} replyId
 * @param {string} newText
 */
export async function editReply(taleId, commentId, replyId, newText) {
  const replyRef = refs.commentReply
    ? refs.commentReply(taleId, commentId, replyId)
    : doc(db, `${PATHS.publicTaleComment(taleId, commentId)}/replies/${replyId}`);

  return updateDoc(replyRef, {
    text: newText,
    isEdited: true,
    editedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function _handleSaveEditComment(commentId, btn) {
  const textarea = document.getElementById(`comment-edit-text-${commentId}`);
  const newText = textarea?.value?.trim();
  if (!newText) {
    showToast('Echo cannot be empty.', 'warning');
    return;
  }

  if (!auth.currentUser) {
    showToast('Please sign in to edit your echo.', 'warning');
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';

  try {
    await editComment(_currentTaleId, commentId, newText);

    const textDisplay = document.getElementById(`comment-text-display-${commentId}`);
    if (textDisplay) textDisplay.textContent = newText;

    const tagsContainer = document.getElementById(`comment-tags-${commentId}`);
    if (tagsContainer && !tagsContainer.querySelector('.edited-badge')) {
      tagsContainer.insertAdjacentHTML(
        'beforeend',
        `<span class="edited-badge edited-tag inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-bold uppercase tracking-wider text-slate-400" title="Edited"><i data-lucide="edit-3" class="w-2.5 h-2.5"></i> Edited</span>`
      );
      initIcons(tagsContainer);
    }

    document.getElementById(`comment-edit-form-${commentId}`)?.classList.add('hidden');
    textDisplay?.classList.remove('hidden');
    showToast('Echo updated.', 'success');
  } catch (err) {
    log.error('Edit comment failed', err);
    showToast('Failed to update echo.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function _handleSaveEditReply(commentId, replyId, btn) {
  const textarea = document.getElementById(`reply-edit-text-${replyId}`);
  const newText = textarea?.value?.trim();
  if (!newText) {
    showToast('Reply cannot be empty.', 'warning');
    return;
  }

  if (!auth.currentUser) {
    showToast('Please sign in to edit your reply.', 'warning');
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';

  try {
    await editReply(_currentTaleId, commentId, replyId, newText);

    const textDisplay = document.getElementById(`reply-text-display-${replyId}`);
    if (textDisplay) textDisplay.textContent = newText;

    const tagsContainer = document.getElementById(`reply-tags-${replyId}`);
    if (tagsContainer && !tagsContainer.querySelector('.edited-badge')) {
      tagsContainer.insertAdjacentHTML(
        'beforeend',
        `<span class="edited-badge edited-tag inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[7px] font-bold uppercase tracking-wider text-slate-400" title="Edited"><i data-lucide="edit-3" class="w-2 h-2"></i> Edited</span>`
      );
      initIcons(tagsContainer);
    }

    document.getElementById(`reply-edit-form-${replyId}`)?.classList.add('hidden');
    textDisplay?.classList.remove('hidden');
    showToast('Reply updated.', 'success');
  } catch (err) {
    log.error('Edit reply failed', err);
    showToast('Failed to update reply.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function _handleDeleteReply(commentId, replyId) {
  if (
    typeof window !== 'undefined' &&
    window.confirm &&
    !window.confirm('Silence this reply from the weave permanently?')
  ) {
    return;
  }

  try {
    const replyRef = refs.commentReply
      ? refs.commentReply(_currentTaleId, commentId, replyId)
      : doc(db, `${PATHS.publicTaleComment(_currentTaleId, commentId)}/replies/${replyId}`);

    await deleteDoc(replyRef);
    document.getElementById(`reply-${replyId}`)?.remove();
    showToast('Reply silenced.', 'success');
  } catch (err) {
    log.error('Failed to delete reply:', err);
    showToast('Failed to silence reply.', 'error');
  }
}

/* ─────────────────────────────────────────────
   Templates
   ───────────────────────────────────────────── */

/**
 * @param {import('@state/schemas/tale.schema.js').Comment} c
 * @returns {string}
 */
function _renderComment(c) {
  const date = c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
  const seed = encodeURIComponent((c.authorId || 'scribe').slice(0, 8));
  const isOwner = auth.currentUser?.uid && auth.currentUser.uid === c.authorId;
  const isTaleAuthor = Boolean(_taleAuthorId && c.authorId && c.authorId === _taleAuthorId);
  const authorBadgeHtml = isTaleAuthor
    ? `<span class="author-tag px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-[8px] font-black uppercase tracking-wider text-indigo-300">Author</span>`
    : '';
  const isEdited = Boolean(c.isEdited);
  const editedBadgeHtml = isEdited
    ? `<span class="edited-badge edited-tag inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-bold uppercase tracking-wider text-slate-400" title="Edited"><i data-lucide="edit-3" class="w-2.5 h-2.5"></i> Edited</span>`
    : '';

  const editBtnHtml = isOwner
    ? `<button
        class="edit-comment-trigger group flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-indigo-300 hover:text-white transition-all ml-1"
        type="button"
        data-comment-id="${c.id}"
        aria-label="Edit Echo"
        title="Edit Echo"
      >
        <i data-lucide="edit-3" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
        <span>Edit</span>
      </button>`
    : '';

  const deleteBtnHtml = isOwner
    ? `<button
        class="delete-comment-trigger group flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-red-400/70 hover:text-red-400 transition-all ml-1"
        type="button"
        data-comment-id="${c.id}"
        aria-label="Silence Echo"
        title="Silence Echo"
      >
        <i data-lucide="trash-2" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
        <span>Silence</span>
      </button>`
    : '';

  return `
    <div class="glass-card p-6 md:p-8 rounded-4xl border-l-4 border-indigo-500/40 animate-fade-in mb-6 last:mb-0" id="comment-${c.id}">
      <div class="flex justify-between items-start mb-5">
        <div class="flex items-center gap-3">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}"
            alt="${escapeHtml(c.authorName)}"
            class="w-8 h-8 rounded-lg bg-white/5"
            loading="lazy"
          />
          <div>
            <div class="flex items-center gap-2 flex-wrap" id="comment-tags-${c.id}">
              <p class="text-[10px] font-black text-white uppercase tracking-widest">${escapeHtml(c.authorName)}</p>
              ${authorBadgeHtml}
              ${editedBadgeHtml}
            </div>
            <p class="text-[8px] text-slate-400 font-bold uppercase mt-0.5">${date}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
          <button
            class="reply-trigger group flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-all"
            type="button"
            data-comment-id="${c.id}"
          >
            <i data-lucide="message-square-plus" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
            <span>Echo Back</span>
          </button>
          ${editBtnHtml}
          ${deleteBtnHtml}
        </div>
      </div>

      <div id="comment-body-${c.id}">
        <p id="comment-text-display-${c.id}" class="text-sm md:text-base text-slate-200 leading-relaxed font-medium">${escapeHtml(c.text)}</p>
        <div id="comment-edit-form-${c.id}" class="hidden mt-3">
          <textarea
            id="comment-edit-text-${c.id}"
            placeholder="Edit your echo…"
            class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 resize-y min-h-20"
            maxlength="5000"
          >${escapeHtml(c.text)}</textarea>
          <div class="flex justify-end gap-2 mt-2">
            <button
              type="button"
              class="cancel-edit-trigger py-1.5 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
              data-comment-id="${c.id}"
            >Cancel</button>
            <button
              type="button"
              class="save-edit-trigger py-1.5 px-4 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500/30 hover:text-white transition-all"
              data-comment-id="${c.id}"
            >Save</button>
          </div>
        </div>
      </div>

      <div id="replies-${c.id}" class="mt-8 space-y-4 border-l border-white/5 pl-6 empty:hidden"></div>

      <div id="reply-form-${c.id}" class="hidden mt-8 pt-6 border-t border-white/3">
        <div class="relative">
          <textarea
            id="reply-text-${c.id}"
            placeholder="Respond to the echo…"
            class="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 resize-none min-h-20"
          ></textarea>
          <div class="flex justify-end gap-3 mt-3">
            <button
              type="button"
              class="cancel-reply py-2 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
              data-comment-id="${c.id}"
            >Cancel</button>
            <button
              type="button"
              class="submit-reply py-2 px-6 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500/20"
              data-comment-id="${c.id}"
            >Transmit</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _renderReply(r) {
  const date = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
  const seed = encodeURIComponent((r.authorId || 'scribe').slice(0, 8));
  const isOwner = auth.currentUser?.uid && auth.currentUser.uid === r.authorId;
  const isTaleAuthor = Boolean(_taleAuthorId && r.authorId && r.authorId === _taleAuthorId);
  const authorBadgeHtml = isTaleAuthor
    ? `<span class="author-tag px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-[7px] font-black uppercase tracking-wider text-indigo-300">Author</span>`
    : '';
  const isEdited = Boolean(r.isEdited);
  const editedBadgeHtml = isEdited
    ? `<span class="edited-badge edited-tag inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[7px] font-bold uppercase tracking-wider text-slate-400" title="Edited"><i data-lucide="edit-3" class="w-2 h-2"></i> Edited</span>`
    : '';

  const editBtnHtml =
    isOwner && r.id
      ? `<button
        class="edit-reply-trigger group flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.2em] text-indigo-300 hover:text-white transition-all ml-1"
        type="button"
        data-comment-id="${r.parentId || ''}"
        data-reply-id="${r.id}"
        aria-label="Edit Reply"
        title="Edit Reply"
      >
        <i data-lucide="edit-3" class="w-2.5 h-2.5"></i>
        <span>Edit</span>
      </button>`
      : '';

  const deleteBtnHtml =
    isOwner && r.id
      ? `<button
        class="delete-reply-trigger group flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.2em] text-red-400/70 hover:text-red-400 transition-all ml-1"
        type="button"
        data-comment-id="${r.parentId || ''}"
        data-reply-id="${r.id}"
        aria-label="Silence Reply"
        title="Silence Reply"
      >
        <i data-lucide="trash-2" class="w-2.5 h-2.5"></i>
        <span>Silence</span>
      </button>`
      : '';

  return `
    <div class="flex gap-4 animate-fade-in" id="reply-${r.id || ''}">
      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}" alt="Scribe" class="w-6 h-6 rounded-md bg-white/5 opacity-60" />
      <div class="flex-1">
        <div class="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <div class="flex items-center gap-2 flex-wrap" id="reply-tags-${r.id || ''}">
            <span class="text-[9px] font-black text-slate-200 uppercase tracking-widest">${escapeHtml(r.authorName || 'Scribe')}</span>
            ${authorBadgeHtml}
            ${editedBadgeHtml}
            <span class="text-[7px] text-slate-400 font-bold uppercase">${date}</span>
          </div>
          <div class="flex items-center gap-2">
            ${editBtnHtml}
            ${deleteBtnHtml}
          </div>
        </div>
        <div id="reply-body-${r.id || ''}">
          <p id="reply-text-display-${r.id || ''}" class="text-xs text-slate-300 leading-relaxed font-medium">${escapeHtml(r.text || '')}</p>
          <div id="reply-edit-form-${r.id || ''}" class="hidden mt-2">
            <textarea
              id="reply-edit-text-${r.id || ''}"
              placeholder="Edit your reply…"
              class="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 resize-y min-h-16"
              maxlength="5000"
            >${escapeHtml(r.text || '')}</textarea>
            <div class="flex justify-end gap-2 mt-2">
              <button
                type="button"
                class="cancel-reply-edit-trigger py-1 px-2.5 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                data-reply-id="${r.id || ''}"
              >Cancel</button>
              <button
                type="button"
                class="save-reply-edit-trigger py-1 px-3 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[8px] font-black uppercase tracking-widest hover:bg-indigo-500/30 hover:text-white transition-all"
                data-comment-id="${r.parentId || ''}"
                data-reply-id="${r.id || ''}"
              >Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Event Delegation
   ───────────────────────────────────────────── */

function _bindDelegatedEvents(list) {
  list.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const commentId = target.dataset.commentId;
    const replyId = target.dataset.replyId;

    if (target.classList.contains('reply-trigger') && commentId) {
      document.getElementById(`reply-form-${commentId}`)?.classList.remove('hidden');
      document.getElementById(`reply-text-${commentId}`)?.focus();
      return;
    }

    if (target.classList.contains('cancel-reply') && commentId) {
      document.getElementById(`reply-form-${commentId}`)?.classList.add('hidden');
      return;
    }

    if (target.classList.contains('submit-reply') && commentId) {
      await _handlePostReply(commentId, target);
      return;
    }

    if (target.classList.contains('edit-comment-trigger') && commentId) {
      document.getElementById(`comment-text-display-${commentId}`)?.classList.add('hidden');
      document.getElementById(`comment-edit-form-${commentId}`)?.classList.remove('hidden');
      document.getElementById(`comment-edit-text-${commentId}`)?.focus();
      return;
    }

    if (target.classList.contains('cancel-edit-trigger') && commentId) {
      const textDisplay = document.getElementById(`comment-text-display-${commentId}`);
      const input = document.getElementById(`comment-edit-text-${commentId}`);
      if (textDisplay && input) input.value = textDisplay.textContent.trim();
      document.getElementById(`comment-edit-form-${commentId}`)?.classList.add('hidden');
      textDisplay?.classList.remove('hidden');
      return;
    }

    if (target.classList.contains('save-edit-trigger') && commentId) {
      await _handleSaveEditComment(commentId, target);
      return;
    }

    if (target.classList.contains('delete-comment-trigger') && commentId) {
      if (
        typeof window !== 'undefined' &&
        window.confirm &&
        !window.confirm('Silence this echo from the weave permanently?')
      ) {
        return;
      }
      try {
        await deleteDoc(refs.comment(_currentTaleId, commentId));
        document.getElementById(`comment-${commentId}`)?.remove();
        showToast('Echo silenced.', 'success');
      } catch (err) {
        log.error('Failed to delete echo:', err);
        showToast('Failed to silence echo.', 'error');
      }
      return;
    }

    if (target.classList.contains('edit-reply-trigger') && replyId) {
      document.getElementById(`reply-text-display-${replyId}`)?.classList.add('hidden');
      document.getElementById(`reply-edit-form-${replyId}`)?.classList.remove('hidden');
      document.getElementById(`reply-edit-text-${replyId}`)?.focus();
      return;
    }

    if (target.classList.contains('cancel-reply-edit-trigger') && replyId) {
      const textDisplay = document.getElementById(`reply-text-display-${replyId}`);
      const input = document.getElementById(`reply-edit-text-${replyId}`);
      if (textDisplay && input) input.value = textDisplay.textContent.trim();
      document.getElementById(`reply-edit-form-${replyId}`)?.classList.add('hidden');
      textDisplay?.classList.remove('hidden');
      return;
    }

    if (target.classList.contains('save-reply-edit-trigger') && replyId) {
      await _handleSaveEditReply(commentId, replyId, target);
      return;
    }

    if (target.classList.contains('delete-reply-trigger') && replyId) {
      await _handleDeleteReply(commentId, replyId);
      return;
    }
  });
}
