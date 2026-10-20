// src/pages/tale/tale.js
import { initPageReveal, readyReveal, setupAuthTimeout, createLogger } from '@/utils';
// Tale Archive page entry point.
// Orchestrates data hydration and all user interactions.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/tale.css';

import {
  initAuth,
  loadTale,
  loadChapters,
  renderTale,
  renderChapters,
  showArchiveSkeletons,
  renderTaleNotFound,
  bindChapterClicks,
  setupTabs,
  setupStartReading,
  setupResumeReading,
  setupShelfButton,
  setupShareButton,
  setupResonance,
  initHeaderScroll,
  setupChronicleBatchActions,
  setupInquire,
  setupReportMissingTale,
  listenToComments,
  postComment,
  initIcons,
} from './index.js';
import {
  addToBookmarks,
  removeFromBookmarks,
  isBookmarked,
  getResonanceStatus,
} from '@services/index.js';
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

  // 0. Skeleton loaders & icons
  showArchiveSkeletons();

  const user = authUser;
  const userId = user?.uid || appState.userId || 'anonymous';

  // 1. Data hydration
  let tale = null;
  let chapters = [];
  let isResonated = false;
  // Preloaded with the rest of the page data so the cover's shelf shortcut can
  // render before the first reveal instead of popping in afterwards.
  let isShelved = false;

  try {
    const results = await Promise.all([
      loadTale(currentTaleId, user),
      loadChapters(currentTaleId).catch(() => []),
      getResonanceStatus(currentTaleId, userId).catch(() => false),
      isBookmarked({ userId, taleId: currentTaleId }).catch(() => false),
    ]);
    tale = results[0];
    chapters = results[1] || [];
    isResonated = Boolean(results[2]);
    isShelved = Boolean(results[3]);
  } catch (err) {
    log.error('Hydration failed', err);
  }

  if (!tale) {
    log.error('Tale not found', { taleId: currentTaleId });
    renderTaleNotFound(currentTaleId);
    setupReportMissingTale(currentTaleId);
    readyReveal();
    return;
  }

  // 2. Primary UI
  await renderTale(userId, tale, currentTaleId, isResonated);
  renderChapters(userId, chapters, currentTaleId);
  readyReveal();

  // 3. Interactions
  bindChapterClicks(currentTaleId, chapters, userId, tale);
  setupChronicleBatchActions(userId, currentTaleId, chapters, tale);
  setupStartReading(currentTaleId, chapters);
  setupResumeReading(userId, currentTaleId);
  setupResonance(currentTaleId, tale?.reactionCount ?? 0, isResonated, userId);
  setupTabs();
  setupInquire(currentTaleId, tale, userId);
  initHeaderScroll();

  // 4. Shelf and share buttons
  await setupShelfButton(
    userId,
    currentTaleId,
    tale,
    {
      addToBookmarks,
      removeFromBookmarks,
      isBookmarked,
    },
    isShelved
  );
  setupShareButton(currentTaleId);

  // 5. Real-time listeners
  listenToComments(currentTaleId, tale?.authorId || null);

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
