// src/pages/reader/reader.js
// Modernized Reader Entry Point
// Strictly separates Mobile/Desktop UI paths and ensures smooth interactions.

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
  updateSize,
  setLineHeight,
  setReadingWidth,
  loadReaderMeta,
  loadReaderChapter,
  applyNavigation,
  goBackToTale,
  bindScrollProgress,
  restoreScrollProgress,
  initMobileDrawer,
  initSwipeNavigation,
  initToolbarAutoHide,
  getChapterProgress,
  saveReaderProgress,
  scheduleProgressSync,
  initIcons,
  showReaderSkeletons,
} from './index.js';

/* ─────────────────────────────────────────────
   State Initialization
   ───────────────────────────────────────────── */

const params = new URLSearchParams(window.location.search);
const taleId = params.get('taleId') || '';
const chapterIndex = parseInt(params.get('chapterId')) || 0;

readerState.taleId = taleId;
readerState.chapterIndex = chapterIndex;

/* ─────────────────────────────────────────────
   UI Templates
   ───────────────────────────────────────────── */

function renderSettingsTemplate() {
  return `
    <div class="space-y-8">
      <!-- Theme -->
      <div>
        <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Reading Theme</p>
        <div class="flex gap-2.5">
          <button data-theme="dark" class="reader-option flex-1">Dark</button>
          <button data-theme="sepia" class="reader-option flex-1">Sepia</button>
          <button data-theme="light" class="reader-option flex-1">Light</button>
        </div>
      </div>

      <!-- Font Style -->
      <div>
        <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Typography</p>
        <div class="flex gap-2.5">
          <button data-font="serif" class="reader-option flex-1">Serif</button>
          <button data-font="sans" class="reader-option flex-1">Sans</button>
          <button data-font="mono" class="reader-option flex-1">Mono</button>
        </div>
      </div>

      <!-- Sliders -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
        <div>
           <div class="flex items-center justify-between mb-3">
             <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Size</p>
             <span class="text-[10px] text-indigo-400 font-bold" data-val="font-size">18px</span>
           </div>
           <input type="range" min="14" max="26" value="18" step="1" data-control="font-size" class="w-full accent-indigo-500 cursor-pointer" />
        </div>
        <div>
           <div class="flex items-center justify-between mb-3">
             <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Spacing</p>
             <span class="text-[10px] text-indigo-400 font-bold" data-val="line-height">1.9</span>
           </div>
           <input type="range" min="1.4" max="2.2" value="1.9" step="0.1" data-control="line-height" class="w-full accent-indigo-500 cursor-pointer" />
        </div>
      </div>

      <!-- Width (Desktop Only Utility) -->
      <div class="hidden lg:block">
        <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Reading Width</p>
        <div class="flex gap-2.5">
          <button data-width="narrow" class="reader-option flex-1">Narrow</button>
          <button data-width="normal" class="reader-option flex-1">Normal</button>
          <button data-width="wide" class="reader-option flex-1">Wide</button>
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Interaction Logic
   ───────────────────────────────────────────── */

function initGlobalInteractions() {
  // ── Header Scroll Logic ──────────────────────────────────────
  const header = document.getElementById('reader-header');
  window.addEventListener(
    'scroll',
    () => {
      header?.classList.toggle('is-scrolled', window.scrollY > 15);
    },
    { passive: true }
  );

  // ── Unified Settings Rendering ──────────────────────────────
  const desktopContainer = document.getElementById('desktop-settings-container');
  const mobileContainer = document.getElementById('mobile-settings-container');
  if (desktopContainer) desktopContainer.innerHTML = renderSettingsTemplate();
  if (mobileContainer) mobileContainer.innerHTML = renderSettingsTemplate();

  // ── Button Listeners ─────────────────────────────────────────

  // Theme
  document.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });

  // Font
  document.querySelectorAll('[data-font]').forEach((btn) => {
    btn.addEventListener('click', () => setFontFamily(btn.dataset.font));
  });

  // Sliders
  document.querySelectorAll('[data-control]').forEach((el) => {
    el.addEventListener('input', (e) => {
      const type = e.target.dataset.control;
      const val = e.target.value;
      if (type === 'font-size') {
        updateSize(val);
        document
          .querySelectorAll('[data-val="font-size"]')
          .forEach((s) => (s.textContent = `${val}px`));
      } else {
        setLineHeight(val);
        document.querySelectorAll('[data-val="line-height"]').forEach((s) => (s.textContent = val));
      }
    });
  });

  // Width
  document.querySelectorAll('[data-width]').forEach((btn) => {
    btn.addEventListener('click', () => setReadingWidth(btn.dataset.width));
  });

  // ── Sidebars / Toggles ───────────────────────────────────────

  // Settings toggle (desktop)
  document.getElementById('reader-settings-toggle')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const panel = document.getElementById('reader-settings-sidebar');
    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    btn.classList.toggle('reader-action-btn--active', !isOpen);
  });

  // Chapters toggle (desktop)
  document.getElementById('reader-trail-toggle')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const panel = document.getElementById('chapter-trail-panel');
    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    btn.classList.toggle('reader-action-btn--active', !isOpen);
  });

  // ── Generic Actions ──────────────────────────────────────────

  // Bookmark
  const handleBookmark = async () => {
    // Shared logic for mobile/desktop buttons
    const btns = document.querySelectorAll('#reader-bookmark-btn, #mobile-bookmark-btn');
    const isActive = btns[0].classList.contains('reader-action-btn--active');

    btns.forEach((b) => {
      b.classList.toggle('reader-action-btn--active', !isActive);
      b.querySelector('i')?.classList.toggle('text-indigo-400', !isActive);
    });

    _showToast(!isActive ? 'Saved to Archive' : 'Removed from Archive');
  };

  document.getElementById('reader-bookmark-btn')?.addEventListener('click', handleBookmark);
  document.getElementById('mobile-bookmark-btn')?.addEventListener('click', handleBookmark);

  // Share
  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: readerState.taleTitle, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      _showToast('Link copied to clipboard');
    }
  };

  document.getElementById('reader-share-btn')?.addEventListener('click', handleShare);
  document.getElementById('reader-share-mobile')?.addEventListener('click', handleShare);

  // Back
  document.getElementById('reader-back-btn')?.addEventListener('click', () => goBackToTale(taleId));
  document
    .getElementById('go-back-mobile-btn')
    ?.addEventListener('click', () => goBackToTale(taleId));
}

/* ─────────────────────────────────────────────
   Lifecycle
   ───────────────────────────────────────────── */

initTheme();

initAuth(async (user) => {
  readerState.userId = user.uid;

  // 0. Show Skeletons
  showReaderSkeletons();

  // 1. Load Data
  await loadReaderMeta(taleId);
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  // 2. Initialise Navigation
  applyNavigation(navigation, taleId);
  initSwipeNavigation({
    prevUrl: navigation.hasPrev
      ? `reader.html?taleId=${taleId}&chapterId=${navigation.prevIndex}`
      : null,
    nextUrl: navigation.hasNext
      ? `reader.html?taleId=${taleId}&chapterId=${navigation.nextIndex}`
      : null,
  });

  // 3. Scroll Logic
  const localProgress = getChapterProgress({ userId: user.uid, taleId, chapterIndex });
  restoreScrollProgress({ scrollPercent: localProgress?.scrollPercent ?? 0 });

  bindScrollProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters,
    onScroll(scrollPercent) {
      saveReaderProgress({ userId: user.uid, taleId, chapterIndex, scrollPercent });
      scheduleProgressSync({ userId: user.uid, taleId, chapterIndex, scrollPercent });
    },
  });

  initIcons();
});

document.addEventListener('DOMContentLoaded', () => {
  initGlobalInteractions();
  initMobileDrawer();
  initToolbarAutoHide();
  initIcons();
});

import { showToast } from '@ui/components/toast.js';

/* ─────────────────────────────────────────────
   Toasts
   ───────────────────────────────────────────── */

function _showToast(message, type = 'info') {
  showToast(message, type);
}
