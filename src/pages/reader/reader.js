// src/pages/reader/reader.js
// Entry point for the reader page.
// Handles authentication, progress resolution, chapter loading, and scroll tracking.

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

/* ==================== URL Parameters ==================== */
// Extract taleId and chapterId from the page query string
const params = new URLSearchParams(window.location.search);
const taleId = params.get('taleId');
const chapterIndex = parseInt(params.get('chapterId')) || 0;

/* ==================== Theme & Font ==================== */
// Initialize theme and font before content loads to avoid flash of unstyled text
initTheme();
initFont();

// Expose setters to window for HTML inline controls
window.setTheme = setTheme;
window.updateSize = updateSize;

/* ==================== Progress Resolver ==================== */

/**
 * Resolves the most up-to-date progress for a chapter
 * by comparing local storage and cloud Firestore progress.
 * Returns the newer of the two, or null if no progress exists.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the authenticated user
 * @param {string} params.taleId - ID of the tale being read
 * @param {number} params.chapterIndex - Index of the current chapter
 * @returns {Promise<Object|null>} Progress object or null
 */
async function resolveProgress({ userId, taleId, chapterIndex }) {
  const local = getChapterProgress({ userId, taleId, chapterIndex });
  const cloud = await getCloudProgress({ userId, taleId });

  // Cloud chapters map is keyed by chapterIndex as a string
  const cloudChapter = cloud?.chapters?.[chapterIndex];

  if (!local && !cloudChapter) return null;
  if (!cloudChapter) return local;
  if (!local) return cloudChapter;

  // Compare timestamps — Firestore Timestamps have toMillis(), local are plain numbers
  const localTime =
    typeof local.updatedAt?.toMillis === 'function' ? local.updatedAt.toMillis() : local.updatedAt;
  const cloudTime =
    typeof cloudChapter.updatedAt?.toMillis === 'function'
      ? cloudChapter.updatedAt.toMillis()
      : cloudChapter.updatedAt;

  return cloudTime > localTime ? cloudChapter : local;
}

/* ==================== Initialization ==================== */
initAuth(async (user) => {
  const userId = user.uid;
  let sessionStart = Date.now();

  // Record read time whenever the user hides or leaves the tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const duration = Date.now() - sessionStart;
      if (duration > 1000) {
        addReadTime({ userId, taleId, durationMs: duration });
      }
      sessionStart = Date.now();
    }
  });

  // Resolve the best available progress before rendering
  const resolvedProgress = await resolveProgress({ userId, taleId, chapterIndex });

  // Load tale metadata into the sidebar and header
  await loadReaderMeta(taleId);

  // Load the chapter content and navigation context
  const navigation = await loadReaderChapter({ taleId, chapterIndex });
  if (!navigation) return;

  // Apply prev/next chapter navigation links
  applyNavigation(navigation, taleId);

  // Update the sidebar overall progress bar
  updateReaderProgress({ chapterIndex, totalChapters: navigation.totalChapters });

  // Restore the user's scroll position from saved progress
  restoreScrollProgress({ scrollPercent: resolvedProgress?.scrollPercent });

  // Bind scroll listener to track and sync progress while reading
  bindScrollProgress({
    chapterIndex,
    totalChapters: navigation.totalChapters,
    onScroll(scrollPercent) {
      // Persist progress locally on every scroll event
      saveReaderProgress({ userId, taleId, chapterIndex, scrollPercent });

      const totalReadTimeMs = getLocalTotalReadTime({ userId, taleId });

      // Debounced sync to Firestore — fires after the user stops scrolling
      scheduleProgressSync({ userId, taleId, chapterIndex, scrollPercent, totalReadTimeMs });
    },
  });
});

// Add this to src/pages/reader/reader.js after the imports

/* ==================== Reader UI Bindings ==================== */

/**
 * Wires up all reader UI controls via event listeners.
 * Replaces all onclick attributes that were previously in the HTML.
 * Called once on page load before auth resolves.
 */
function initReaderUI() {
  // -------------------- Go Back --------------------
  document.getElementById('go-back-btn')?.addEventListener('click', () => goBackToTale(taleId));
  document
    .getElementById('go-back-mobile-btn')
    ?.addEventListener('click', () => goBackToTale(taleId));

  // -------------------- Theme Buttons --------------------
  // All buttons with data-theme attribute trigger setTheme
  document.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme));
  });

  // -------------------- Font Size Range --------------------
  document
    .getElementById('font-size-range')
    ?.addEventListener('input', (e) => updateSize(e.target.value));
  document
    .getElementById('mobile-font-size-range')
    ?.addEventListener('input', (e) => updateSize(e.target.value));

  // -------------------- Font Buttons (mobile drawer) --------------------
  document.querySelectorAll('[data-font]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyReaderFont(btn.dataset.font);
      markActiveFont(btn.dataset.font);
    });
  });

  // -------------------- Popup Toggle (font style / font size) --------------------
  initPopup('font-style', 'font-style-popup');
  initPopup('font-size', 'font-size-popup');
}

/**
 * Sets up a popup toggle triggered by a button.
 * Closes all other open popups before opening the target.
 * Closes the popup when clicking outside it.
 *
 * @param {string} triggerId - ID of the button that opens the popup
 * @param {string} popupId - ID of the popup element
 */
function initPopup(triggerId, popupId) {
  const btn = document.getElementById(triggerId);
  const popup = document.getElementById(popupId);
  if (!btn || !popup) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = popup.classList.contains('hidden');

    // Close all open popups first
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

// Initialize UI bindings immediately on load
initReaderUI();

/* ==================== Mobile & UI ==================== */
// Expose go-back function for HTML button onclick
window.GoBack = () => goBackToTale(taleId);

// Initialize mobile drawer toggle
initMobileDrawer();

// Initialize Lucide icons if the CDN script has loaded
if (window.lucide) {
  window.lucide.createIcons();
}
