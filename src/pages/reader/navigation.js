// src/pages/reader/navigation.js
// Handles navigation between chapters and returning to the tale view.

import { readerState } from './state.js';
import { initIcons } from '@ui/components/icons.js';

/**
 * Renders the "Previous" and "Next" chapter buttons.
 */
export function applyNavigation(nav) {
  const container = document.getElementById('chapterNav');
  if (!container) return;

  const prev = nav.hasPrev
    ? `
    <button class="chapter-nav-btn glass hover-lift group" data-nav-index="${nav.prevIndex}">
      <i data-lucide="chevron-left" class="shrink-0" style="width:20px;height:20px;color:#c4b5fd;transition:transform 200ms"></i>
      <div class="min-w-0">
        <div class="chapter-nav-label">Previous &middot; Fragment ${nav.prevIndex + 1}</div>
        <div class="chapter-nav-title">${nav.prevTitle || 'Untitled'}</div>
      </div>
    </button>
  `
    : '<div></div>';

  const next = nav.hasNext
    ? `
    <button class="chapter-nav-btn chapter-nav-btn right glass hover-lift group" data-nav-index="${nav.nextIndex}">
      <div class="min-w-0">
        <div class="chapter-nav-label">Next &middot; Fragment ${nav.nextIndex + 1}</div>
        <div class="chapter-nav-title">${nav.nextTitle || 'Untitled'}</div>
      </div>
      <i data-lucide="chevron-right" class="shrink-0" style="width:20px;height:20px;color:#c4b5fd;transition:transform 200ms"></i>
    </button>
  `
    : `<div class="glass flex items-center justify-center rounded-2xl p-4 text-xs" style="color:rgba(255,255,255,0.4)">End of ${readerState.taleTitle}</div>`;

  container.innerHTML = prev + next;

  // Bind clicks
  container.querySelectorAll('[data-nav-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.navIndex;
      const url = new URL(window.location.href);
      url.searchParams.set('chapterId', idx);
      window.location.href = url.toString();
    });
  });

  initIcons();
}

/**
 * Returns the user to the tale summary page.
 */
export function goBackToTale() {
  if (readerState.taleId) {
    window.location.href = `/src/views/tale.html?id=${readerState.taleId}`;
  } else {
    window.location.href = '/src/views/library.html';
  }
}
