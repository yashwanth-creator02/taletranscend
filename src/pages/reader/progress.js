// src/pages/reader/progress.js
// Scroll progress tracking, top progress bar, scroll restoration,
// and reading time tracking for the reader page.

import { readerState } from './state.js';

/* ─────────────────────────────────────────────
   Progress Bar
   ───────────────────────────────────────────── */

/**
 * Updates the reader progress indicators.
 *
 * @param {{ scrollPercent: number }} params
 */
export function updateReaderProgress({ scrollPercent = 0 }) {
  // 1. Top progress bar
  const topBar = document.getElementById('progress-bar');
  if (topBar) topBar.style.width = `${scrollPercent}%`;

  // 2. Top bar percentage text
  const pctText = document.getElementById('top-bar-pct');
  if (pctText) pctText.textContent = `${Math.round(scrollPercent)}%`;

  return scrollPercent;
}

/* ─────────────────────────────────────────────
   Scroll Tracking
   ───────────────────────────────────────────── */

/**
 * Binds a scroll listener to track reading progress.
 * Updates the top progress bar on every scroll.
 * Fires onScroll callback (debounced via rAF) for save/sync.
 *
 * @param {{ onScroll: (percent: number) => void }} params
 */
export function bindScrollProgress({ onScroll }) {
  const scroller = document.getElementById('scroller');
  if (!scroller) return () => {};

  const handler = () => {
    const scrollPercent = _calcScrollPercent(scroller);

    updateReaderProgress({ scrollPercent });

    // Show/hide back to top button
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      if (scroller.scrollTop > 600) {
        backToTop.classList.remove('hidden');
      } else {
        backToTop.classList.add('hidden');
      }
    }

    onScroll(scrollPercent);
  };

  scroller.addEventListener('scroll', handler, { passive: true });

  // Return cleanup
  return () => {
    scroller.removeEventListener('scroll', handler);
  };
}

/* ─────────────────────────────────────────────
   Scroll Restoration
   ───────────────────────────────────────────── */

/**
 * Restores the user's scroll position from a saved percentage.
 *
 * @param {{ scrollPercent: number }} params
 */
export function restoreScrollProgress({ scrollPercent }) {
  if (typeof scrollPercent !== 'number' || scrollPercent <= 2) return;

  const scroller = document.getElementById('scroller');
  if (!scroller) return;

  const observer = new ResizeObserver(() => {
    const max = _getMaxScroll(scroller);
    if (max > 50) {
      scroller.scrollTop = (scrollPercent / 100) * max;
      observer.disconnect();
    }
  });

  observer.observe(scroller);
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _getMaxScroll(target) {
  return target.scrollHeight - target.clientHeight;
}

function _calcScrollPercent(target) {
  const max = _getMaxScroll(target);
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (target.scrollTop / max) * 100));
}
