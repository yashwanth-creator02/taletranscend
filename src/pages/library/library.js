// src/pages/library/library.js
// Entry point for the library page.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/library.css';

import { initNav } from '@ui/components/nav.js';
import {
  initAuth,
  subscribeToTales,
  stopTalesSubscription,
  renderCardsGrid,
  initIcons,
  setupSearch,
  setupCardInteractions,
  setupSidebarToggle,
  setupEraFilter,
  setupSidebarFilter,
} from './index.js';

initNav();

/* ==================== URL Search Pre-fill ==================== */
document.addEventListener('DOMContentLoaded', () => {
  const urlSearch = new URLSearchParams(window.location.search).get('search');
  if (urlSearch) {
    const input = document.getElementById('search-input');
    if (input) {
      input.value = urlSearch;
      input.dispatchEvent(new Event('input'));
    }
  }
});

/* ==================== Global State ==================== */
let allTales = [];

/* ==================== UI Init ==================== */
setupSidebarToggle();

/* ==================== Auth & Subscription ==================== */
const authTimeout = setTimeout(() => {
  document.getElementById('cards-grid').innerHTML = `
    <div class="col-span-full text-center py-20 text-red-500">
      Connection timed out. Please refresh.
    </div>
  `;
}, 10000);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const userId = user.uid;

  subscribeToTales(
    async (tales) => {
      allTales = tales;
      await renderCardsGrid(userId, tales);
      initIcons();
    },
    (error) => {
      console.error('Tales subscription error:', error);
      document.getElementById('cards-grid').innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
          Database connection failed.
        </div>
      `;
    }
  );

  setupCardInteractions(userId);

  setupSearch(
    () => allTales,
    (filtered) => renderCardsGrid(userId, filtered),
    initIcons
  );

  // Era filter bar at the top
  setupEraFilter(
    () => allTales,
    (filtered) => renderCardsGrid(userId, filtered),
    initIcons
  );

  // Sidebar filter buttons
  setupSidebarFilter(
    userId,
    () => allTales,
    (filtered) => renderCardsGrid(userId, filtered),
    initIcons
  );
});

/* ==================== Cleanup ==================== */
window.addEventListener('beforeunload', stopTalesSubscription);
