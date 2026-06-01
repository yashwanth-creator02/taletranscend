// src/pages/reader/reader.js
// Reader page entry point.
// Orchestrates auth, content loading, theme init, progress tracking, and all panel interactions.

import '@css/base.css';
import '@css/reader-themes.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/reader.css';

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

import { getDoc, setDoc, serverTimestamp, refs } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { navigateTo, initPageReveal, readyReveal } from '@/utils/ui.utils';
import { TTS_CHAR_LIMIT } from '@config/app.config.js';

// Hide body immediately to prevent flash of unstyled content
initPageReveal();

/* ─────────────────────────────────────────────
   URL Params
   ───────────────────────────────────────────── */

const params = new URLSearchParams(window.location.search);
const taleId = params.get('taleId') || '';
const chapterIndex = parseInt(params.get('chapterId')) || 0;

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
  comments: 'Discussion',
  share: 'Share This Piece',
  tts: 'Listen',
  info: 'About this piece',
};

const SIDEBAR_TOOLS = [
  { id: 'toc', icon: 'list', label: 'Contents' },
  { id: 'type', icon: 'type', label: 'Typography' },
  { id: 'theme', icon: 'palette', label: 'Themes' },
  { id: 'highlights', icon: 'highlighter', label: 'Highlights' },
  { id: 'comments', icon: 'message-square', label: 'Discussion' },
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
  } else if (toolId === 'comments') {
    content.innerHTML = renderCommentsPanel(readerState.comments, readerState.newComment);
    _bindCommentEvents();
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

  readerState.openTool = null;
  readerState.isCollapsed = true;

  document.querySelectorAll('[data-tool]').forEach((btn) => (btn.dataset.active = 'false'));
  _updateCollapseIcon();
  initIcons();
}

function toggleFocusMode() {
  readerState.focusMode = !readerState.focusMode;

  document.getElementById('sidebar')?.classList.toggle('hidden', readerState.focusMode);
  document.getElementById('top-bar')?.classList.toggle('hidden', readerState.focusMode);
  document.getElementById('focus-exit')?.classList.toggle('hidden', !readerState.focusMode);

  if (readerState.focusMode) closePanel();

  const focusBtn = document.getElementById('sidebar-focus');
  if (focusBtn) focusBtn.dataset.active = String(readerState.focusMode);
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
      const url = new URL(window.location.href);
      url.searchParams.set('chapterId', idx);
      navigateTo(url.toString());
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

function _bindHighlightEvents() {
  document.querySelectorAll('[data-rm-hl]').forEach((btn) => {
    btn.addEventListener('click', () => {
      readerState.highlights = readerState.highlights.filter((h) => h.id !== btn.dataset.rmHl);
      _refreshPanelContent();
    });
  });
}

function _bindCommentEvents() {
  const input = document.getElementById('comment-input');
  input?.addEventListener('input', (e) => {
    readerState.newComment = e.target.value;
    const postBtn = document.getElementById('post-comment');
    if (postBtn) postBtn.disabled = !readerState.newComment.trim();
  });

  document.getElementById('post-comment')?.addEventListener('click', () => {
    const body = readerState.newComment.trim();
    if (!body) return;
    readerState.comments.unshift({
      id: Math.random().toString(36).slice(2, 9),
      author: readerState.userName || 'You',
      initials: (readerState.userName || 'Y').slice(0, 2).toUpperCase(),
      body,
      at: Date.now(),
      likes: 0,
    });
    readerState.newComment = '';
    _refreshPanelContent();
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
   Engagement
   ───────────────────────────────────────────── */

function initEngagement() {
  document.getElementById('clap-btn')?.addEventListener('click', () => {
    if (!readerState.hasClapped) {
      readerState.claps++;
      readerState.hasClapped = true;
      _renderEngagement();
    }
  });

  document.getElementById('eng-share')?.addEventListener('click', () => openPanel('share'));
  document.getElementById('eng-comment')?.addEventListener('click', () => openPanel('comments'));
}

function _renderEngagement() {
  const clapCount = document.getElementById('clap-count');
  const clapLabel = document.getElementById('clap-label');
  const clapIconWrap = document.getElementById('clap-icon-wrap');

  if (clapCount) clapCount.textContent = readerState.claps;
  if (clapLabel) clapLabel.textContent = readerState.hasClapped ? 'Thank you' : 'Tap to applaud';
  if (clapIconWrap) {
    clapIconWrap.classList.toggle('clapped', readerState.hasClapped);
    if (readerState.hasClapped) clapIconWrap.style.boxShadow = '0 0 30px -4px rgba(245,158,11,0.6)';
  }
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
    .querySelectorAll('#sidebarBookmark, #engBookmark')
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
    console.error('[reader] Bookmark failed:', err);
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
    console.warn('[reader] Could not load cloud prefs, using local defaults:', err);
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
    console.warn('[reader] Could not save prefs to cloud:', err);
  }
}

/* ─────────────────────────────────────────────
   Lifecycle
   ───────────────────────────────────────────── */

// Apply localStorage prefs immediately — before auth resolves — to avoid a flash
initTheme();

initAuth(async (user) => {
  setAppUser(user.uid);
  readerState.userId = user.uid;
  readerState.userName = user.displayName || 'You';

  showReaderSkeletons();

  // Load cloud prefs (non-blocking — will override localStorage defaults when ready)
  _loadAndApplyCloudPrefs(user.uid);

  // Check bookmark status
  readerState.bookmarked = await isBookmarked({ userId: user.uid, taleId });

  // Load content
  await loadReaderMeta(taleId);
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  applyNavigation(navigation);
  readyReveal();
  const localProgress = getChapterProgress({ userId: user.uid, taleId, chapterIndex });
  restoreScrollProgress({ scrollPercent: localProgress?.scrollPercent ?? 0 });

  // Scroll tracking
  bindScrollProgress({
    onScroll(scrollPercent) {
      readerState.progress = scrollPercent;
      saveReaderProgress({ userId: user.uid, taleId, chapterIndex, scrollPercent });
      scheduleProgressSync({ userId: user.uid, taleId, chapterIndex, scrollPercent });
      updateTOCScrollSpy();

      const pctEl = document.getElementById('top-bar-pct');
      if (pctEl) pctEl.textContent = Math.round(scrollPercent) + '%';

      const progressBar = document.getElementById('progress-bar');
      if (progressBar) progressBar.style.width = scrollPercent + '%';

      if (readerState.openTool === 'toc') _refreshPanelContent();
    },
  });

  initSidebar();
  initEngagement();
  initSelectionToolbar();
  _renderEngagement();

  // Open TOC by default on desktop
  if (window.innerWidth >= 1024) openPanel('toc');

  // Global action bindings
  document.getElementById('sidebar-bookmark')?.addEventListener('click', _handleBookmark);
  document.getElementById('eng-bookmark')?.addEventListener('click', _handleBookmark);
  document.getElementById('eng-bookmark-mobile')?.addEventListener('click', _handleBookmark);
  document.getElementById('close-panel')?.addEventListener('click', closePanel);
  document.getElementById('back-to-top')?.addEventListener('click', () => {
    document.getElementById('scroller')?.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('back-btn')?.addEventListener('click', () => goBackToTale());

  initIcons();
});

document.addEventListener('DOMContentLoaded', () => initIcons());

window.addEventListener('beforeunload', () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});
