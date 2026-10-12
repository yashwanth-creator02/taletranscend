// src/pages/reader/reader.js
// Reader page entry point.
// Orchestrates auth, content loading, theme init, progress tracking, and all panel interactions.

import '@css/base.css';
import '@css/reader-themes.css';
import '@css/components.css';
import '@css/pages/reader.css';

// nav.css is deliberately not imported here. The reader is an immersive
// layout with its own top bar and sidebar (both defined in
// pages/reader.css) rather than the shared .app-nav / mobile dock — this
// page never calls initNav(), so nav.css's ~700 lines matched nothing and
// were pure dead weight on the single most performance-sensitive page in
// the app.

import {
  initAuth,
  readerState,
  initTheme,
  applyCloudPrefs,
  setTheme,
  setFontFamily,
  setFontSize,
  setLineHeight,
  setMeasure,
  loadReaderMeta,
  loadReaderChapter,
  applyNavigation,
  bindScrollProgress,
  restoreScrollProgress,
  updateReaderProgress,
  getChapterProgress,
  saveReaderProgress,
  scheduleProgressSync,
  initIcons,
  showReaderSkeletons,
  updateTOCScrollSpy,
  goBackToTale,
  renderThemePanel,
  renderTypographyPanel,
  renderSharePanel,
  renderTocPanel,
  renderHighlightsPanel,
  renderCommentsPanel,
  renderTTSPanel,
  renderInfoPanel,
  appState,
  setAppUser,
  setAppReaderPrefs,
  addToBookmarks,
  removeFromBookmarks,
  isBookmarked,
} from './index.js';

import {
  getDoc,
  setDoc,
  serverTimestamp,
  refs,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import {
  navigateTo,
  readerUrl,
  initPageReveal,
  readyReveal,
  setupAuthTimeout,
  createLogger,
} from '@/utils';
import { TTS_CHAR_LIMIT } from '@config/app.config.js';

const log = createLogger('Reader');

// Hide body immediately to prevent flash of unstyled content
initPageReveal();

/* ─────────────────────────────────────────────
   URL Params
   ─────────────────────────────────────────────
   Supports both:
     /tales/{taleId}/read/{chapterIndex}   (hierarchical — canonical)
     /reader?taleId={id}&chapterId={ch}    (legacy query-string — backwards compat)
   ───────────────────────────────────────────── */

/**
 * Extracts taleId and chapterIndex from any hierarchical or query URL pattern.
 * Supports:
 *   - /tales/:id/read/:ch
 *   - /tales/:id/(read|chapters?|fragments?)/:ch?
 *   - /reader/:id/:ch?
 *   - /reader?taleId=:id&chapterId=:ch
 *   - /reader?id=:id&chapter=:ch
 */
export function extractReaderParams() {
  if (typeof window === 'undefined') return { taleId: '', chapterIndex: 0 };

  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname || '';

  const talesMatch = pathname.match(
    /\/tales\/([^/]+)(?:\/(?:read|chapters?|fragments?)(?:\/(\d+))?)?/
  );
  const readerMatch = pathname.match(/\/reader(?:\/([^/]+))?(?:\/(\d+))?/);

  let taleId = '';
  let chapterIndex = 0;

  if (talesMatch && talesMatch[1]) {
    taleId = decodeURIComponent(talesMatch[1]);
    if (talesMatch[2] !== undefined) {
      chapterIndex = parseInt(talesMatch[2], 10);
    }
  } else if (readerMatch && readerMatch[1]) {
    taleId = decodeURIComponent(readerMatch[1]);
    if (readerMatch[2] !== undefined) {
      chapterIndex = parseInt(readerMatch[2], 10);
    }
  }

  // Fallback to query params if not found in path
  if (!taleId) {
    taleId = params.get('taleId') || params.get('id') || '';
  }

  // Query params can override or specify chapter
  const queryCh =
    params.get('chapterId') || params.get('chapter') || params.get('fragment') || params.get('ch');
  if (queryCh !== null && queryCh !== undefined) {
    const parsed = parseInt(queryCh, 10);
    if (!isNaN(parsed)) {
      chapterIndex = parsed;
    }
  }

  return { taleId, chapterIndex: isNaN(chapterIndex) ? 0 : chapterIndex };
}

const { taleId, chapterIndex } = extractReaderParams();
readerState.taleId = taleId;
readerState.chapterIndex = chapterIndex;

/* ─────────────────────────────────────────────
   Panel Config
   ───────────────────────────────────────────── */

const PANEL_TITLES = {
  toc: 'Table of Contents',
  type: 'Typography',
  theme: 'Theme',
  highlights: 'Your Highlights',
  share: 'Share This Piece',
  tts: 'Listen',
  info: 'About this piece',
};

const SIDEBAR_TOOLS = [
  { id: 'toc', icon: 'list', label: 'Contents' },
  { id: 'type', icon: 'type', label: 'Typography' },
  { id: 'theme', icon: 'palette', label: 'Themes' },
  { id: 'highlights', icon: 'highlighter', label: 'Highlights' },
  { id: 'share', icon: 'share-2', label: 'Share' },
  { id: 'tts', icon: 'volume-2', label: 'Listen' },
  { id: 'info', icon: 'info', label: 'About' },
];

/* ─────────────────────────────────────────────
   Sidebar
   ───────────────────────────────────────────── */

function initSidebar() {
  const container = document.getElementById('sidebar-tools');
  if (!container) return;

  container.innerHTML = SIDEBAR_TOOLS.map(
    (tool) => `
    <div class="relative group">
      <button class="glyph-btn" data-tool="${tool.id}" aria-label="${tool.label}">
        <i data-lucide="${tool.icon}"></i>
      </button>
      <div class="tool-tooltip">${tool.label}</div>
    </div>
  `
  ).join('');

  document.getElementById('collapse-btn')?.addEventListener('click', () => {
    _isPanelVisible() ? closePanel() : openPanel('toc');
  });

  _updateCollapseIcon();

  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const toolId = btn.dataset.tool;
      if (readerState.openTool === toolId && _isPanelVisible()) {
        closePanel();
      } else {
        openPanel(toolId);
      }
    });
  });

  document.getElementById('sidebar-focus')?.addEventListener('click', toggleFocusMode);
  document.getElementById('focus-exit')?.addEventListener('click', toggleFocusMode);
}

