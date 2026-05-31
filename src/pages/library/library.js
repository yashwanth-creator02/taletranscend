// src/pages/library/library.js
// Library page entry point.
// Wires auth, real-time tales subscription, filters, interactions, and UI state.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/library.css';

import { initAuth } from '@fb/index.js';
import { initNav } from '@ui/components/nav/nav.js';
import { initIcons } from '@ui/components/icons.js';
import { initPageReveal, readyReveal } from '@/utils/ui.utils';

import { subscribeToTales, stopTalesSubscription } from './content.js';
import {
  applyAllFilters,
  setupSearch,
  setupEraFilter,
  setupToneFilter,
  setupLengthFilter,
  setupSidebarFilter,
} from './filters.js';
import { setupSidebarToggle, updateSidebarUser, showGridSkeleton, showGridError } from './ui.js';
import { setupCardInteractions } from './interactions.js';
import { libraryState } from './state.js';

initNav();
initPageReveal();

/* ─────────────────────────────────────────────
   DOM-ready — wire static UI before auth resolves
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  setupSidebarToggle();
  setupSearch();
  setupToneFilter();
  setupLengthFilter();
  setupSidebarFilter();
  showGridSkeleton();
  initIcons();
});

/* ─────────────────────────────────────────────
   Auth + Data
   ───────────────────────────────────────────── */

initAuth(async (user) => {
  libraryState.userId = user.uid;

  // Update sidebar with user identity
  updateSidebarUser(user);

  // Wire card interactions now that userId is available
  setupCardInteractions(user.uid);

  // Start real-time subscription
  subscribeToTales(
    async (tales) => {
      // First batch — set up era chips (derived from actual data)
      if (!libraryState.eraChipsBuilt) {
        setupEraFilter(tales);
        libraryState.eraChipsBuilt = true;
      }

      await applyAllFilters();
      readyReveal();
      initIcons();
    },
    () => showGridError()
  );
});

/* ─────────────────────────────────────────────
   Teardown
   ───────────────────────────────────────────── */

// Stop Firestore listener on page unload to prevent memory leaks
window.addEventListener('pagehide', () => stopTalesSubscription());
