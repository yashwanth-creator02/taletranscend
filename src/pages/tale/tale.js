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
import { cacheService } from '@services/cache.service.js';
import { appState } from '@state/index.js';

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
   Bootstrap & Lifecycle
   ───────────────────────────────────────────── */

const authTimeout = setupAuthTimeout('post-btn', 'Archive connection timed out. Please try again.');

export async function initTalePage(authUser = null) {
  const pathMatch = window.location.pathname.match(/\/tales\/([^/]+)/);
  const currentTaleId =
    (pathMatch && decodeURIComponent(pathMatch[1])) ||
    new URLSearchParams(window.location.search).get('id') ||
    taleId;

  if (!currentTaleId) {
    location.replace('/library.html');
    return;
  }

  // 0. Skeleton loaders & icons (only on first session visit)
  const isFirst =
    typeof window !== 'undefined' ? cacheService.isFirstVisit(window.location.href) : true;
  if (isFirst) {
    showArchiveSkeletons();
  }

  const user = authUser;
  const userId = user?.uid || appState.userId || 'anonymous';

  // 1. Data hydration
  const [tale, chapters] = await Promise.all([
    loadTale(currentTaleId, user),
    loadChapters(currentTaleId),
  ]);

  if (!tale) {
    log.error('Tale not found', { taleId: currentTaleId });
    return;
  }

  // 2. Primary UI
  await renderTale(userId, tale, currentTaleId);
  renderChapters(userId, chapters, currentTaleId);
  readyReveal();

  // 3. Interactions
  bindChapterClicks(currentTaleId, chapters, userId, tale);
  setupChronicleBatchActions(userId, currentTaleId, chapters, tale);
  setupStartReading(currentTaleId, chapters);
  setupResumeReading(userId, currentTaleId);
  setupResonance(currentTaleId);
  setupTabs();
  initHeaderScroll();

  // 4. Shelf and share buttons
  await setupShelfButton(userId, currentTaleId, tale, {
    addToBookmarks,
    removeFromBookmarks,
    isBookmarked,
  });
  setupShareButton(currentTaleId);

  // 5. Real-time listeners
  listenToComments(currentTaleId);

  // 6. Post-resolve hooks
  document.getElementById('post-btn')?.addEventListener('click', () => postComment(currentTaleId));

  initIcons();
}

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const userId = user.uid;
  appState.userId = userId;
  log.info('Auth resolved', { userId });
  await initTalePage(user);
});

initIcons();
