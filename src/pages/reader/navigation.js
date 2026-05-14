// src/pages/reader/navigation.js
// Chapter navigation: prev/next links, keyboard arrow shortcuts,
// page transition fade, and back-to-tale navigation.

import { readerState } from './state.js';

/* ─────────────────────────────────────────────
   Apply Navigation Links
   ───────────────────────────────────────────── */

/**
 * Wires the previous and next chapter navigation links.
 * Hides links when there is no adjacent chapter.
 * Adds keyboard arrow key shortcuts for navigation.
 *
 * @param {Object} navigation
 * @param {boolean}     navigation.hasPrev
 * @param {boolean}     navigation.hasNext
 * @param {number|null} navigation.prevIndex
 * @param {number|null} navigation.nextIndex
 * @param {string|null} navigation.prevTitle
 * @param {string|null} navigation.nextTitle
 * @param {number}      navigation.totalChapters
 * @param {string} taleId
 */
export function applyNavigation(navigation, taleId) {
  const prev = document.getElementById('prev-link');
  const next = document.getElementById('next-link');

  if (navigation.hasPrev && prev) {
    const url = _chapterUrl(taleId, navigation.prevIndex);
    prev.href = url;
    prev.hidden = false;
    prev.classList.remove('hidden');

    const prevTitle = document.getElementById('prev-title');
    if (prevTitle) prevTitle.textContent = navigation.prevTitle || 'Previous';

    prev.addEventListener('click', _fadeOut);
  } else {
    prev?.classList.add('hidden');
  }

  if (navigation.hasNext && next) {
    const url = _chapterUrl(taleId, navigation.nextIndex);
    next.href = url;
    next.hidden = false;
    next.classList.remove('hidden');

    const nextTitle = document.getElementById('next-title');
    if (nextTitle) nextTitle.textContent = navigation.nextTitle || 'Next';

    next.addEventListener('click', _fadeOut);
  } else {
    next?.classList.add('hidden');
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    // Don't fire when user is typing
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === 'ArrowLeft' && navigation.hasPrev) {
      _fadeAndNavigate(_chapterUrl(taleId, navigation.prevIndex));
    }
    if (e.key === 'ArrowRight' && navigation.hasNext) {
      _fadeAndNavigate(_chapterUrl(taleId, navigation.nextIndex));
    }
  });
}

/* ─────────────────────────────────────────────
   Back Navigation
   ───────────────────────────────────────────── */

/**
 * Navigates back to the tale overview page.
 *
 * @param {string} taleId
 */
export function goBackToTale(taleId) {
  _fadeAndNavigate(`tale.html?id=${taleId}`);
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _chapterUrl(taleId, chapterId) {
  return `reader.html?taleId=${taleId}&chapterId=${chapterId}`;
}

function _fadeOut(e) {
  e?.preventDefault();
  const target = e?.currentTarget?.href ?? '';
  _fadeAndNavigate(target);
}

function _fadeAndNavigate(url) {
  document.body.style.transition = 'opacity 180ms ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = url;
  }, 200);
}
