// src/pages/tale/tale.js
// Entry point for the tale overview page.
// Bootstraps auth, loads tale data, renders UI, and binds interactions.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/tale.css';

import {
  initAuth,
  loadTale,
  loadChapters,
  renderTale,
  renderChapters,
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupResumeReading,
  listenToComments,
  postComment,
  initIcons,
} from './index.js';
import { createIcons, icons } from 'lucide';
import { initNav } from '@ui/components/nav.js';
initNav();
/* ==================== URL Parameters ==================== */
const taleId = new URLSearchParams(window.location.search).get('id');

// Redirect to library if no tale ID is present in the URL
if (!taleId) {
  location.replace('library.html');
  throw new Error('No taleId');
}

/* ==================== Initialization ==================== */

/**
 * Bootstraps the tale page after authentication:
 * - Loads and renders tale metadata
 * - Loads and renders chapter list
 * - Binds all user interactions
 * - Starts real-time comment listener
 */
const authTimeout = setTimeout(() => {
  document.getElementById('cards-grid').innerHTML = `
    <div class="col-span-full text-center py-20 text-red-500">
      Connection timed out. Please refresh.
    </div>
  `;
}, 10000);
initAuth(async (user) => {
  const userId = user.uid;
  clearTimeout(authTimeout);

  const tale = await loadTale(taleId, user);
  if (!tale) return;

  await renderTale(userId, tale, taleId);

  const chapters = await loadChapters(taleId);
  renderChapters(userId, chapters, taleId);

  bindChapterClicks(taleId);
  setupStartReading(taleId, chapters);
  setupResumeReading(userId, taleId);
  setupTabs();

  listenToComments(taleId);

  // Expose comment posting for HTML inline handler
  document.getElementById('post-btn')?.addEventListener('click', () => postComment(taleId));
});

/* ==================== Icons ==================== */
initIcons();
createIcons({ icons });
