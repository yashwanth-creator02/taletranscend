// src/ui/components/taleCard.js
// Shared tale card component used by the library page.
// Renders a grid of tale cards with progress, bookmarks, and read time overlays.

import { getTotalReadTime, getBookmarks, getTaleProgressData } from '@services/index.js';
import { getOverallProgress, formatMs, escapeHtml as escapeHtml, createLogger } from '@/utils';
import { DEFAULT_COVER_URL } from '@config/app.config.js';
import { renderEmptyState, renderErrorState } from './feedback.js';

const log = createLogger('TaleCard');
import '@css/pages/tale-cards.css';

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _defaultCover() {
  return DEFAULT_COVER_URL;
}

function _formatReadTime(totalMs = 0) {
  return formatMs(Number(totalMs || 0));
}

function _badge(text, classes = '') {
  return `<span class="badge ${classes}">${escapeHtml(text)}</span>`;
}

function _metaItem(icon, label) {
  return `
    <div class="flex items-center gap-2 text-zinc-400 group-hover:text-indigo-300 transition-colors">
      <i data-lucide="${icon}" class="h-3.5 w-3.5 shrink-0 opacity-60"></i>
      <span class="text-[9px] font-bold uppercase tracking-[0.18em]">${escapeHtml(label)}</span>
    </div>
  `;
}

function _progressLabel(percent) {
  return `${Math.max(0, Math.min(100, Math.round(Number(percent) || 0)))}%`;
}

/* ─────────────────────────────────────────────
   Skeleton
   ───────────────────────────────────────────── */

