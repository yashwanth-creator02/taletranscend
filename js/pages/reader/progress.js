// js/pages/reader/progress.js
import { getOverallProgress } from './progress.utils.js';

/* ==================== Overall Progress ==================== */

/**
 * Updates the reader sidebar progress bar and label based on the current chapter.
 *
 * @param {Object} params
 * @param {number} params.chapterIndex - Index of the current chapter
 * @param {number} params.totalChapters - Total number of chapters in the tale
 */
export function updateReaderProgress({ chapterIndex, totalChapters }) {
  const progress = getOverallProgress({ chapterIndex, totalChapters });

  const bar = document.getElementById('sidebar-progress-bar');
  const label = document.getElementById('progress-percent');

  if (bar) bar.style.width = `${progress.percent}%`;
  if (label) label.textContent = `${progress.percent}%`;
}

/* ==================== Scroll Progress ==================== */

/**
 * Returns the scrollable target element for the story content.
 * Defaults to '.story-scroll-area' or falls back to the document.
 */
function getScrollTarget() {
  return document.querySelector('.story-scroll-area') || document.documentElement;
}

/**
 * Calculates the scroll percentage for a given target element.
 *
 * @param {HTMLElement} target - Scrollable element
 * @returns {number} - Scroll progress as a percentage (0–100)
 */
function calculateScrollPercent(target) {
  const max = target.scrollHeight - target.clientHeight;
  if (max <= 0) return 0;
  return Math.min(100, Math.round((target.scrollTop / max) * 100));
}

/**
 * Binds scroll event to track reading progress and update the progress bar.
 *
 * @param {Object} params
 * @param {function(number): void} params.onScroll - Callback called with current scroll percent
 */
export function bindScrollProgress({ onScroll }) {
  const target = getScrollTarget();
  let ticking = false;

  target.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const percent = calculateScrollPercent(target);
      onScroll(percent);

      // Update the reading progress bar visually
      const bar = document.getElementById('reading-progress');
      if (bar) bar.style.width = `${percent}%`;

      ticking = false;
    });
  });
}

/* ==================== Restore Scroll Position ==================== */

/**
 * Restores scroll position based on a saved scroll percentage.
 *
 * @param {Object} params
 * @param {number} params.scrollPercent - Previously saved scroll percentage (0–100)
 */
export function restoreScrollProgress({ scrollPercent }) {
  if (typeof scrollPercent !== 'number') return;

  const target = getScrollTarget();
  requestAnimationFrame(() => {
    const max = target.scrollHeight - target.clientHeight;
    if (max > 0) {
      target.scrollTop = (scrollPercent / 100) * max;
    }
  });
}
