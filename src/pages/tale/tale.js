// src/pages/tale/tale.js
import { initPageReveal, readyReveal, setupAuthTimeout, createLogger } from '@/utils';
// Tale Archive page entry point.
// Orchestrates data hydration and all user interactions.

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
  setupShelfButton,
  setupShareButton,
  setupResonance,
  initHeaderScroll,
  setupChronicleBatchActions,
  listenToComments,
  postComment,
  initIcons,
} from './index.js';
import { addToBookmarks, removeFromBookmarks, isBookmarked } from '@services/index.js';

const log = createLogger('TaleArchive');

initPageReveal();
log.info('Initializing Tale Archive page');

/* ─────────────────────────────────────────────
   URL Parameters
   ─────────────────────────────────────────────
   Supports both:
     /tales/{taleId}        (hierarchical — canonical)
     /tale?id={taleId}      (legacy query-string — backwards compat)
   ───────────────────────────────────────────── */

const _pathMatch = window.location.pathname.match(/\/tales\/([^/]+)/);
const taleId =
  (_pathMatch && decodeURIComponent(_pathMatch[1])) ||
  new URLSearchParams(window.location.search).get('id');

if (!taleId) {
  location.replace('/library.html');
  throw new Error('No taleId in URL');
}

/* ─────────────────────────────────────────────
   Bootstrap
   ───────────────────────────────────────────── */

const authTimeout = setupAuthTimeout(
  'display-description',
  'Archive connection timed out. Please try again.'
);

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const userId = user.uid;
  log.info('Auth resolved', { userId });

  // 0. Skeleton loaders
  showArchiveSkeletons();

  // 1. Data hydration
  const [tale, chapters] = await Promise.all([loadTale(taleId, user), loadChapters(taleId)]);

  if (!tale) {
    log.error('Tale not found', { taleId });
    return;
  }

  // 2. Primary UI
  await renderTale(userId, tale, taleId);
  renderChapters(userId, chapters, taleId);
  readyReveal();

  // 3. Interactions
  bindChapterClicks(taleId, chapters, userId, tale);
  setupChronicleBatchActions(userId, taleId, chapters, tale);
  setupStartReading(taleId, chapters);
  setupResumeReading(userId, taleId);
  setupResonance(taleId);
  setupTabs();
  initHeaderScroll();

  // 4. Shelf and share buttons
  await setupShelfButton(userId, taleId, tale, {
    addToBookmarks,
    removeFromBookmarks,
    isBookmarked,
  });
  setupShareButton(taleId);

  // 5. Real-time listeners
  listenToComments(taleId);

  // 6. Post-resolve hooks
  document.getElementById('post-btn')?.addEventListener('click', () => postComment(taleId));

  initIcons();
});

/* ─────────────────────────────────────────────
   Static Init
   lucide icons are loaded via CDN window.lucide — initIcons wraps window.lucide.createIcons()
   No 'lucide' npm package import needed or permitted.
   ───────────────────────────────────────────── */

initIcons();
