// src/pages/reader/progress.js
// Scroll progress tracking, sidebar progress bar, scroll restoration,
// and reading time tracking for the reader page.

import { readerState } from './state.js';

/* ─────────────────────────────────────────────
   Sidebar Progress Bar
   ───────────────────────────────────────────── */

/**
 * Updates the sidebar overall tale progress bar.
 * Uses fractional chapter units so scroll within a chapter is reflected.
 * E.g. chapter 2 of 4 at 50% scroll → (2 + 0.5) / 4 = 62.5%
 *
 * @param {{ chapterIndex: number, totalChapters: number, scrollPercent?: number }} params
 * @returns {number} Overall progress percentage
 */
export function updateReaderProgress({ chapterIndex, totalChapters, scrollPercent = 0 }) {
  const progressUnits = chapterIndex + scrollPercent / 100;
  const percent = Math.min(100, Math.round((progressUnits / Math.max(1, totalChapters)) * 100));

  const bar = document.getElementById('sidebar-progress-bar');
  const label = document.getElementById('progress-percent');

  if (bar) bar.style.width = `${percent}%`;
  if (label) label.textContent = `${percent}%`;

  // Top reading progress bar
  const topBar = document.getElementById('reading-progress');
  if (topBar) topBar.style.width = `${scrollPercent}%`;

  return percent;
}

/* ─────────────────────────────────────────────
   Scroll Tracking
   ───────────────────────────────────────────── */

/**
 * Binds a scroll listener to track reading progress.
 * Updates the top progress bar + sidebar bar on every scroll.
 * Fires onScroll callback (debounced via rAF) for save/sync.
 *
 * @param {{ chapterIndex: number, totalChapters: number, onScroll: (percent: number) => void }} params
 */
export function bindScrollProgress({ chapterIndex, totalChapters, onScroll }) {
  const handler = () => {
    const scrollPercent = _calcScrollPercent();

    // Top bar
    const topBar = document.getElementById('reading-progress');
    if (topBar) topBar.style.width = `${scrollPercent}%`;

    // Sidebar overall bar
    updateReaderProgress({ chapterIndex, totalChapters, scrollPercent });

    onScroll(scrollPercent);
  };

  window.addEventListener('scroll', handler, { passive: true });
  document.addEventListener('scroll', handler, { passive: true });

  // Return cleanup
  return () => {
    window.removeEventListener('scroll', handler);
    document.removeEventListener('scroll', handler);
  };
}

/* ─────────────────────────────────────────────
   Scroll Restoration
   ───────────────────────────────────────────── */

/**
 * Restores the user's scroll position from a saved percentage.
 * Waits for content to finish rendering via ResizeObserver before scrolling.
 *
 * @param {{ scrollPercent: number }} params
 */
export function restoreScrollProgress({ scrollPercent }) {
  if (typeof scrollPercent !== 'number' || scrollPercent <= 2) return;

  const target = _getScrollTarget();

  const observer = new ResizeObserver(() => {
    const max = _getMaxScroll(target);
    if (max > 50) {
      target.scrollTop = (scrollPercent / 100) * max;
      observer.disconnect();
    }
  });

  observer.observe(target);
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _getScrollTarget() {
  return document.documentElement;
}

function _getMaxScroll(target) {
  return target.scrollHeight - target.clientHeight;
}

function _calcScrollPercent() {
  const target = _getScrollTarget();
  const max = _getMaxScroll(target);
  if (max <= 0) return 0;
  return Math.min(100, Math.round((target.scrollTop / max) * 100));
}
