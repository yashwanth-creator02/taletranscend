// src/pages/reader/mobile.js
// Specialized mobile behaviours for the reader page.
// Uses navigateTo() for all page changes so transitions are smooth.

import { readerState } from './state.js';
import { navigateTo } from '@/utils/ui.utils';

/* ─────────────────────────────────────────────
   Settings Drawer (Mobile)
   ───────────────────────────────────────────── */

export function initMobileDrawer() {
  const panel   = document.getElementById('reader-settings-panel');
  const openBtn = document.getElementById('reader-settings-btn');
  const closeBtn = document.getElementById('reader-settings-close');

  if (!panel) return;

  const openPanel = () => {
    panel.classList.remove('hidden');
    panel.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    readerState.settingsPanelOpen = true;
  };

  const closePanel = () => {
    panel.classList.remove('is-open');
    document.body.style.overflow = '';
    readerState.settingsPanelOpen = false;
    // Small delay before hiding so the close animation plays
    setTimeout(() => panel.classList.add('hidden'), 300);
  };

  openBtn?.addEventListener('click', openPanel);
  closeBtn?.addEventListener('click', closePanel);

  // Close on backdrop click
  panel.addEventListener('click', (e) => {
    if (e.target === panel) closePanel();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && readerState.settingsPanelOpen) closePanel();
  });
}

/* ─────────────────────────────────────────────
   Swipe Navigation
   ───────────────────────────────────────────── */

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

      // Predominantly horizontal swipe > 60px
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

      if (dx < 0 && nextUrl) navigateTo(nextUrl);
      if (dx > 0 && prevUrl) navigateTo(prevUrl);
    },
    { passive: true }
  );
}

/* ─────────────────────────────────────────────
   Toolbar Auto-Hide
   ───────────────────────────────────────────── */

export function initToolbarAutoHide() {
  const toolbar = document.getElementById('mobile-toolbar');
  if (!toolbar) return;

  let lastY = window.scrollY;

  window.addEventListener(
    'scroll',
    () => {
      const currentY    = window.scrollY;
      const scrollingDown = currentY > lastY && currentY > 60;
      toolbar.style.transform = scrollingDown ? 'translateY(100%)' : 'translateY(0)';
      lastY = currentY;
    },
    { passive: true }
  );
}