function openPanel(toolId) {
  readerState.openTool = toolId;
  readerState.isCollapsed = false;

  const panel = document.getElementById('tool-panel');
  const title = document.getElementById('panel-title');
  const content = document.getElementById('panel-content');

  if (!panel || !title || !content) return;

  title.textContent = PANEL_TITLES[toolId] || 'Panel';

  _refreshPanelContent();

  panel.classList.add('visible');
  panel.style.display = 'flex';

  if (window.innerWidth < 1024) {
    document.getElementById('tool-panel-backdrop')?.classList.add('visible');
  }

  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.dataset.active = btn.dataset.tool === toolId;
  });

  _updateCollapseIcon();
  initIcons();
}

function _refreshPanelContent() {
  const toolId = readerState.openTool;
  const content = document.getElementById('panel-content');
  if (!content || !toolId) return;

  if (toolId === 'toc') {
    content.innerHTML = renderTocPanel(
      readerState.chapters,
      readerState.currentChapterId,
      readerState.progress,
      readerState.activeSection,
      readerState.taleTitle
    );
    _bindTocEvents();
  } else if (toolId === 'type') {
    content.innerHTML = renderTypographyPanel(readerState);
    _bindTypographyEvents();
  } else if (toolId === 'theme') {
    content.innerHTML = renderThemePanel(readerState.theme);
    _bindThemeEvents();
  } else if (toolId === 'highlights') {
    content.innerHTML = renderHighlightsPanel(readerState.highlights);
    _bindHighlightEvents();
  } else if (toolId === 'share') {
    content.innerHTML = renderSharePanel();
    _bindShareEvents();
  } else if (toolId === 'tts') {
    content.innerHTML = renderTTSPanel(readerState.tts.playing, readerState.tts.rate);
    _bindTTSEvents();
  } else if (toolId === 'info') {
    content.innerHTML = renderInfoPanel(readerState);
  }

  initIcons();
}

function closePanel() {
  const panel = document.getElementById('tool-panel');
  if (panel) {
    panel.classList.remove('visible');
    panel.style.display = 'none';
  }

  document.getElementById('tool-panel-backdrop')?.classList.remove('visible');

  readerState.openTool = null;
  readerState.isCollapsed = true;

  document.querySelectorAll('[data-tool]').forEach((btn) => (btn.dataset.active = 'false'));
  _updateCollapseIcon();
  initIcons();
}

function toggleFocusMode() {
  readerState.focusMode = !readerState.focusMode;

  document.body.classList.toggle('focus-mode', readerState.focusMode);
  document.getElementById('sidebar')?.classList.toggle('hidden', readerState.focusMode);
  document.getElementById('mobile-toolbar')?.classList.toggle('hidden', readerState.focusMode);

  if (readerState.focusMode) closePanel();

  const focusBtns = document.querySelectorAll(
    '#sidebar-focus, #sidebar-focus-mobile, #top-bar-focus'
  );
  focusBtns.forEach((b) => {
    b.dataset.active = String(readerState.focusMode);
    b.setAttribute('aria-label', readerState.focusMode ? 'Exit focus mode' : 'Focus mode');
    b.setAttribute('title', readerState.focusMode ? 'Exit focus' : 'Focus mode');
    b.innerHTML = `<i data-lucide="${readerState.focusMode ? 'minimize-2' : 'maximize-2'}" style="width: 15px; height: 15px"></i>`;
  });

  initIcons();
}

