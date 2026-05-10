// src/pages/reader/reader.js

import '@css/base.css';
import '@css/components.css';
import '@css/pages/reader.css';

import {
  getChapterProgress,
  getCloudProgress,
  updateReaderProgress,
  bindScrollProgress,
  restoreScrollProgress,
  initAuth,
  initMobileDrawer,
  initTheme,
  initFont,
  setTheme,
  updateSize,
  loadReaderMeta,
  loadReaderChapter,
  applyNavigation,
  goBackToTale,
  saveReaderProgress,
  scheduleProgressSync,
  getLocalTotalReadTime,
  addReadTime,
} from './index.js';

import { applyReaderFont } from '@ui/font.registry.js';
import { initNav } from '@ui/components/nav.js';
initNav();
/* ==================== URL Parameters ==================== */
const params = new URLSearchParams(window.location.search);
const taleId = params.get('taleId');
const chapterIndex = parseInt(params.get('chapterId')) || 0;

/* ==================== Theme & Font ==================== */
initTheme();
initFont();

/* ==================== Reader UI Bindings ==================== */

function initReaderUI() {
  // Go back buttons
  document.getElementById('go-back-btn')?.addEventListener('click', () => goBackToTale(taleId));
  document
    .getElementById('go-back-mobile-btn')
    ?.addEventListener('click', () => goBackToTale(taleId));

  // Theme buttons — all use data-theme attribute
  document.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });

  // Font size ranges
  document
    .getElementById('font-size-range')
    ?.addEventListener('input', (e) => updateSize(e.target.value));
  document
    .getElementById('mobile-font-size-range')
    ?.addEventListener('input', (e) => updateSize(e.target.value));

  // Mobile font buttons — use data-font attribute
  document.querySelectorAll('[data-font]').forEach((btn) => {
    btn.addEventListener('click', () => applyReaderFont(btn.dataset.font));
  });

  // Popup toggles for desktop font controls
  initPopup('font-style', 'font-style-popup');
  initPopup('font-size', 'font-size-popup');
}

function initPopup(triggerId, popupId) {
  const btn = document.getElementById(triggerId);
  const popup = document.getElementById(popupId);
  if (!btn || !popup) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = popup.classList.contains('hidden');

    document.querySelectorAll('.popup-window').forEach((p) => p.classList.add('hidden'));

    if (isHidden) {
      const rect = btn.getBoundingClientRect();
      popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
      popup.style.left = `${rect.left + window.scrollX - 50}px`;
      popup.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && e.target !== btn) {
      popup.classList.add('hidden');
    }
  });
}

initReaderUI();

/* ==================== Progress Resolver ==================== */

async function resolveProgress({ userId, taleId, chapterIndex }) {
  const local = getChapterProgress({ userId, taleId, chapterIndex });
  const cloud = await getCloudProgress({ userId, taleId });

  const cloudChapter = cloud?.chapters?.[chapterIndex];

  if (!local && !cloudChapter) return null;
  if (!cloudChapter) return local;
  if (!local) return cloudChapter;

  const localTime =
    typeof local.updatedAt?.toMillis === 'function' ? local.updatedAt.toMillis() : local.updatedAt;
  const cloudTime =
    typeof cloudChapter.updatedAt?.toMillis === 'function'
      ? cloudChapter.updatedAt.toMillis()
      : cloudChapter.updatedAt;

  return cloudTime > localTime ? cloudChapter : local;
}

/* ==================== Auth & Initialization ==================== */

// Timeout for reader shows a message in the chapter title area, not cards-grid
const authTimeout = setTimeout(() => {
  const title = document.getElementById('chapter-title');
  if (title) title.textContent = 'Connection timed out. Please refresh.';
}, 10000);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const userId = user.uid;
  let sessionStart = Date.now();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const duration = Date.now() - sessionStart;
      if (duration > 1000) {
        addReadTime({ userId, taleId, durationMs: duration });
      }
      sessionStart = Date.now();
    }
  });

  const resolvedProgress = await resolveProgress({ userId, taleId, chapterIndex });

  await loadReaderMeta(taleId);

  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  applyNavigation(navigation, taleId);
  updateReaderProgress({ chapterIndex, totalChapters: navigation.totalChapters });
  restoreScrollProgress({ scrollPercent: resolvedProgress?.scrollPercent });

  bindScrollProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters,
    onScroll(scrollPercent) {
      saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent });
      const totalReadTimeMs = getLocalTotalReadTime({ userId, taleId });
      scheduleProgressSync({ userId, taleId, chapterIndex, scrollPercent, totalReadTimeMs });
    },
  });
});

/* ==================== Mobile ==================== */
initMobileDrawer();

// Initialize icons via CDN if available
if (window.lucide) {
  window.lucide.createIcons();
}
