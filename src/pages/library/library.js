// src/pages/library/library.js
// Library page entry point — now paginated.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/library.css';

import { initAuth } from '@fb/index.js';
import { initNav } from '@ui/components/nav/nav.js';
import { initIcons } from '@ui/components/icons.js';
import { initPageReveal, readyReveal } from '@/utils';

import { loadTalesBatch, loadMoreTales } from './content.js';
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

  updateSidebarUser(user);
  setupCardInteractions(user.uid);

  try {
    const tales = await loadTalesBatch();

    if (!libraryState.eraChipsBuilt) {
      setupEraFilter(tales);
      libraryState.eraChipsBuilt = true;
    }

    await applyAllFilters();
    readyReveal();
    initIcons();
  } catch (err) {
    console.error('[library] Init failed:', err);
    showGridError();
  }
});

/* ─────────────────────────────────────────────
   Load More Button
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('load-more-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (libraryState.isLoadingMore || !libraryState.hasMore) return;

    btn.textContent = 'Loading...';
    btn.disabled = true;

    await loadMoreTales();
    await applyAllFilters();

    btn.disabled = false;
    btn.textContent = libraryState.hasMore ? 'Load More Tales' : 'All Tales Loaded';
    if (!libraryState.hasMore) btn.classList.add('opacity-50', 'cursor-not-allowed');
  });
});