function _isPanelVisible() {
  return document.getElementById('tool-panel')?.classList.contains('visible');
}

function _updateCollapseIcon() {
  const isVisible = _isPanelVisible();
  const collapseIcon = document.getElementById('collapse-icon');

  document.getElementById('sidebar')?.classList.toggle('collapsed', !isVisible);

  if (collapseIcon) {
    collapseIcon.setAttribute('data-lucide', isVisible ? 'chevron-left' : 'chevron-right');
  }
}

/* ─────────────────────────────────────────────
   Panel Event Binders
   ───────────────────────────────────────────── */

function _bindTocEvents() {
  document.querySelectorAll('[data-chapter-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = readerState.chapters.findIndex((c) => c.id === btn.dataset.chapterId);
      if (idx !== -1 && readerState.taleId) {
        navigateTo(readerUrl(readerState.taleId, idx));
      }
    });
  });

  document.querySelectorAll('[data-section-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.sectionId);
      const scroller = document.getElementById('scroller');
      if (target && scroller) {
        const top =
          target.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop -
          32;
        scroller.scrollTo({ top, behavior: 'smooth' });
        if (window.innerWidth < 1024) closePanel();
      }
    });
  });
}

function _bindTypographyEvents() {
  document.getElementById('font-size')?.addEventListener('input', (e) => {
    setFontSize(e.target.value);
    _refreshPanelContent();
  });
  document.getElementById('fs-range')?.addEventListener('input', (e) => {
    setFontSize(e.target.value);
    _refreshPanelContent();
  });
  document.getElementById('fs-minus')?.addEventListener('click', () => {
    setFontSize(readerState.fontSize - 1);
    _refreshPanelContent();
  });
  document.getElementById('fs-plus')?.addEventListener('click', () => {
    setFontSize(readerState.fontSize + 1);
    _refreshPanelContent();
  });

  document.getElementById('line-height-input')?.addEventListener('input', (e) => {
    setLineHeight(e.target.value);
    _refreshPanelContent();
  });
  document.querySelectorAll('[data-lh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLineHeight(parseFloat(btn.dataset.lh));
      _refreshPanelContent();
    });
  });

  document.getElementById('measure')?.addEventListener('input', (e) => {
    setMeasure(e.target.value);
    _refreshPanelContent();
  });
  document.getElementById('mw-range')?.addEventListener('input', (e) => {
    setMeasure(e.target.value);
    _refreshPanelContent();
  });

  document.querySelectorAll('[data-font]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFontFamily(btn.dataset.font);
      _refreshPanelContent();
    });
  });
}

function _bindThemeEvents() {
  document.querySelectorAll('[data-theme-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeId);
      _refreshPanelContent();
    });
  });
}

function _getHighlightStorageKey(tid, chIdx) {
  return `tt_highlights_${tid}_${chIdx}`;
}

function _loadHighlights() {
  if (!readerState.taleId) return;
  try {
    const raw = localStorage.getItem(
      _getHighlightStorageKey(readerState.taleId, readerState.chapterIndex)
    );
    if (raw) {
      readerState.highlights = JSON.parse(raw);
    } else {
      readerState.highlights = [];
    }
  } catch (err) {
    log.warn('Could not load highlights from localStorage:', err);
    readerState.highlights = [];
  }
}

function _saveHighlights() {
  if (!readerState.taleId) return;
  try {
    localStorage.setItem(
      _getHighlightStorageKey(readerState.taleId, readerState.chapterIndex),
      JSON.stringify(readerState.highlights)
    );
  } catch (err) {
    log.warn('Could not save highlights to localStorage:', err);
  }
}

function _bindHighlightEvents() {
  document.querySelectorAll('[data-rm-hl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      readerState.highlights = readerState.highlights.filter((h) => h.id !== btn.dataset.rmHl);
      _saveHighlights();
      _refreshPanelContent();
    });
  });
}

