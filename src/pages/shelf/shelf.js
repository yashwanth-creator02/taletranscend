// src/pages/shelf/shelf.js
// Entry point for the shelf page.
// Authenticates the user, renders bookmarked tales, and handles tab switching.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/shelf.css';

import { initAuth } from '@fb/index.js';
import { initIcons } from '@ui/components/icons.js';
import { renderCards } from './content.js';

/* ==================== Authentication ==================== */
initAuth(async (user) => {
  await renderCards(user.uid);
});

/* ==================== Icons ==================== */
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initShelfTabs();
});

/* ==================== Tab Switching ==================== */

/**
 * Initializes tab switching for the shelf page.
 * Uses event delegation on the tab buttons via data-tab attributes.
 */
function initShelfTabs() {
  const tabs = document.querySelectorAll('.shelf-tab');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const selected = tab.dataset.tab;

      // Update tab active state
      tabs.forEach((t) => {
        t.classList.remove('studio-tab-active');
        t.classList.add('text-zinc-500');
      });
      tab.classList.add('studio-tab-active');
      tab.classList.remove('text-zinc-500');

      // Tab content switching can be extended here when drafts are implemented
    });
  });
}
