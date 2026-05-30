// src/pages/reader/navigation.js
// Handles prev/next chapter navigation buttons and returning to the tale view.

import { readerState } from './state.js';
import { initIcons } from '@ui/components/icons.js';
import { navigateTo } from '@/utils/ui.utils';

/**
 * Renders the previous/next chapter navigation buttons and wires their click handlers.
 *
 * @param {Object} nav - Navigation context from getChapter()
 * @param {boolean} nav.hasPrev
 * @param {boolean} nav.hasNext
 * @param {number|null} nav.prevIndex
 * @param {number|null} nav.nextIndex
 * @param {string|null} nav.prevTitle
 * @param {string|null} nav.nextTitle
 */
export function applyNavigation(nav) {
  const container = document.getElementById('chapterNav');
  if (!container) return;

  const prev = nav.hasPrev
    ? `
    <button class="chapter-nav-btn glass hover-lift group" data-nav-index="${nav.prevIndex}" type="button">
      <i data-lucide="chevron-left" class="shrink-0" style="width:20px;height:20px;color:#c4b5fd;transition:transform 200ms"></i>
      <div class="min-w-0">
        <div class="chapter-nav-label">Previous &middot; Fragment ${nav.prevIndex + 1}</div>
        <div class="chapter-nav-title">${nav.prevTitle || 'Untitled'}</div>
      </div>
    </button>`
    : '<div></div>';

  const next = nav.hasNext
    ? `
    <button class="chapter-nav-btn chapter-nav-btn--right glass hover-lift group" data-nav-index="${nav.nextIndex}" type="button">
      <div class="min-w-0">
        <div class="chapter-nav-label">Next &middot; Fragment ${nav.nextIndex + 1}</div>
        <div class="chapter-nav-title">${nav.nextTitle || 'Untitled'}</div>
      </div>
      <i data-lucide="chevron-right" class="shrink-0" style="width:20px;height:20px;color:#c4b5fd;transition:transform 200ms"></i>
    </button>`
    : `<div class="glass flex items-center justify-center rounded-2xl p-4 text-xs" style="color:rgba(255,255,255,0.4)">End of ${readerState.taleTitle}</div>`;

  container.innerHTML = prev + next;

  container.querySelectorAll('[data-nav-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('chapterId', btn.dataset.navIndex);
      window.location.href = url.toString();
    });
  });

  initIcons(container);
}

/**
 * Returns the user to the tale summary page.
 * Bug fix: was using hardcoded '/src/views/tale.html' absolute path.
 * Now uses a relative path that works regardless of deployment root.
 */
export function goBackToTale() {
  if (readerState.taleId) {
    navigateTo(`tale.html?id=${readerState.taleId}`);
  } else {
    navigateTo('library.html');
  }
}