async function _loadComments() {
  if (!readerState.taleId) return;
  try {
    const q = query(refs.comments(readerState.taleId), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    readerState.comments = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const isTaleAuthor = Boolean(
          readerState.authorId && data.authorId && data.authorId === readerState.authorId
        );

        let liked = false;
        if (readerState.userId) {
          try {
            const likeDoc = await getDoc(
              refs.commentLike(readerState.taleId, d.id, readerState.userId)
            );
            liked = likeDoc.exists();
          } catch {
            // Ignore offline or permission errors
          }
        }

        let replies = [];
        try {
          const rq = query(
            refs.commentReplies(readerState.taleId, d.id),
            orderBy('createdAt', 'asc'),
            limit(50)
          );
          const rsnap = await getDocs(rq);
          replies = await Promise.all(
            rsnap.docs.map(async (rd) => {
              const rdata = rd.data();
              const isReplyTaleAuthor = Boolean(
                readerState.authorId && rdata.authorId && rdata.authorId === readerState.authorId
              );
              let replyLiked = false;
              if (readerState.userId) {
                try {
                  const rLikeDoc = await getDoc(
                    refs.commentLike(readerState.taleId, rd.id, readerState.userId)
                  );
                  replyLiked = rLikeDoc.exists();
                } catch {
                  // Ignore
                }
              }

              return {
                id: rd.id,
                parentId: d.id,
                author: rdata.authorName || 'Anonymous',
                authorId: rdata.authorId || '',
                isTaleAuthor: isReplyTaleAuthor,
                isEdited: Boolean(rdata.isEdited),
                isDeleted: Boolean(rdata.isDeleted),
                initials: (rdata.authorName || 'A').slice(0, 2).toUpperCase(),
                body: rdata.text || '',
                at: rdata.createdAt?.toMillis ? rdata.createdAt.toMillis() : Date.now(),
                likes: rdata.likeCount || 0,
                liked: replyLiked,
              };
            })
          );
        } catch {
          // Ignore subcollection error if no replies
        }

        return {
          id: d.id,
          author: data.authorName || 'Anonymous',
          authorId: data.authorId || '',
          isTaleAuthor,
          isEdited: Boolean(data.isEdited),
          isDeleted: Boolean(data.isDeleted),
          initials: (data.authorName || 'A').slice(0, 2).toUpperCase(),
          body: data.text || '',
          at: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
          likes: data.likeCount || 0,
          liked,
          replies,
        };
      })
    );
    _renderDiscussion();
  } catch (err) {
    log.warn('Could not load comments from Firestore:', err);
  }
}

function _renderDiscussion() {
  const container = document.getElementById('reader-discussion-content');
  if (!container) return;

  container.innerHTML = renderCommentsPanel(
    readerState.comments,
    readerState.newComment,
    readerState.userId
  );
  _bindCommentEvents();

  const countEl = document.getElementById('discussion-count');
  if (countEl) {
    const len = readerState.comments?.length || 0;
    countEl.textContent = len === 1 ? '1 comment' : `${len} comments`;
  }

  initIcons();
}

