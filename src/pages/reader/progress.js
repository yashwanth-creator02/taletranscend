// src/pages/reader/progress.js
// Scroll progress tracking, top progress bar, scroll restoration,
// and reading time tracking for the reader page.

import { createLogger } from '@/utils';

const log = createLogger('ReaderProgress');

/* ─────────────────────────────────────────────
   Progress Bar
   ───────────────────────────────────────────── */

/**
 * Updates the reader progress indicators.
 *
 * @param {{ scrollPercent: number }} params
 */
export function updateReaderProgress({ scrollPercent = 0 }) {
  log.debug('Updating reader progress', { scrollPercent });
  // 1. Top progress bar
  const topBars = [
    document.getElementById('progressBar'),
    document.getElementById('progress-bar'),
  ].filter(Boolean);
  topBars.forEach((bar) => {
    bar.style.width = `${scrollPercent}%`;
  });

  // 2. Top bar percentage text
  const pctTexts = [
    document.getElementById('topBarPct'),
    document.getElementById('top-bar-pct'),
  ].filter(Boolean);
  pctTexts.forEach((pct) => {
    pct.textContent = `${Math.round(scrollPercent)}%`;
  });

  return scrollPercent;
}

/* ─────────────────────────────────────────────
   Scroll Tracking
   ───────────────────────────────────────────── */

/**
 * Binds a scroll listener to track reading progress.
 * Updates the top progress bar on every scroll.
 * Fires onScroll callback for save/sync.
 * Once reading progress reaches 100%, it remains locked at 100%.
 *
 * @param {{ onScroll: (percent: number) => void, initialPercent?: number }} params
 */
export function bindScrollProgress({ onScroll, initialPercent = 0 }) {
  const scroller = document.getElementById('scroller');
  if (!scroller) return () => {};

  let isCompleted = typeof initialPercent === 'number' && initialPercent >= 100;

  if (isCompleted) {
    updateReaderProgress({ scrollPercent: 100 });
  }

  const handler = () => {
    let scrollPercent = _calcScrollPercent(scroller);

    if (isCompleted || scrollPercent >= 100) {
      isCompleted = true;
      scrollPercent = 100;
    }

    updateReaderProgress({ scrollPercent });

    // Show/hide back to top button
    const backToTop =
      document.getElementById('backToTop') || document.getElementById('back-to-top');
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
 * If chapter is already completed (100%), scroll restoration is skipped so
 * user can read fresh from the top while keeping progress at 100%.
 *
 * @param {{ scrollPercent: number }} params
 */
export function restoreScrollProgress({ scrollPercent }) {
  if (typeof scrollPercent !== 'number' || scrollPercent <= 2 || scrollPercent >= 100) return;

  const scroller = document.getElementById('scroller');
  if (!scroller) return;

  const observer = new ResizeObserver(() => {
    const max = _getArticleMaxScroll(scroller);
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

export function _getMaxScroll(target) {
  return target.scrollHeight - target.clientHeight;
}

export function _getArticleMaxScroll(target) {
  const article =
    target?.querySelector?.('#article-body') || document.getElementById('article-body');
  if (article) {
    const scrollerRect = target.getBoundingClientRect?.() || { top: 0 };
    const articleRect = article.getBoundingClientRect?.() || { top: 0, height: 0 };
    const articleTop =
      typeof article.offsetTop === 'number' && article.offsetTop > 0
        ? article.offsetTop
        : articleRect.top - scrollerRect.top + target.scrollTop;
    const articleHeight = article.offsetHeight || articleRect.height || article.scrollHeight;

    if (articleHeight > 0) {
      const endScroll = articleTop + articleHeight - target.clientHeight;
      return Math.max(0, endScroll);
    }
  }

  return _getMaxScroll(target);
}

export function _calcScrollPercent(target) {
  const article =
    target?.querySelector?.('#article-body') || document.getElementById('article-body');
  if (article) {
    const scrollerRect = target.getBoundingClientRect?.() || { top: 0 };
    const articleRect = article.getBoundingClientRect?.() || { top: 0, height: 0 };
    const articleTop =
      typeof article.offsetTop === 'number' && article.offsetTop > 0
        ? article.offsetTop
        : articleRect.top - scrollerRect.top + target.scrollTop;
    const articleHeight = article.offsetHeight || articleRect.height || article.scrollHeight;

    if (articleHeight > 0) {
      const endScroll = articleTop + articleHeight - target.clientHeight;
      if (endScroll <= 0) return 100;
      return Math.min(100, Math.max(0, (target.scrollTop / endScroll) * 100));
    }
  }

  const max = _getMaxScroll(target);
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (target.scrollTop / max) * 100));
}
