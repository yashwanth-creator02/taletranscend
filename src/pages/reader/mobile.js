// src/pages/reader/mobile.js
// Mobile-specific reader behaviour:
//   - Settings panel open/close
//   - Swipe left/right for chapter navigation
//   - Auto-hide toolbar on scroll down, show on scroll up

import { readerState } from './state.js';

/* ─────────────────────────────────────────────
   Settings Panel
   ───────────────────────────────────────────── */

/**
 * Initialises the mobile settings drawer toggle and backdrop close.
 */
export function initMobileDrawer() {
  const panel = document.getElementById('reader-settings-panel');
  const openBtn = document.getElementById('reader-settings-btn');
  const closeBtn = document.getElementById('reader-settings-close');

  if (!panel) return;

  openBtn?.addEventListener('click', () => openSettingsPanel());
  closeBtn?.addEventListener('click', () => closeSettingsPanel());

  // Backdrop click to close
  panel.addEventListener('click', (e) => {
    if (e.target === panel) closeSettingsPanel();
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && readerState.settingsPanelOpen) closeSettingsPanel();
  });
}

export function openSettingsPanel() {
  const panel = document.getElementById('reader-settings-panel');
  if (!panel) return;

  readerState.settingsPanelOpen = true;
  panel.classList.remove('translate-y-full');
  panel.classList.add('translate-y-0');
  panel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

export function closeSettingsPanel() {
  const panel = document.getElementById('reader-settings-panel');
  if (!panel) return;

  readerState.settingsPanelOpen = false;
  panel.classList.add('translate-y-full');
  panel.classList.remove('translate-y-0');
  panel.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ─────────────────────────────────────────────
   Swipe Navigation
   ───────────────────────────────────────────── */

/**
 * Adds horizontal swipe gesture detection for chapter navigation.
 * Swipe left → next chapter, swipe right → previous chapter.
 * Only activates when the settings panel is closed.
 *
 * @param {{ prevUrl: string|null, nextUrl: string|null }} urls
 */
export function initSwipeNavigation({ prevUrl, nextUrl }) {
  let startX = 0;
  let startY = 0;

  document.addEventListener(
    'touchstart',
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (readerState.settingsPanelOpen) return;

      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      // Only trigger on predominantly horizontal swipes > 60px
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.8) return;

      if (dx < 0 && nextUrl) {
        // Swipe left → next
        _fadeAndGo(nextUrl);
      } else if (dx > 0 && prevUrl) {
        // Swipe right → prev
        _fadeAndGo(prevUrl);
      }
    },
    { passive: true }
  );
}

/* ─────────────────────────────────────────────
   Auto-hide Mobile Toolbar
   ───────────────────────────────────────────── */

/**
 * Hides the mobile toolbar when scrolling down, reveals it on scroll up.
 * Prevents the toolbar from covering content while reading.
 */
export function initToolbarAutoHide() {
  const toolbar = document.getElementById('mobile-toolbar');
  if (!toolbar) return;

  let lastY = window.scrollY;
  let ticking = false;

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const scrollingDown = currentY > lastY && currentY > 80;

        toolbar.style.transform = scrollingDown ? 'translateY(100%)' : 'translateY(0)';
        toolbar.style.transition = 'transform 250ms cubic-bezier(0.4,0,0.2,1)';

        lastY = currentY;
        ticking = false;
      });
    },
    { passive: true }
  );
}

/* ─────────────────────────────────────────────
   Helper
   ───────────────────────────────────────────── */

function _fadeAndGo(url) {
  document.body.style.transition = 'opacity 180ms ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = url;
  }, 200);
}