function _bindCommentEvents() {
  const input = document.getElementById('comment-input');
  input?.addEventListener('input', (e) => {
    readerState.newComment = e.target.value;
    const postBtn = document.getElementById('post-comment');
    if (postBtn) postBtn.disabled = !readerState.newComment.trim();
  });

  document.getElementById('post-comment')?.addEventListener('click', async () => {
    const body = readerState.newComment.trim();
    if (!body) return;
    if (!readerState.userId) {
      showToast('Please sign in to join the discussion.', 'info');
      return;
    }

    const postBtn = document.getElementById('post-comment');
    if (postBtn) postBtn.disabled = true;

    try {
      const commentPayload = {
        text: body,
        taleId: readerState.taleId,
        authorId: readerState.userId,
        authorName: readerState.userName || 'Anonymous',
        type: 'general',
        depth: 0,
        likeCount: 0,
        isEdited: false,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(refs.comments(readerState.taleId), commentPayload);
      const isTaleAuthor = Boolean(
        readerState.authorId && readerState.userId && readerState.userId === readerState.authorId
      );
      readerState.comments.unshift({
        id: docRef.id,
        author: readerState.userName || 'You',
        authorId: readerState.userId,
        isTaleAuthor,
        isEdited: false,
        isDeleted: false,
        initials: (readerState.userName || 'Y').slice(0, 2).toUpperCase(),
        body,
        at: Date.now(),
        likes: 0,
        liked: false,
        replies: [],
      });
      readerState.newComment = '';
      showToast('Comment posted.', 'success');
    } catch (err) {
      log.error('Failed to post comment to Firestore:', err);
      showToast('Could not post comment.', 'error');
    } finally {
      _renderDiscussion();
    }
  });

  // ── Comment Likes ──────────────────────────────────────────────
  document.querySelectorAll('.like-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      const comment = readerState.comments.find((c) => c.id === commentId);
      if (!comment) return;

      if (!readerState.userId) {
        showToast('Please sign in to like comments.', 'info');
        return;
      }

      btn.disabled = true;
      const willLike = !comment.liked;
      const newCount = Math.max(0, (comment.likes || 0) + (willLike ? 1 : -1));
      comment.liked = willLike;
      comment.likes = newCount;

      try {
        if (willLike) {
          await setDoc(refs.commentLike(readerState.taleId, commentId, readerState.userId), {
            userId: readerState.userId,
            createdAt: serverTimestamp(),
          });
        } else {
          await deleteDoc(refs.commentLike(readerState.taleId, commentId, readerState.userId));
        }

        await updateDoc(refs.comment(readerState.taleId, commentId), {
          likeCount: newCount,
        });
      } catch (err) {
        log.error('Like toggle failed:', err);
        comment.liked = !willLike;
        comment.likes = Math.max(0, (comment.likes || 0) + (willLike ? -1 : 1));
        showToast('Could not update like.', 'error');
      } finally {
        _renderDiscussion();
      }
    });
  });

  // ── Reply Triggers & Form ──────────────────────────────────────
  document.querySelectorAll('.reply-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const commentId = btn.dataset.commentId;
      const form = document.getElementById(`reply-form-${commentId}`);
      if (form) {
        const willShow = form.classList.contains('hidden');
        form.classList.toggle('hidden');
        if (willShow) {
          form.querySelector('textarea')?.focus();
        }
      }
    });
  });

  document.querySelectorAll('.cancel-reply-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const commentId = btn.dataset.commentId;
      const form = document.getElementById(`reply-form-${commentId}`);
      form?.classList.add('hidden');
      const textarea = form?.querySelector('textarea');
      if (textarea) textarea.value = '';
    });
  });

  document.querySelectorAll('.submit-reply-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      const form = document.getElementById(`reply-form-${commentId}`);
      const textarea = form?.querySelector('textarea');
      const replyText = textarea?.value?.trim();
      if (!replyText) return;

      if (!readerState.userId) {
        showToast('Please sign in to reply.', 'info');
        return;
      }

      btn.disabled = true;
      try {
        const replyPayload = {
          text: replyText,
          taleId: readerState.taleId,
          authorId: readerState.userId,
          authorName: readerState.userName || 'Anonymous',
          parentId: commentId,
          isEdited: false,
          isDeleted: false,
          likeCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(
          refs.commentReplies(readerState.taleId, commentId),
          replyPayload
        );
        const comment = readerState.comments.find((c) => c.id === commentId);
        if (comment) {
          comment.replies ??= [];
          const isReplyAuthor = Boolean(
            readerState.authorId &&
            readerState.userId &&
            readerState.userId === readerState.authorId
          );
          comment.replies.push({
            id: docRef.id,
            parentId: commentId,
            author: readerState.userName || 'You',
            authorId: readerState.userId,
            isTaleAuthor: isReplyAuthor,
            isEdited: false,
            isDeleted: false,
            initials: (readerState.userName || 'Y').slice(0, 2).toUpperCase(),
            body: replyText,
            at: Date.now(),
            likes: 0,
            liked: false,
          });
        }
        showToast('Reply posted.', 'success');
      } catch (err) {
        log.error('Failed to post reply:', err);
        showToast('Could not post reply.', 'error');
      } finally {
        _renderDiscussion();
      }
    });
  });

  // ── Comment Edit Triggers & Form ───────────────────────────────
  document.querySelectorAll('.edit-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const commentId = btn.dataset.commentId;
      const form = document.getElementById(`comment-edit-form-${commentId}`);
      const bodyEl = document.getElementById(`comment-body-${commentId}`);
      if (form && bodyEl) {
        form.classList.remove('hidden');
        bodyEl.classList.add('hidden');
        form.querySelector('textarea')?.focus();
      }
    });
  });

  document.querySelectorAll('.cancel-edit-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const commentId = btn.dataset.commentId;
      const form = document.getElementById(`comment-edit-form-${commentId}`);
      const bodyEl = document.getElementById(`comment-body-${commentId}`);
      form?.classList.add('hidden');
      bodyEl?.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.save-edit-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      const form = document.getElementById(`comment-edit-form-${commentId}`);
      const textarea = form?.querySelector('textarea');
      const updatedText = textarea?.value?.trim();
      if (!updatedText) {
        showToast('Comment cannot be empty.', 'warning');
        return;
      }

      btn.disabled = true;
      try {
        await updateDoc(refs.comment(readerState.taleId, commentId), {
          text: updatedText,
          isEdited: true,
          editedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const comment = readerState.comments.find((c) => c.id === commentId);
        if (comment) {
          comment.body = updatedText;
          comment.isEdited = true;
        }
        showToast('Comment updated.', 'success');
      } catch (err) {
        log.error('Failed to update comment:', err);
        showToast('Could not update comment.', 'error');
      } finally {
        _renderDiscussion();
      }
    });
  });

  // ── Comment Delete Trigger ────────────────────────────────────
  document.querySelectorAll('.delete-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      if (
        typeof window !== 'undefined' &&
        window.confirm &&
        !window.confirm('Delete this comment?')
      ) {
        return;
      }

      btn.disabled = true;
      try {
        await updateDoc(refs.comment(readerState.taleId, commentId), {
          text: '',
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const comment = readerState.comments.find((c) => c.id === commentId);
        if (comment) {
          comment.isDeleted = true;
          comment.body = '';
        }
        showToast('Comment deleted.', 'info');
      } catch (err) {
        log.error('Failed to delete comment:', err);
        showToast('Could not delete comment.', 'error');
      } finally {
        _renderDiscussion();
      }
    });
  });

  // ── Reply Like, Edit, Delete Triggers ─────────────────────────
  document.querySelectorAll('.reply-like-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      const replyId = btn.dataset.replyId;
      const comment = readerState.comments.find((c) => c.id === commentId);
      const reply = comment?.replies?.find((r) => r.id === replyId);
      if (!reply) return;

      if (!readerState.userId) {
        showToast('Please sign in to like replies.', 'info');
        return;
      }

      btn.disabled = true;
      const willLike = !reply.liked;
      const newCount = Math.max(0, (reply.likes || 0) + (willLike ? 1 : -1));
      reply.liked = willLike;
      reply.likes = newCount;

      try {
        if (willLike) {
          await setDoc(refs.commentLike(readerState.taleId, replyId, readerState.userId), {
            userId: readerState.userId,
            createdAt: serverTimestamp(),
          });
        } else {
          await deleteDoc(refs.commentLike(readerState.taleId, replyId, readerState.userId));
        }

        await updateDoc(refs.commentReply(readerState.taleId, commentId, replyId), {
          likeCount: newCount,
        });
      } catch (err) {
        log.error('Reply like failed:', err);
        reply.liked = !willLike;
        reply.likes = Math.max(0, (reply.likes || 0) + (willLike ? -1 : 1));
        showToast('Could not update like.', 'error');
      } finally {
        _renderDiscussion();
      }
    });
  });

  document.querySelectorAll('.reply-edit-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const replyId = btn.dataset.replyId;
      const form = document.getElementById(`reply-edit-form-${replyId}`);
      const textEl = document.getElementById(`reply-body-${replyId}`);
      if (form && textEl) {
        form.classList.remove('hidden');
        textEl.classList.add('hidden');
        form.querySelector('textarea')?.focus();
      }
    });
  });

  document.querySelectorAll('.cancel-reply-edit-trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const replyId = btn.dataset.replyId;
      const form = document.getElementById(`reply-edit-form-${replyId}`);
      const textEl = document.getElementById(`reply-body-${replyId}`);
      form?.classList.add('hidden');
      textEl?.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.save-reply-edit-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const replyId = btn.dataset.replyId;
      const commentId = btn.dataset.commentId;
      const form = document.getElementById(`reply-edit-form-${replyId}`);
      const textarea = form?.querySelector('textarea');
      const updatedText = textarea?.value?.trim();
      if (!updatedText) {
        showToast('Reply cannot be empty.', 'warning');
        return;
      }

      btn.disabled = true;
      try {
        await updateDoc(refs.commentReply(readerState.taleId, commentId, replyId), {
          text: updatedText,
          isEdited: true,
          editedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const comment = readerState.comments.find((c) => c.id === commentId);
        const reply = comment?.replies?.find((r) => r.id === replyId);
        if (reply) {
          reply.body = updatedText;
          reply.isEdited = true;
        }
        showToast('Reply updated.', 'success');
      } catch (err) {
        log.error('Failed to update reply:', err);
        showToast('Could not update reply.', 'error');
      } finally {
        _renderDiscussion();
      }
    });
  });

  document.querySelectorAll('.reply-delete-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const replyId = btn.dataset.replyId;
      const commentId = btn.dataset.commentId;
      if (
        typeof window !== 'undefined' &&
        window.confirm &&
        !window.confirm('Delete this reply?')
      ) {
        return;
      }

      btn.disabled = true;
      try {
        await updateDoc(refs.commentReply(readerState.taleId, commentId, replyId), {
          text: '',
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const comment = readerState.comments.find((c) => c.id === commentId);
        const reply = comment?.replies?.find((r) => r.id === replyId);
        if (reply) {
          reply.isDeleted = true;
          reply.body = '';
        }
        showToast('Reply deleted.', 'info');
      } catch (err) {
        log.error('Failed to delete reply:', err);
        showToast('Could not delete reply.', 'error');
      } finally {
        _renderDiscussion();
      }
    });
  });
}

