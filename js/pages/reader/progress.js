// js/pages/reader/progress.js
import { getTaleProgressData } from '@services/index';
/* ==================== Overall Progress ==================== */

/**
 * @param {Object} params
 * @param {number} params.chapterIndex - Current chapter (0-based)
 * @param {number} params.totalChapters
 * @param {number} params.scrollPercent - Current scroll (0-100)
 */
export function updateReaderProgress({ chapterIndex, totalChapters, scrollPercent = 0 }) {
  // We use the same 'units' logic as your library cards
  // Example: On Ch 2 of 4 at 50% scroll = (2 + 0.5) / 4 = 62.5%
  const progressUnits = chapterIndex + scrollPercent / 100;
  const percent = Math.min(100, Math.round((progressUnits / totalChapters) * 100));

  const bar = document.getElementById('sidebar-progress-bar');
  const label = document.getElementById('progress-percent');

  if (bar) bar.style.width = `${percent}%`;
  if (label) label.textContent = `${percent}%`;

  return percent; // Return to be used for Firestore updates
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
export function bindScrollProgress({ onScroll, chapterIndex, totalChapters }) {
  const target = getScrollTarget();
  let ticking = false;

  target.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const scrollPercent = calculateScrollPercent(target);

      // 1. Update the local "Current Chapter" scroll bar
      const readingBar = document.getElementById('reading-progress');
      if (readingBar) readingBar.style.width = `${scrollPercent}%`;

      // 2. Update the "Global Tale" progress bar in the sidebar
      updateReaderProgress({ chapterIndex, totalChapters, scrollPercent });

      // 3. Trigger the callback (which likely saves to Firestore)
      onScroll(scrollPercent);

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
  if (typeof scrollPercent !== 'number' || scrollPercent <= 0) return;

  const target = getScrollTarget();

  // Create an observer to wait until the content height is actually ready
  const observer = new ResizeObserver(() => {
    const max = target.scrollHeight - target.clientHeight;
    if (max > 0) {
      target.scrollTop = (scrollPercent / 100) * max;
      observer.disconnect(); // Stop watching once we've successfully scrolled
    }
  });

  observer.observe(target);
}
