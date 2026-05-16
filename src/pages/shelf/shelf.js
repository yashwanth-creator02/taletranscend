// src/pages/shelf/shelf.js
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
import { setupAuthTimeout } from '@/utils/ui.utils';

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

  // Show skeleton immediately
  setGridLoading();

  // Load both data sets in parallel so hero stats can be computed
  // once both resolve — no sequential waterfall.
  const [,] = await Promise.all([loadBookmarkedTales(user.uid), loadDrafts(user.uid)]);

  // Default view: bookmarked tab
  // loadBookmarkedTales already rendered the grid — just sync tab UI
  setActiveTab('bookmarked');
  shelfState.activeTab = 'bookmarked';

  // Re-render bookmarked tab (drafts loaded in background for stats)
  await loadBookmarkedTales(user.uid);

  // Compute hero stats from both cached data sets
  computeAndRenderHeroStats();

  initIcons();
});

/* ─────────────────────────────────────────────
   DOM Ready
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initShelfInteractions();
  initIcons();
});
