// src/pages/library/library.js
// Entry point for the library page.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/library.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initAuth } from '@fb/index.js';
import { libraryState } from './state.js';

import { subscribeToTales, stopTalesSubscription } from './content.js';
import {
  applyAllFilters,
  setupSearch,
  setupEraFilter,
  setupToneFilter,
  setupLengthFilter,
  setupSidebarFilter,
} from './filters.js';
import { setupCardInteractions } from './interactions.js';
import {
  setupSidebarToggle,
  updateSidebarUser,
  showGridSkeleton,
  showGridError,
  setActiveSidebarBtn,
} from './ui.js';
import { initIcons } from '@/ui/icons.js';

import { setupAuthTimeout } from '@/utils/ui.utils';

initNav();

/* ─────────────────────────────────────────────
   DOM-ready setup (before auth)
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setupSidebarToggle();
  const grid = document.getElementById('cards-grid');
  if (grid) {
    grid.classList.add('fade-in-stagger');
    showGridSkeleton();
  }
  initIcons();
});

/* ─────────────────────────────────────────────
   Auth + Subscription
   ───────────────────────────────────────────── */

const authTimeout = setupAuthTimeout('cards-grid');

initAuth(async (user) => {
  clearTimeout(authTimeout);
  libraryState.userId = user.uid;

  // Update sidebar user avatar + name
  updateSidebarUser(user);

  // Submit tale button
  document.getElementById('btn-submit-tale')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  // Wire search (handles URL param pre-fill too)
  setupSearch();

  // Wire filters
  setupToneFilter();
  setupLengthFilter();

  // Wire sidebar filter buttons
  setupSidebarFilter();
  setActiveSidebarBtn('all');

  // Wire card interactions
  setupCardInteractions(user.uid);

  // Subscribe to real-time tales
  subscribeToTales(
    async (tales) => {
      // First load: build era chips from real data
      if (libraryState.allTales.length === 0 || tales.length !== libraryState.allTales.length) {
        setupEraFilter(tales);
      }

      // Apply all active filters against fresh data
      await applyAllFilters();
      initIcons();
    },
    () => showGridError()
  );
});

/* ─────────────────────────────────────────────
   Cleanup
   ───────────────────────────────────────────── */

window.addEventListener('beforeunload', stopTalesSubscription);
