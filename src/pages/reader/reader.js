// src/pages/reader/reader.js
// Entry point for the reader page.
// Wires auth, content loading, progress tracking, theme, and interactions.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/reader.css';

import {
  initAuth,
  readerState,
  initTheme,
  setTheme,
  setFontFamily,
  updateSize,
  setLineHeight,
  setReadingWidth,
  loadReaderMeta,
  loadReaderChapter,
  applyNavigation,
  goBackToTale,
  updateReaderProgress,
  bindScrollProgress,
  restoreScrollProgress,
  initMobileDrawer,
  initSwipeNavigation,
  initToolbarAutoHide,
  getChapterProgress,
  getCloudProgress,
  saveReaderProgress,
  scheduleProgressSync,
  getLocalTotalReadTime,
  addReadTime,
  initIcons,
} from './index.js';

/* ─────────────────────────────────────────────
   URL Params
   ───────────────────────────────────────────── */

const params = new URLSearchParams(window.location.search);
const taleId = params.get('taleId') || '';
const chapterIndex = parseInt(params.get('chapterId')) || 0;

readerState.taleId = taleId;
readerState.chapterIndex = chapterIndex;

/* ─────────────────────────────────────────────
   Theme + Preferences (before auth)
   ───────────────────────────────────────────── */

initTheme();

/* ─────────────────────────────────────────────
   Desktop UI Bindings
   ───────────────────────────────────────────── */

function initReaderUI() {
  // ── Back navigation ──────────────────────────────────────────
  document.getElementById('reader-back-btn')?.addEventListener('click', () => goBackToTale(taleId));
  document
    .getElementById('go-back-mobile-btn')
    ?.addEventListener('click', () => goBackToTale(taleId));

  // ── Theme buttons ─────────────────────────────────────────────
  document.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });

  // ── Font family buttons ───────────────────────────────────────
  document.querySelectorAll('[data-font]').forEach((btn) => {
    btn.addEventListener('click', () => setFontFamily(btn.dataset.font));
  });

  // ── Font size sliders ─────────────────────────────────────────
  document.querySelectorAll('[data-control="font-size"]').forEach((el) => {
    el.addEventListener('input', (e) => updateSize(e.target.value));
  });

  // ── Line height sliders ───────────────────────────────────────
  document.querySelectorAll('[data-control="line-height"]').forEach((el) => {
    el.addEventListener('input', (e) => setLineHeight(e.target.value));
  });

  // ── Reading width buttons ─────────────────────────────────────
  document.querySelectorAll('[data-width]').forEach((btn) => {
    btn.addEventListener('click', () => setReadingWidth(btn.dataset.width));
  });

  // ── Bookmark button ───────────────────────────────────────────
  document.getElementById('reader-bookmark-btn')?.addEventListener('click', () => {
    // Bookmark toggling is handled via the bookmarks service — stub here
    const btn = document.getElementById('reader-bookmark-btn');
    if (btn) {
      btn.classList.toggle('reader-action-btn--active');
    }
  });

  // ── Share button ──────────────────────────────────────────────
  document.getElementById('reader-share-btn')?.addEventListener('click', () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      _showToast('Link copied to clipboard.', 'success');
    });
  });

  // ── Settings panel toggle (desktop sidebar) ───────────────────
  document.getElementById('reader-settings-toggle')?.addEventListener('click', () => {
    const panel = document.getElementById('reader-settings-sidebar');
    panel?.classList.toggle('hidden');
  });

  // ── Chapter trail toggle ──────────────────────────────────────
  document.getElementById('reader-trail-toggle')?.addEventListener('click', () => {
    const trail = document.getElementById('chapter-trail-panel');
    trail?.classList.toggle('hidden');
  });
}

/* ─────────────────────────────────────────────
   Progress Resolver
   ───────────────────────────────────────────── */

async function resolveProgress({ userId, taleId, chapterIndex }) {
  const local = getChapterProgress({ userId, taleId, chapterIndex });
  const cloud = await getCloudProgress({ userId, taleId });
  const cloudChapter = cloud?.chapters?.[chapterIndex];

  if (!local && !cloudChapter) return null;
  if (!cloudChapter) return local;
  if (!local) return cloudChapter;

  const localTime =
    typeof local.updatedAt?.toMillis === 'function'
      ? local.updatedAt.toMillis()
      : local.updatedAt || 0;
  const cloudTime =
    typeof cloudChapter.updatedAt?.toMillis === 'function'
      ? cloudChapter.updatedAt.toMillis()
      : cloudChapter.updatedAt || 0;

  return cloudTime > localTime ? cloudChapter : local;
}

/* ─────────────────────────────────────────────
   Auth + Initialization
   ───────────────────────────────────────────── */

const authTimeout = setTimeout(() => {
  const title = document.getElementById('chapter-title');
  if (title) title.textContent = 'Connection timed out. Please refresh.';
}, 10_000);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  readerState.userId = user.uid;

  let sessionStart = Date.now();

  // Track reading time via visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const duration = Date.now() - sessionStart;
      if (duration > 1000) addReadTime({ userId: user.uid, taleId, durationMs: duration });
      sessionStart = Date.now();
    }
  });

  const resolvedProgress = await resolveProgress({
    userId: user.uid,
    taleId,
    chapterIndex,
  });

  // Load tale meta (title, author, era, tags, etc.)
  await loadReaderMeta(taleId);

  // Load chapter content + get navigation context
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  // Wire prev/next links
  applyNavigation(navigation, taleId);

  // Initial progress bar render
  updateReaderProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters,
    scrollPercent: resolvedProgress?.scrollPercent ?? 0,
  });

  // Restore scroll position
  restoreScrollProgress({ scrollPercent: resolvedProgress?.scrollPercent ?? 0 });

  // Bind scroll tracking
  bindScrollProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters,
    onScroll(scrollPercent) {
      saveReaderProgress({ userId: user.uid, taleId, chapterIndex, scrollPercent });
      const totalReadTimeMs = getLocalTotalReadTime({ userId: user.uid, taleId });
      scheduleProgressSync({
        userId: user.uid,
        taleId,
        chapterIndex,
        scrollPercent,
        totalReadTimeMs,
      });
    },
  });

  // Swipe navigation (mobile)
  initSwipeNavigation({
    prevUrl: navigation.hasPrev
      ? `reader.html?taleId=${taleId}&chapterId=${navigation.prevIndex}`
      : null,
    nextUrl: navigation.hasNext
      ? `reader.html?taleId=${taleId}&chapterId=${navigation.nextIndex}`
      : null,
  });

  initIcons();
});

/* ─────────────────────────────────────────────
   DOM Ready
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initReaderUI();
  initMobileDrawer();
  initToolbarAutoHide();
  initIcons();
});

/* ─────────────────────────────────────────────
   Toast (lightweight local)
   ───────────────────────────────────────────── */

function _showToast(message, type = 'success') {
  let container = document.getElementById('reader-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'reader-toast-container';
    container.className = 'fixed top-6 right-6 z-[200] flex flex-col gap-2.5 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border bg-zinc-900/95 backdrop-blur-xl shadow-2xl text-sm font-medium transition-all duration-300 ${
    type === 'success' ? 'border-indigo-500/30 text-white' : 'border-red-500/30 text-red-200'
  }`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"
       class="w-4 h-4 flex-shrink-0 ${type === 'success' ? 'text-indigo-400' : 'text-red-400'}"></i>
    ${message}
  `;
  container.appendChild(toast);
  initIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(10px)';
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}