function _bindShareEvents() {
  const handler = () =>
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => showToast('Link copied to clipboard.', 'success'));

  document.getElementById('copy-link-btn')?.addEventListener('click', handler);
  document.getElementById('copy-link')?.addEventListener('click', handler);
}

function _bindTTSEvents() {
  document.getElementById('tts-toggle')?.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return;
    if (readerState.tts.playing) {
      window.speechSynthesis.cancel();
      readerState.tts.playing = false;
    } else {
      const text =
        document.getElementById('article-body')?.innerText.slice(0, TTS_CHAR_LIMIT) || '';
      const u = new SpeechSynthesisUtterance(text);
      u.rate = readerState.tts.rate;
      u.onend = () => {
        readerState.tts.playing = false;
        _refreshPanelContent();
      };
      window.speechSynthesis.speak(u);
      readerState.tts.playing = true;
    }
    _refreshPanelContent();
  });

  document.getElementById('tts-rate')?.addEventListener('input', (e) => {
    readerState.tts.rate = parseFloat(e.target.value);
    if (readerState.tts.playing) {
      window.speechSynthesis.cancel();
      readerState.tts.playing = false;
      document.getElementById('tts-toggle')?.click();
    }
    _refreshPanelContent();
  });
}

/* ─────────────────────────────────────────────
   Selection Toolbar
   ───────────────────────────────────────────── */

