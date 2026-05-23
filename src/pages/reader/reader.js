// src/pages/reader/reader.js
// Modernized Reader Entry Point
// Immersive UI/UX adopted from the Cinder Archive demo.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/reader.css';

import {
  initAuth,
  readerState,
  initTheme,
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
} from './index.js';

/* ─────────────────────────────────────────────
   State & Params
   ───────────────────────────────────────────── */

const params = new URLSearchParams(window.location.search);
const taleId = params.get('taleId') || '';
const chapterIndex = parseInt(params.get('chapterId')) || 0;

readerState.taleId = taleId;
readerState.chapterIndex = chapterIndex;

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
   UI Initialization
   ───────────────────────────────────────────── */

function initSidebar() {
  const container = document.getElementById('sidebarTools');
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

  // Sidebar Collapse
  document.getElementById('collapseBtn')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const collapseIcon = document.getElementById('collapseIcon');
    readerState.isCollapsed = !readerState.isCollapsed;
    sidebar?.classList.toggle('collapsed', readerState.isCollapsed);

    if (collapseIcon) {
      collapseIcon.setAttribute(
        'data-lucide',
        readerState.isCollapsed ? 'chevron-right' : 'chevron-left'
      );
      initIcons();
    }

    if (readerState.isCollapsed) {
      closePanel();
    }
  });

  // Tool Opening
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

  // Focus Mode
  document.getElementById('sidebarFocus')?.addEventListener('click', toggleFocusMode);
  document.getElementById('focusExit')?.addEventListener('click', toggleFocusMode);
}

function openPanel(toolId) {
  readerState.openTool = toolId;
  const panel = document.getElementById('toolPanel');
  const title = document.getElementById('panelTitle');
  const content = document.getElementById('panelContent');

  if (!panel || !title || !content) return;

  title.textContent = PANEL_TITLES[toolId] || 'Panel';

  _refreshPanelContent();

  panel.classList.add('visible');
  panel.style.display = 'flex';

  // Paint active states
  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.dataset.active = btn.dataset.tool === toolId;
  });

  initIcons();
}

function _refreshPanelContent() {
  const toolId = readerState.openTool;
  const content = document.getElementById('panelContent');
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
  const panel = document.getElementById('toolPanel');
  if (panel) {
    panel.classList.remove('visible');
    panel.style.display = 'none';
  }
  readerState.openTool = null;
  document.querySelectorAll('[data-tool]').forEach((btn) => (btn.dataset.active = 'false'));
}

function toggleFocusMode() {
  readerState.focusMode = !readerState.focusMode;
  const sidebar = document.getElementById('sidebar');
  const topBar = document.getElementById('topBar');
  const exitBtn = document.getElementById('focusExit');

  sidebar?.classList.toggle('hidden', readerState.focusMode);
  topBar?.classList.toggle('hidden', readerState.focusMode);
  exitBtn?.classList.toggle('hidden', !readerState.focusMode);

  if (readerState.focusMode) {
    closePanel();
  }

  const focusBtn = document.getElementById('sidebarFocus');
  if (focusBtn) focusBtn.dataset.active = String(readerState.focusMode);
}

function _isPanelVisible() {
  return document.getElementById('toolPanel')?.classList.contains('visible');
}

/* ─────────────────────────────────────────────
   Event Binding for Panels
   ───────────────────────────────────────────── */

