// src/pages/shelf/shelf.js
// Entry point for the shelf page.
// Authenticates the user, renders bookmarked tales, and handles tab switching.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/shelf.css';

import { initAuth } from '@fb/index.js';
import { initIcons } from '@ui/components/icons.js';
import { renderBookmarkedCards, renderDraftCards } from './content.js';
import { initNav } from '@ui/components/nav.js';
initNav();
// Holds the authenticated user ID for tab switching after auth resolves
let currentUserId = null;

/* ==================== Authentication ==================== */

const authTimeout = setTimeout(() => {
  const grid = document.getElementById('studio-grid');
  if (grid)
    grid.innerHTML = `
    <div class="col-span-full text-center py-20 text-red-500">
      Connection timed out. Please refresh.
    </div>
  `;
}, 10000);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  currentUserId = user.uid;

  // Default to bookmarked tab on load
  await renderBookmarkedCards(currentUserId);
});

/* ==================== Icons & UI ==================== */

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initShelfTabs();
});

/* ==================== Tab Switching ==================== */

/**
 * Initializes tab switching for the shelf page.
 * Renders the appropriate content when each tab is selected.
 */
function initShelfTabs() {
  const tabs = document.querySelectorAll('.shelf-tab');

  tabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      const selected = tab.dataset.tab;

      // Update active tab styles
      tabs.forEach((t) => {
        t.classList.remove('studio-tab-active');
        t.classList.add('text-zinc-500');
      });
      tab.classList.add('studio-tab-active');
      tab.classList.remove('text-zinc-500');

      // Render content for selected tab
      // Wait for auth to resolve before rendering
      if (!currentUserId) return;

      if (selected === 'bookmarked') {
        await renderBookmarkedCards(currentUserId);
      } else if (selected === 'drafts') {
        await renderDraftCards(currentUserId);
      }
    });
  });
}
