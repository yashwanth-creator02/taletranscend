// src/pages/shelf/shelf.js
// Entry point for the shelf page.
// Authenticates the user, loads both data sets in parallel,
// then hands off to interactions and renderers.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/shelf.css';

import { initAuth } from '@fb/index.js';
import { initNav } from '@ui/components/nav/nav.js';
import { initShelfInteractions } from './interactions.js';
import { loadBookmarkedTales, loadDrafts, computeAndRenderHeroStats } from './content.js';
import { setGridLoading, setActiveTab } from './ui.js';
import { shelfState } from './state.js';

initNav();

/* ─────────────────────────────────────────────
   Auth timeout guard
   ───────────────────────────────────────────── */

const authTimeout = setTimeout(() => {
  const grid = document.getElementById('studio-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20 text-red-500/80 text-sm">
        Connection timed out. Please refresh.
      </div>
    `;
  }
}, 10_000);

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

  window.lucide?.createIcons?.();
});

/* ─────────────────────────────────────────────
   DOM Ready
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initShelfInteractions();
  window.lucide?.createIcons?.();
});