function initSelectionToolbar() {
  const toolbar = document.getElementById('selection-toolbar');
  const article = document.getElementById('article-body');
  if (!toolbar || !article) return;

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      readerState.selection = null;
      toolbar.classList.add('hidden');
      return;
    }

    const range = sel.getRangeAt(0);
    if (!article.contains(range.commonAncestorContainer)) {
      readerState.selection = null;
      toolbar.classList.add('hidden');
      return;
    }

    const rect = range.getBoundingClientRect();
    readerState.selection = { text: sel.toString(), x: rect.left + rect.width / 2, y: rect.top };

    toolbar.style.left =
      Math.max(20, Math.min(window.innerWidth - 240, readerState.selection.x - 120)) + 'px';
    toolbar.style.top = Math.max(12, readerState.selection.y - 56) + 'px';
    toolbar.classList.remove('hidden');
  });

  toolbar.querySelectorAll('[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => _addHighlight(btn.dataset.color));
  });

  document.getElementById('sel-note')?.addEventListener('click', () => {
    const note = window.prompt('Private note:');
    if (note) _addHighlight('violet', note);
  });

  document.getElementById('sel-copy')?.addEventListener('click', () => {
    if (readerState.selection) {
      navigator.clipboard
        .writeText(readerState.selection.text)
        .then(() => showToast('Copied to clipboard.', 'success'));
    }
    readerState.selection = null;
    toolbar.classList.add('hidden');
  });
}

function _addHighlight(color, note = '') {
  if (!readerState.selection) return;
  readerState.highlights.unshift({
    id: Math.random().toString(36).slice(2, 9),
    text: readerState.selection.text,
    color,
    note,
    at: Date.now(),
  });
  _saveHighlights();
  readerState.selection = null;
  window.getSelection()?.removeAllRanges();
  document.getElementById('selection-toolbar')?.classList.add('hidden');
  if (readerState.openTool === 'highlights') _refreshPanelContent();
  showToast('Highlight saved.', 'success');
}

/* ─────────────────────────────────────────────
   Bookmark
   ───────────────────────────────────────────── */

async function _handleBookmark() {
  const userId = readerState.userId;
  const taleId_ = readerState.taleId;
  if (!userId || !taleId_) return;

  readerState.bookmarked = !readerState.bookmarked;

  document
    .querySelectorAll(
      '#sidebar-bookmark, #eng-bookmark-mobile, #top-bar-bookmark, #sidebarBookmark'
    )
    .forEach((b) => (b.dataset.active = String(readerState.bookmarked)));

  try {
    if (readerState.bookmarked) {
      await addToBookmarks({
        userId,
        taleId: taleId_,
        tale: {
          title: readerState.taleTitle,
          coverUrl: readerState.coverUrl,
          authorName: readerState.authorName,
        },
      });
      showToast('Saved to Library.', 'success');
    } else {
      await removeFromBookmarks({ userId, taleId: taleId_ });
      showToast('Removed from Library.', 'info');
    }
  } catch (err) {
    log.error('Bookmark failed:', err);
    readerState.bookmarked = !readerState.bookmarked;
    showToast('Could not update bookmark.', 'error');
  }
}

/* ─────────────────────────────────────────────
   Reader Prefs — Firestore Sync
   ───────────────────────────────────────────── */

/**
 * Loads reader preferences from Firestore and applies them.
 * Falls back to localStorage values already applied by initTheme() if none exist.
 *
 * @param {string} userId
 */
