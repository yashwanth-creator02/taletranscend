// src/pages/library/library.js
// Entry point for the library page.
// Handles authentication, tale subscriptions, search, and UI interactions.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/library.css';

import {
  initAuth,
  subscribeToTales,
  stopTalesSubscription,
  renderCardsGrid,
  initIcons,
  setupSearch,
  setupCardInteractions,
  setupSidebarToggle,
  db,
} from './index.js';

/* ==================== Global Variables ==================== */
// Stores all tales fetched from Firestore for use across handlers
let allTales = [];

/* ==================== UI Initialization ==================== */
// Set up sidebar toggle button before auth resolves
setupSidebarToggle();

/* ==================== Firebase Auth & Tales Subscription ==================== */
initAuth(async (user) => {
  const userId = user.uid;

  // Subscribe to live community tales updates from Firestore
  subscribeToTales(
    async (tales) => {
      allTales = tales;

      // Render the tale cards grid for the current user
      await renderCardsGrid(userId, tales);

      // Initialize icons after cards are rendered in the DOM
      initIcons();
    },
    (error) => {
      console.error('Tales subscription error:', error);

      // Show a database error message in the cards grid
      document.getElementById('cards-grid').innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
          Database connection failed.
        </div>
      `;
    }
  );

  /* ==================== UI Event Handlers ==================== */
  // Bind card click, like, and bookmark interactions
  setupCardInteractions(userId);

  // Bind search input to filter tales and re-render results
  setupSearch(
    () => allTales,
    (filtered) => renderCardsGrid(userId, filtered),
    initIcons
  );
});

/* ==================== Cleanup ==================== */
// Unsubscribe from Firestore when the page unloads to prevent memory leaks
window.addEventListener('beforeunload', stopTalesSubscription);