function _bindTocEvents() {
  document.querySelectorAll('[data-chapter-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = readerState.chapters.findIndex((c) => c.id === btn.dataset.chapterId);
      const url = new URL(window.location.href);
      url.searchParams.set('chapterId', idx);
      window.location.href = url.toString();
    });
  });

  document.querySelectorAll('[data-section-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.sectionId;
      const target = document.getElementById(id);
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
  document.getElementById('fontSize')?.addEventListener('input', (e) => {
    setFontSize(e.target.value);
    _refreshPanelContent();
  });
  document.getElementById('fsRange')?.addEventListener('input', (e) => {
    setFontSize(e.target.value);
    _refreshPanelContent();
  });
  document.getElementById('fsMinus')?.addEventListener('click', () => {
    setFontSize(Math.max(13, readerState.fontSize - 1));
    _refreshPanelContent();
  });
  document.getElementById('fsPlus')?.addEventListener('click', () => {
    setFontSize(Math.min(26, readerState.fontSize + 1));
    _refreshPanelContent();
  });

  document.getElementById('lineHeight')?.addEventListener('input', (e) => {
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
  document.getElementById('mwRange')?.addEventListener('input', (e) => {
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
  const input = document.getElementById('commentInput');
  input?.addEventListener('input', (e) => {
    readerState.newComment = e.target.value;
    const postBtn = document.getElementById('postComment');
    if (postBtn) postBtn.disabled = !readerState.newComment.trim();
  });

  document.getElementById('postComment')?.addEventListener('click', () => {
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
  document.getElementById('copyLinkBtn')?.addEventListener('click', _copyUrl);
  document.getElementById('copyLink')?.addEventListener('click', _copyUrl);
}

function _copyUrl() {
  navigator.clipboard.writeText(window.location.href);
  import('@ui/components/toast.js').then((m) => m.showToast('Link copied to clipboard'));
}

function _bindTTSEvents() {
  document.getElementById('ttsToggle')?.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) return;
    if (readerState.tts.playing) {
      window.speechSynthesis.cancel();
      readerState.tts.playing = false;
    } else {
      const article = document.getElementById('articleBody');
      const text = article?.innerText.slice(0, 6000) || '';
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

  document.getElementById('ttsRate')?.addEventListener('input', (e) => {
    readerState.tts.rate = parseFloat(e.target.value);
    if (readerState.tts.playing) {
      window.speechSynthesis.cancel();
      readerState.tts.playing = false;
      document.getElementById('ttsToggle')?.click();
    }
    _refreshPanelContent();
  });
}

/* ─────────────────────────────────────────────
   Engagement Logic
   ───────────────────────────────────────────── */

function initEngagement() {
  const clapBtn = document.getElementById('clapBtn');
  clapBtn?.addEventListener('click', () => {
    if (!readerState.hasClapped) {
      readerState.claps++;
      readerState.hasClapped = true;
      _renderEngagement();
    }
  });

  document.getElementById('engShare')?.addEventListener('click', () => openPanel('share'));
  document.getElementById('engComment')?.addEventListener('click', () => openPanel('comments'));
}

function _renderEngagement() {
  const clapCount = document.getElementById('clapCount');
  const clapLabel = document.getElementById('clapLabel');
  const clapIconWrap = document.getElementById('clapIconWrap');

  if (clapCount) clapCount.textContent = readerState.claps;
  if (clapLabel) clapLabel.textContent = readerState.hasClapped ? 'Thank you' : 'Tap to applaud';
  if (clapIconWrap) {
    clapIconWrap.classList.toggle('clapped', readerState.hasClapped);
    if (readerState.hasClapped) {
      clapIconWrap.style.boxShadow = '0 0 30px -4px rgba(245, 158, 11, 0.6)';
    }
  }
}

/* ─────────────────────────────────────────────
   Selection Toolbar
   ───────────────────────────────────────────── */

function initSelectionToolbar() {
  const toolbar = document.getElementById('selectionToolbar');
  const article = document.getElementById('articleBody');
  if (!toolbar || !article) return;

  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      readerState.selection = null;
      toolbar.classList.add('hidden');
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!article.contains(range.commonAncestorContainer)) {
      readerState.selection = null;
      toolbar.classList.add('hidden');
      return;
    }

    readerState.selection = { text: sel.toString(), x: rect.left + rect.width / 2, y: rect.top };
    const left = Math.max(20, Math.min(window.innerWidth - 240, readerState.selection.x - 120));
    const top = Math.max(12, readerState.selection.y - 56);

    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
    toolbar.classList.remove('hidden');
  });

  toolbar.querySelectorAll('[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => _addHighlight(btn.dataset.color));
  });

  document.getElementById('selNote')?.addEventListener('click', () => {
    const note = window.prompt('Private note:');
    if (note) _addHighlight('violet', note);
  });

  document.getElementById('selCopy')?.addEventListener('click', () => {
    if (readerState.selection) {
      navigator.clipboard.writeText(readerState.selection.text);
      import('@ui/components/toast.js').then((m) => m.showToast('Copied to clipboard'));
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
  document.getElementById('selectionToolbar')?.classList.add('hidden');

  if (readerState.openTool === 'highlights') _refreshPanelContent();
  import('@ui/components/toast.js').then((m) => m.showToast('Highlight added'));
}

/* ─────────────────────────────────────────────
   Lifecycle
   ───────────────────────────────────────────── */

initTheme();

initAuth(async (user) => {
  readerState.userId = user.uid;
  readerState.userName = user.displayName || 'You';

  showReaderSkeletons();

  await loadReaderMeta(taleId);
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  applyNavigation(navigation);

  // Scroll Restoration
  const localProgress = getChapterProgress({ userId: user.uid, taleId, chapterIndex });
  restoreScrollProgress({ scrollPercent: localProgress?.scrollPercent ?? 0 });

  // Scroll Tracking
  bindScrollProgress({
    onScroll(scrollPercent) {
      readerState.progress = scrollPercent;
      saveReaderProgress({ userId: user.uid, taleId, chapterIndex, scrollPercent });
      scheduleProgressSync({ userId: user.uid, taleId, chapterIndex, scrollPercent });
      updateTOCScrollSpy();

      const pctEl = document.getElementById('topBarPct');
      if (pctEl) pctEl.textContent = Math.round(scrollPercent) + '%';

      const progressBar = document.getElementById('progressBar');
      if (progressBar) progressBar.style.width = scrollPercent + '%';

      if (readerState.openTool === 'toc') _refreshPanelContent();
    },
  });

  // Sidebar Init
  initSidebar();
  initEngagement();
  initSelectionToolbar();

  _renderEngagement();

  // Open TOC by default on desktop
  if (window.innerWidth >= 1024) {
    openPanel('toc');
  }

  // Global Actions
  document.getElementById('sidebarBookmark')?.addEventListener('click', _handleBookmark);
  document.getElementById('engBookmark')?.addEventListener('click', _handleBookmark);
  document.getElementById('closePanel')?.addEventListener('click', closePanel);
  document.getElementById('backToTop')?.addEventListener('click', () => {
    document.getElementById('scroller')?.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.getElementById('backBtn')?.addEventListener('click', () => goBackToTale());
  initIcons();
});

async function _handleBookmark() {
  const btns = document.querySelectorAll('#sidebarBookmark, #engBookmark');
  readerState.bookmarked = !readerState.bookmarked;

  btns.forEach((b) => (b.dataset.active = String(readerState.bookmarked)));

  import('@ui/components/toast.js').then((m) =>
    m.showToast(readerState.bookmarked ? 'Saved to Library' : 'Removed from Library')
  );
}

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
});

window.addEventListener('beforeunload', () => {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});