async function _loadAndApplyCloudPrefs(userId) {
  try {
    const snap = await getDoc(refs.readerPrefs(userId));
    if (!snap.exists()) return;

    const prefs = snap.data();
    setAppReaderPrefs(prefs);
    applyCloudPrefs(appState.readerPrefs);
  } catch (err) {
    log.warn('Could not load cloud prefs, using local defaults:', err);
  }
}

/**
 * Persists current reader preferences to Firestore.
 * Called after any theme or typography change if the user is authenticated.
 *
 * @param {string} userId
 */
export async function saveReaderPrefs(userId) {
  if (!userId) return;
  try {
    await setDoc(
      refs.readerPrefs(userId),
      {
        theme: readerState.theme,
        fontFamily: readerState.fontFamily,
        fontSize: readerState.fontSize,
        lineHeight: readerState.lineHeight,
        measure: readerState.measure,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    log.warn('Could not save prefs to cloud:', err);
  }
}

/* ─────────────────────────────────────────────
   Lifecycle
   ───────────────────────────────────────────── */

// Apply localStorage prefs immediately — before auth resolves — to avoid a flash
initTheme();

const authTimeout = setupAuthTimeout(
  'article-body',
  'Failed to load chapter. Please refresh.',
  15000
);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  setAppUser(user.uid);
  readerState.userId = user.uid;
  readerState.userName = user.displayName || 'You';

  showReaderSkeletons();

  // Load cloud prefs (non-blocking — will override localStorage defaults when ready)
  _loadAndApplyCloudPrefs(user.uid);

  // Check bookmark status
  readerState.bookmarked = await isBookmarked({ userId: user.uid, taleId });
  document
    .querySelectorAll(
      '#sidebar-bookmark, #eng-bookmark-mobile, #top-bar-bookmark, #sidebarBookmark'
    )
    .forEach((b) => (b.dataset.active = String(readerState.bookmarked)));

  // Load content
  await loadReaderMeta(taleId);

  _loadHighlights();
  _loadComments();

  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  readyReveal();
  if (!navigation) return;

  applyNavigation(navigation);
  _renderDiscussion();
  const localProgress = getChapterProgress({ userId: user.uid, taleId, chapterIndex });
  const initialScrollPercent = localProgress?.scrollPercent ?? 0;
  readerState.progress = initialScrollPercent >= 100 ? 100 : initialScrollPercent;

  if (readerState.progress >= 100) {
    updateReaderProgress({ scrollPercent: 100 });
  } else {
    restoreScrollProgress({ scrollPercent: initialScrollPercent });
    updateReaderProgress({ scrollPercent: initialScrollPercent });
  }

  // Scroll tracking
  bindScrollProgress({
    initialPercent: readerState.progress,
    onScroll(scrollPercent) {
      if (readerState.progress >= 100 || scrollPercent >= 100) {
        readerState.progress = 100;
        scrollPercent = 100;
      } else {
        readerState.progress = scrollPercent;
      }

      saveReaderProgress({
        userId: user.uid,
        taleId,
        chapterIndex,
        scrollPercent: readerState.progress,
      });
      scheduleProgressSync({
        userId: user.uid,
        taleId,
        chapterIndex,
        scrollPercent: readerState.progress,
      });
      updateTOCScrollSpy();

      updateReaderProgress({ scrollPercent: readerState.progress });

      if (readerState.openTool === 'toc') _refreshPanelContent();
    },
  });

  initSidebar();
  initSelectionToolbar();

  // Open TOC by default on desktop
  if (window.innerWidth >= 1024) openPanel('toc');

  // Global action bindings
  document.getElementById('sidebar-bookmark')?.addEventListener('click', _handleBookmark);
  document.getElementById('eng-bookmark-mobile')?.addEventListener('click', _handleBookmark);
  document.getElementById('top-bar-bookmark')?.addEventListener('click', _handleBookmark);
  document.getElementById('sidebar-focus-mobile')?.addEventListener('click', toggleFocusMode);
  document.getElementById('top-bar-focus')?.addEventListener('click', toggleFocusMode);

  document.getElementById('top-bar-share')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({
          title: readerState.taleTitle || document.title || 'TaleTranscend',
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    if (readerState.openTool === 'share' && _isPanelVisible()) {
      closePanel();
    } else {
      openPanel('share');
    }
  });

  document.getElementById('close-panel')?.addEventListener('click', closePanel);
  document.getElementById('tool-panel-backdrop')?.addEventListener('click', closePanel);
  document.getElementById('back-to-top')?.addEventListener('click', () => {
    document.getElementById('scroller')?.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('back-btn')?.addEventListener('click', () => goBackToTale());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (_isPanelVisible()) closePanel();
      else if (readerState.focusMode) toggleFocusMode();
    }
  });

  initIcons();
});

document.addEventListener('DOMContentLoaded', () => initIcons());

window.addEventListener('beforeunload', () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});