export function renderCardsSkeleton(container, count = 6) {
  if (!container) return;
  container.innerHTML = `
    <div class="col-span-full grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      ${Array.from({ length: count })
        .map(
          () => `
        <div class="tale-card animate-pulse">
          <div class="p-3.5 sm:p-4 flex flex-col">
            <div class="mb-3 flex items-center justify-between gap-2">
              <div class="h-5 w-20 rounded-full bg-white/6"></div>
              <div class="h-7 w-7 rounded-lg bg-white/5"></div>
            </div>
            <div class="card-image-wrap mb-3.5 bg-white/6"></div>
            <div class="space-y-2 flex-1">
              <div class="h-3 w-1/3 rounded bg-white/5"></div>
              <div class="h-5 w-3/4 rounded bg-white/6"></div>
              <div class="space-y-1.5 mt-2">
                <div class="h-3 w-full rounded bg-white/5"></div>
                <div class="h-3 w-5/6 rounded bg-white/5"></div>
              </div>
            </div>
            <div class="mt-4 flex items-center justify-between pt-3 border-t border-white/5">
              <div class="flex gap-2">
                <div class="h-3 w-14 rounded bg-white/5"></div>
                <div class="h-3 w-12 rounded bg-white/5"></div>
              </div>
              <div class="h-6 w-16 rounded-lg bg-white/5"></div>
            </div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Metadata Prefetch
   ───────────────────────────────────────────── */

/**
 * Fetches progress, bookmarks, and read times for a list of tales in parallel.
 *
 * Bug fix: bookmark lookup was using bookmark.id (Firestore doc string) instead
 * of bookmark.taleId. Bookmarks are keyed by taleId — that is the correct field.
 *
 * @param {string|null} userId
 * @param {import('@state/schemas/tale.schema.js').Tale[]} tales
 * @returns {Promise<{ progressSnapshots: Object[], bookmarkMap: Object, readTimeMap: Object }>}
 */
export async function fetchTalesMetadata(userId, tales) {
  const safeUserId = userId || null;
  const safeTales = Array.isArray(tales) ? tales : [];

  if (!safeTales.length) {
    return { progressSnapshots: [], bookmarkMap: {}, readTimeMap: {} };
  }

  const [progressSnapshots, bookmarks, readTimeEntries] = await Promise.all([
    safeUserId
      ? Promise.all(safeTales.map((t) => getTaleProgressData(safeUserId, t.id)))
      : Promise.resolve(safeTales.map(() => ({}))),

    safeUserId ? getBookmarks({ userId: safeUserId }) : Promise.resolve([]),

    safeUserId
      ? Promise.all(
          safeTales.map(async (t) => {
            const ms = await getTotalReadTime({ userId: safeUserId, taleId: t.id });
            return [t.id, ms];
          })
        )
      : Promise.resolve([]),
  ]);

  // Bug fix: was [bookmark.id, true] — bookmark.id is the Firestore auto-ID,
  // not the taleId. Fixed to bookmark.taleId which is the canonical identifier.
  const bookmarkMap = Object.fromEntries((bookmarks || []).map((b) => [b.taleId, true]));
  const readTimeMap = Object.fromEntries(readTimeEntries || []);

  return { progressSnapshots, bookmarkMap, readTimeMap };
}

/* ─────────────────────────────────────────────
   Grid Renderers
   ───────────────────────────────────────────── */

export function renderTaleCards(container, tales, metadata) {
  if (!container) return;
  const { progressSnapshots = [], bookmarkMap = {}, readTimeMap = {} } = metadata;

  container.innerHTML = tales
    .map((tale, index) => {
      const chaptersProgress = progressSnapshots[index] || {};
      const progressStats = getOverallProgress({
        chapterCount: Number(tale.chapterCount) || 0,
        chaptersProgress,
      });
      const displayPercent = tale.status === 'finished' ? 100 : progressStats.percent || 0;
      return _createTaleCard(tale, displayPercent, readTimeMap, bookmarkMap);
    })
    .join('');

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Appends additional tale cards to the grid without wiping existing ones.
 * Used by the library "Load More" flow.
 *
 * @param {string} userId
 * @param {import('@state/schemas/tale.schema.js').Tale[]} tales
 */
export async function appendTaleCards(userId, tales) {
  const container = document.getElementById('cards-grid');
  if (!container || !tales.length) return;

  // Remove empty-state placeholder if present
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const metadata = await fetchTalesMetadata(userId, tales);

  const html = tales
    .map((tale, index) => {
      const chaptersProgress = metadata.progressSnapshots[index] || {};
      const progressStats = getOverallProgress({
        chapterCount: Number(tale.chapterCount) || 0,
        chaptersProgress,
      });
      const displayPercent = tale.status === 'finished' ? 100 : progressStats.percent || 0;
      return _createTaleCard(tale, displayPercent, metadata.readTimeMap, metadata.bookmarkMap);
    })
    .join('');

  // Append instead of replace
  const temp = document.createElement('div');
  temp.innerHTML = html;
  while (temp.firstChild) {
    container.appendChild(temp.firstChild);
  }

  if (window.lucide) window.lucide.createIcons();
}

export async function renderCardsGrid(userId, tales) {
  const container = document.getElementById('cards-grid');
  if (!container) return;

  const safeTales = Array.isArray(tales) ? tales : [];

  if (!safeTales.length) {
    renderEmptyState(container, {
      message: 'No tales found in the archives.',
      subMessage: 'Try a different filter or come back later.',
      classes:
        'col-span-full rounded-[2rem] border border-white/8 bg-white/5 px-6 py-20 text-center shadow-2xl shadow-black/20 backdrop-blur-xl',
    });
    return;
  }

  renderCardsSkeleton(container, Math.min(6, safeTales.length));

  try {
    const metadata = await fetchTalesMetadata(userId, safeTales);
    renderTaleCards(container, safeTales, metadata);
  } catch (err) {
    log.error('renderCardsGrid failed', err);
    renderErrorState(container, {
      message: 'We could not load the tales right now.',
      subMessage: 'Please refresh and try again.',
    });
  }
}

/* ─────────────────────────────────────────────
   Card Template
   ───────────────────────────────────────────── */

function _createTaleCard(tale, progressPercent, readTimeMap = {}, bookmarkMap = {}) {
  const {
    id = '0000',
    title = 'Untitled Echo',
    coverUrl,
    description = 'No description provided.',
    era = 'Unknown Era',
    chapterCount = 0,
  } = tale || {};

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const trimmedEra = typeof era === 'string' ? era.trim() : '';
  const safeEra = trimmedEra ? escapeHtml(trimmedEra) : '';
  const isBookmarked = !!bookmarkMap[id];
  const isFinished = tale?.status === 'finished';
  const totalMs = readTimeMap[id] || 0;
  const readTimeLabel = _formatReadTime(totalMs);
  const menuId = `menu-${id}`;
  const progress = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  const cover = coverUrl || _defaultCover();

  const timeBadge = readTimeLabel ? _badge(readTimeLabel, 'bg-white/5 text-zinc-400') : '';
  const statusBadgeClasses = isFinished
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  const bookmarkedAction = isBookmarked ? 'decouple' : 'couple';
  const bookmarkedLabel = isBookmarked ? 'Remove Bookmark' : 'Save to Shelf';
  const bookmarkedIcon = isBookmarked ? 'bookmark-minus' : 'bookmark-plus';

  return `
    <article
      class="tale-card group relative flex flex-col justify-between"
      data-id="${escapeHtml(id)}"
      aria-label="${safeTitle}"
    >
      <div class="p-3.5 sm:p-4 flex flex-col flex-1">
        <!-- Top Bar: Era Badges & Options Menu -->
        <div class="mb-3 flex items-center justify-between gap-2 relative z-20 min-h-7">
          <div class="flex items-center gap-1.5 flex-wrap min-w-0">
            ${safeEra ? _badge(safeEra, 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20') : ''}
            ${isFinished ? _badge('Finished', statusBadgeClasses) : ''}
          </div>

          <div class="relative shrink-0">
            <button
              type="button"
              data-action="options"
              data-menu-id="${escapeHtml(menuId)}"
              class="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-400 transition-all hover:bg-white/10 hover:text-white"
              aria-label="Archive Operations"
            >
              <i data-lucide="more-horizontal" class="h-3.5 w-3.5"></i>
            </button>

            <div
              id="${escapeHtml(menuId)}"
              class="options-menu hidden absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-xl p-1.5 shadow-2xl"
              role="menu"
            >
              <div class="px-2.5 py-1.5 border-b border-white/5 mb-1">
                <span class="text-[8px] font-black uppercase tracking-widest text-zinc-500">Archive Operations</span>
              </div>

              <button type="button" data-action="copy-link" data-id="${escapeHtml(id)}"
                class="menu-btn flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-white/10 hover:text-white">
                <i data-lucide="link" class="h-3.5 w-3.5"></i>
                <span>Copy Access Link</span>
              </button>

              <button type="button" data-action="save-offline" data-id="${escapeHtml(id)}"
                class="menu-btn flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-white/10 hover:text-white">
                <i data-lucide="download" class="h-3.5 w-3.5"></i>
                <span>Neural Download</span>
              </button>

              <div class="h-px bg-white/5 my-1"></div>

              <button type="button"
                class="menu-btn flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider transition-colors ${isFinished ? 'opacity-40 text-zinc-600' : 'text-zinc-300 hover:bg-white/10 hover:text-white'}"
                data-action="${isFinished ? '' : 'mark-finished'}" data-id="${escapeHtml(id)}">
                <i data-lucide="check-circle" class="h-3.5 w-3.5"></i>
                <span>${isFinished ? 'Already Sealed' : 'Seal Chronicle'}</span>
              </button>

              <div class="h-px bg-white/5 my-1"></div>

              <button type="button"
                class="menu-btn flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-wider transition-colors ${isBookmarked ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}"
                data-action="${bookmarkedAction}" data-id="${escapeHtml(id)}">
                <i data-lucide="${bookmarkedIcon}" class="h-3.5 w-3.5"></i>
                <span>${bookmarkedLabel}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Dedicated Portrait Book Cover (3:4 ratio) -->
        <div class="card-image-wrap mb-3.5">
          <img
            src="${escapeHtml(cover)}"
            alt="${safeTitle}"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onerror="this.onerror=null;this.src='${escapeHtml(_defaultCover())}'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none"></div>

          <!-- Bottom of Cover: Progress Bar & Percentage -->
          <div class="absolute inset-x-0 bottom-0 p-2.5 z-10">
            <div class="flex items-center justify-between mb-1 text-[8px] font-black uppercase tracking-wider">
              <span class="text-zinc-400">Progress</span>
              <span class="text-indigo-300">${_progressLabel(progress)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
        </div>

        <!-- Middle: Fragment Tag, Title, and Description -->
        <div class="flex-1 flex flex-col justify-start">
          <div class="flex items-center gap-2 mb-1">
            <span class="h-px w-4 bg-indigo-500/40"></span>
            <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Fragment #${id.slice(-4)}</span>
          </div>

          <h3 class="mb-1.5 line-clamp-1 text-base font-bold font-cinzel text-white group-hover:text-indigo-300 transition-colors">
            ${safeTitle}
          </h3>

          <p class="line-clamp-2 text-xs leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors mb-3">
            ${safeDescription}
          </p>
        </div>

        <!-- Footer: Metadata & Action -->
        <div class="flex items-center justify-between pt-3 mt-auto border-t border-white/5">
          <div class="flex items-center gap-3">
            ${_metaItem('layers', `${chapterCount} Frags`)}
            ${timeBadge}
          </div>
          <button
            type="button"
            data-action="resume"
            data-id="${escapeHtml(id)}"
            class="card-button"
          >
            <span>${isFinished ? 'Archive' : 'Engage'}</span>
            <i data-lucide="chevron-right" class="h-3 w-3"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}
