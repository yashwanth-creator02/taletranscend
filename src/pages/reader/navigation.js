// src/pages/reader/navigation.js
// Chapter navigation: prev/next links, keyboard arrow shortcuts,
// and page transition fade.

/* ─────────────────────────────────────────────
   Apply Navigation Links
   ───────────────────────────────────────────── */

/**
 * Wires the previous and next chapter navigation links.
 * Handles visibility, content, and click-fade.
 */
export function applyNavigation(navigation, taleId) {
  const prev = document.getElementById('prev-link');
  const next = document.getElementById('next-link');

  // 1. Previous Chapter
  if (navigation.hasPrev && prev) {
    prev.href = _chapterUrl(taleId, navigation.prevIndex);
    prev.classList.remove('hidden');
    _setText('prev-title', navigation.prevTitle || 'Previous Chapter');
    prev.addEventListener('click', _fadeOut);
  } else {
    prev?.classList.add('hidden');
  }

  // 2. Next Chapter
  if (navigation.hasNext && next) {
    next.href = _chapterUrl(taleId, navigation.nextIndex);
    next.classList.remove('hidden');
    _setText('next-title', navigation.nextTitle || 'Next Chapter');
    next.addEventListener('click', _fadeOut);
  } else {
    next?.classList.add('hidden');
  }

  // 3. Keyboard Arrow Shortcuts
  const onKeydown = (e) => {
    // Only fire if not in input/textarea
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'ArrowLeft' && navigation.hasPrev) {
      _fadeAndNavigate(_chapterUrl(taleId, navigation.prevIndex));
    }
    if (e.key === 'ArrowRight' && navigation.hasNext) {
      _fadeAndNavigate(_chapterUrl(taleId, navigation.nextIndex));
    }
  };

  document.removeEventListener('keydown', onKeydown);
  document.addEventListener('keydown', onKeydown);
}

/**
 * Navigates back to the tale overview page.
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
  const url = e.currentTarget.href;
  if (url) _fadeAndNavigate(url);
}

function _fadeAndNavigate(url) {
  document.body.style.transition = 'opacity 0.25s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = url;
  }, 250);
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}
