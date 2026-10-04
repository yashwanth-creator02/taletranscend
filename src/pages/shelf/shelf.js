// src/pages/shelf/shelf.js
import { initPageReveal, readyReveal, setupAuthTimeout, createLogger } from '@/utils';
// Entry point for the shelf page.
// Authenticates the user, loads both data sets in parallel,
// then hands off to interactions and renderers.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/tale-cards.css';
import '@css/pages/shelf.css';

import {
  shelfState,
  setGridLoading,
  setActiveTab,
  loadBookmarkedTales,
  loadDrafts,
  loadRecentTales,
  computeAndRenderHeroStats,
  initShelfInteractions,
  initIcons,
  initAuth,
} from './index.js';
import { initShelfLayout } from './layout.js';

import { appState } from '@state/index.js';

const log = createLogger('Shelf');

initPageReveal();
log.info('Initializing Shelf page');

/* ─────────────────────────────────────────────
   Auth timeout guard
   ───────────────────────────────────────────── */

const authTimeout = setupAuthTimeout('shelf-grid');

/* ─────────────────────────────────────────────
   Page Lifecycle
   ───────────────────────────────────────────── */

export async function initShelfPage() {
  initShelfLayout();
  initShelfInteractions();
  initIcons();
  readyReveal();

  const uid = appState.userId || shelfState.userId;
  if (uid) {
    shelfState.userId = uid;
    setGridLoading();

    log.debug('Loading bookmarks, drafts, and recent tales...');
    await Promise.all([loadBookmarkedTales(uid), loadDrafts(uid), loadRecentTales(uid)]);

    setActiveTab('bookmarked');
    shelfState.activeTab = 'bookmarked';

    computeAndRenderHeroStats();
    readyReveal();
    initShelfLayout();
  }
}

/* ─────────────────────────────────────────────
   Auth + DOM Ready
   ───────────────────────────────────────────── */

initAuth(async (user) => {
  clearTimeout(authTimeout);
  shelfState.userId = user.uid;
  log.info('Auth resolved', { userId: user.uid });
  await initShelfPage();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initShelfPage();
  });
} else {
  initShelfPage();
}
