// src/pages/shelf/shelf.js
import { initPageReveal, readyReveal } from '@/utils';
// Entry point for the shelf page.
// Authenticates the user, loads both data sets in parallel,
// then hands off to interactions and renderers.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/shelf.css';

import {
  shelfState,
  setGridLoading,
  setActiveTab,
  loadBookmarkedTales,
  loadDrafts,
  computeAndRenderHeroStats,
  initShelfInteractions,
  initNav,
  initAuth,
  initIcons,
} from './index.js';
import { setupAuthTimeout } from '@/utils';

initPageReveal();
initNav();

/* ─────────────────────────────────────────────
   Auth timeout guard
   ───────────────────────────────────────────── */

const authTimeout = setupAuthTimeout('studio-grid');

/* ─────────────────────────────────────────────
   Auth + Data
   ───────────────────────────────────────────── */

initAuth(async (user) => {
  clearTimeout(authTimeout);
  shelfState.userId = user.uid;

  setGridLoading();

  // Load both data sets in parallel — bookmarks for the default tab view,
  // drafts in the background so hero stats can be computed immediately.
  // Bug fix: was calling loadBookmarkedTales twice (once in parallel, once after)
  // which caused two Firestore reads for no reason.
  await Promise.all([loadBookmarkedTales(user.uid), loadDrafts(user.uid)]);

  // Default view — bookmarks tab
  setActiveTab('bookmarked');
  shelfState.activeTab = 'bookmarked';

  // Compute hero stats now that both data sets are cached
  computeAndRenderHeroStats();
  readyReveal();
  initIcons();
});

/* ─────────────────────────────────────────────
   DOM Ready
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initShelfInteractions();
  initIcons();
});
