// src/pages/tale/tale.js
// Modern Archive Entry Point
// Orchestrates neural link, data hydration, and interactive states.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/tale.css';

import {
  initAuth,
  loadTale,
  loadChapters,
  renderTale,
  renderChapters,
  showArchiveSkeletons,
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupResumeReading,
  initHeaderScroll,
  listenToComments,
  postComment,
  initIcons,
} from './index.js';
import { initNav } from '@ui/components/nav/nav.js';
import { setupAuthTimeout } from '@/utils/ui.utils';

/* ─────────────────────────────────────────────
   URL Parameters
   ───────────────────────────────────────────── */

const taleId = new URLSearchParams(window.location.search).get('id');

if (!taleId) {
  location.replace('library.html');
  throw new Error('No taleId detected');
}

/* ─────────────────────────────────────────────
   Bootstrap Component
   ───────────────────────────────────────────── */

initNav();

const authTimeout = setupAuthTimeout('display-description', 'Archive connection timed out. Neural link severed.');

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const userId = user.uid;

  // 0. Show Skeletons
  showArchiveSkeletons();

  // 1. Data Hydration
  const [tale, chapters] = await Promise.all([
    loadTale(taleId, user),
    loadChapters(taleId)
  ]);

  if (!tale) return;

  // 2. Primary UI
  await renderTale(userId, tale, taleId);
  renderChapters(userId, chapters, taleId);

  // 3. Interactions
  bindChapterClicks(taleId);
  setupStartReading(taleId, chapters);
  setupResumeReading(userId, taleId);
  setupResonance(taleId);
  setupTabs();
  initHeaderScroll();

  // 4. Real-time Listeners
  listenToComments(taleId);

  // 5. Post-resolve hooks
  document.getElementById('post-btn')?.addEventListener('click', () => postComment(taleId));
  
  initIcons();
});

/* ─────────────────────────────────────────────
   Static Initialization
   ───────────────────────────────────────────── */

initIcons();
