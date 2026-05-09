// src/pages/reader/progress.js
// Manages scroll progress tracking, sidebar progress bar updates,
// and scroll position restoration for the reader page.

/* ==================== Sidebar Progress Bar ==================== */

/**
 * Updates the sidebar overall progress bar based on chapter position and scroll.
 * Uses fractional chapter units so partial scroll within a chapter is reflected.
 * Example: chapter 2 of 4 at 50% scroll = (2 + 0.5) / 4 = 62.5%
 *
 * @param {Object} params
 * @param {number} params.chapterIndex - Current chapter index (0-based)
 * @param {number} params.totalChapters - Total number of chapters in the tale
 * @param {number} [params.scrollPercent=0] - Current scroll position as a percentage
 * @returns {number} Calculated overall progress percentage
 */
export function updateReaderProgress({ chapterIndex, totalChapters, scrollPercent = 0 }) {
  const progressUnits = chapterIndex + scrollPercent / 100;
  const percent = Math.min(100, Math.round((progressUnits / totalChapters) * 100));

  const bar = document.getElementById('sidebar-progress-bar');
  const label = document.getElementById('progress-percent');

  if (bar) bar.style.width = `${percent}%`;
  if (label) label.textContent = `${percent}%`;

  return percent;
}

/* ==================== Scroll Tracking ==================== */

/**
 * Returns the scrollable content element.
 * Falls back to the document root if the scroll area is not found.
 *
 * @returns {HTMLElement} The scrollable target element
 */
function getScrollTarget() {
  return document.querySelector('.story-scroll-area') || document.documentElement;
}

/**
 * Calculates the scroll percentage for a given scrollable element.
 *
 * @param {HTMLElement} target - The scrollable element
 * @returns {number} Scroll progress as a percentage (0-100)
 */
function calculateScrollPercent(target) {
  const max = target.scrollHeight - target.clientHeight;
  if (max <= 0) return 0;
  return Math.min(100, Math.round((target.scrollTop / max) * 100));
}

/**
 * Binds a scroll event listener to track reading progress.
 * Updates the per-chapter reading bar, the sidebar overall bar,
 * and fires the onScroll callback with the current scroll percentage.
 * Uses requestAnimationFrame to debounce scroll events for performance.
 *
 * @param {Object} params
 * @param {number} params.chapterIndex - Current chapter index
 * @param {number} params.totalChapters - Total chapters in the tale
 * @param {function(number): void} params.onScroll - Callback fired with current scroll percent
 */
export function bindScrollProgress({ chapterIndex, totalChapters, onScroll }) {
  const target = getScrollTarget();
  let ticking = false;

  target.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const scrollPercent = calculateScrollPercent(target);

      // Update the per-chapter reading progress bar
      const readingBar = document.getElementById('reading-progress');
      if (readingBar) readingBar.style.width = `${scrollPercent}%`;

      // Update the sidebar overall tale progress bar
      updateReaderProgress({ chapterIndex, totalChapters, scrollPercent });

      // Fire the callback to save progress and schedule cloud sync
      onScroll(scrollPercent);

      ticking = false;
    });
  });
}

/* ==================== Scroll Restoration ==================== */

/**
 * Restores the user's scroll position from a saved percentage.
 * Uses a ResizeObserver to wait until the content is fully rendered
 * before attempting to scroll, preventing incorrect scroll positions
 * on slow connections or large chapters.
 *
 * @param {Object} params
 * @param {number} params.scrollPercent - Previously saved scroll percentage (0-100)
 */
export function restoreScrollProgress({ scrollPercent }) {
  if (typeof scrollPercent !== 'number' || scrollPercent <= 0) return;

  const target = getScrollTarget();

  // Wait for the content height to stabilize before scrolling
  const observer = new ResizeObserver(() => {
    const max = target.scrollHeight - target.clientHeight;
    if (max > 0) {
      target.scrollTop = (scrollPercent / 100) * max;
      observer.disconnect();
    }
  });

  observer.observe(target);
}
