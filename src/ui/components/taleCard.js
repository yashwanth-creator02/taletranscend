// src/ui/components/taleCard.js
// Shared tale card component used by the library page.
// Renders a grid of tale cards with progress, bookmarks, and read time overlays.

import { getTotalReadTime, getBookmarks, getTaleProgressData } from '@services/index.js';
import {
  getOverallProgress,
  formatMs,
  formatNumber,
  escapeHtml as escapeHtml,
  createLogger,
} from '@/utils';
import { DEFAULT_COVER_URL } from '@config/app.config.js';
import { renderEmptyState, renderErrorState, renderEmptySearchState } from './feedback.js';
import { renderBadge } from './badge.js';

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

function _metaItem(icon, label) {
  return `
    <div class="tale-card__meta flex items-center gap-1 sm:gap-2 text-muted group-hover:text-accent transition-colors">
      <i data-lucide="${icon}" class="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 opacity-60"></i>
      <span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] truncate">${escapeHtml(label)}</span>
    </div>
  `;
}

function _reactionItem(count) {
  const label = formatNumber(Number(count) || 0);
  const description = `${label} ${Number(count) === 1 ? 'heart' : 'hearts'}`;
  return `
    <div
      class="tale-card__meta tale-card__likes flex items-center gap-1 sm:gap-2 text-muted group-hover:text-accent transition-colors"
      title="${escapeHtml(description)}"
      aria-label="${escapeHtml(description)}"
    >
      <i data-lucide="heart" class="tale-card__likes-icon h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"></i>
      <span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] truncate">${label}</span>
    </div>
  `;
}

function _progressLabel(percent) {
  return `${Math.max(0, Math.min(100, Math.round(Number(percent) || 0)))}%`;
}

/* ─────────────────────────────────────────────
   Skeleton
   ───────────────────────────────────────────── */

export function renderCardsSkeleton(container, count = 8) {
  if (!container) return;
  container.innerHTML = `
    <div class="cards-grid-inner col-span-full grid gap-3.5 sm:gap-6 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-4">
      ${Array.from({ length: count })
        .map(
          () => `
        <div class="tale-card animate-pulse">
          <div class="tale-card__inner p-2.5 sm:p-4 flex flex-col">
            <div class="tale-card__top mb-2 sm:mb-3 flex items-center justify-between gap-1.5 sm:gap-2">
              <div class="h-4 sm:h-5 w-14 sm:w-20 rounded-sm bg-white/6"></div>
              <div class="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-white/5"></div>
            </div>
            <div class="tale-card__cover card-image-wrap mb-2.5 sm:mb-3.5 bg-white/6"></div>
            <div class="tale-card__body space-y-1.5 sm:space-y-2 flex-1">
              <div class="h-2.5 sm:h-3 w-1/3 rounded bg-white/5"></div>
              <div class="h-4 sm:h-5 w-3/4 rounded bg-white/6"></div>
              <div class="space-y-1 sm:space-y-1.5 mt-1.5 sm:mt-2">
                <div class="h-2.5 sm:h-3 w-full rounded bg-white/5"></div>
                <div class="hidden sm:block h-3 w-5/6 rounded bg-white/5"></div>
              </div>
            </div>
            <div class="tale-card__footer mt-3 sm:mt-4 flex items-center justify-between pt-2 sm:pt-3 border-t border-white/5">
              <div class="flex gap-2">
                <div class="h-3 w-10 sm:w-14 rounded bg-white/5"></div>
                <div class="h-3 w-5 sm:w-7 rounded bg-white/5"></div>
              </div>
              <div class="h-5 sm:h-6 w-12 sm:w-16 rounded-lg bg-white/5"></div>
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

export async function renderCardsGrid(userId, tales, { showSkeleton = false } = {}) {
  const container = document.getElementById('cards-grid');
  if (!container) return;

  const safeTales = Array.isArray(tales) ? tales : [];

  if (!safeTales.length) {
    const searchInput = document.getElementById('search-input');
    const query = searchInput?.value?.trim() || '';
    if (query) {
      renderEmptySearchState(container, {
        query,
        onClear: () => {
          if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
        onSelectSuggestion: (topic) => {
          if (searchInput) {
            searchInput.value = topic;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
      });
      return;
    }

    renderEmptyState(container, {
      message: 'No tales found in the archives.',
      subMessage: 'Try a different filter or come back later.',
      classes:
        'col-span-full rounded-[2rem] border border-white/8 bg-white/5 px-6 py-20 text-center shadow-2xl shadow-black/20 backdrop-blur-xl',
    });
    return;
  }

  if (showSkeleton) {
    renderCardsSkeleton(container, Math.min(8, safeTales.length));
  }

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
    reactionCount = 0,
  } = tale || {};

  const cleanTitle = (function () {
    if (!title || typeof title !== 'string') return 'Untitled Echo';
    const trimmed = title.trim();
    if (
      !trimmed ||
      trimmed === id ||
      trimmed === 'Untitled Tale' ||
      /^[a-zA-Z0-9_-]{20,}$/.test(trimmed)
    ) {
      return 'Untitled Echo';
    }
    return trimmed;
  })();
  const safeTitle = escapeHtml(cleanTitle);
  const safeDescription = escapeHtml(description);
  const trimmedEra = typeof era === 'string' ? era.trim() : '';
  const safeEra = trimmedEra ? escapeHtml(trimmedEra) : '';
  const isBookmarked = !!bookmarkMap[id];
  const progress = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  const isFinished = tale?.status === 'finished' || progress >= 100;
  const totalMs = readTimeMap[id] || 0;
  const readTimeLabel = _formatReadTime(totalMs);
  const menuId = `menu-${id}`;
  const cover = coverUrl || _defaultCover();

  const timeBadge = readTimeLabel ? renderBadge(readTimeLabel, 'badge-subtle') : '';
  const statusBadgeClasses = isFinished
    ? 'badge-finished border-emerald-500/20'
    : 'badge-era border-indigo-500/20';
  const bookmarkedAction = isBookmarked ? 'decouple' : 'couple';
  const bookmarkedLabel = isBookmarked ? 'Remove from shelf' : 'Save to shelf';
  const bookmarkedIcon = isBookmarked ? 'bookmark-minus' : 'bookmark-plus';

  return `
    <article
      class="tale-card group relative flex flex-col justify-between"
      data-id="${escapeHtml(id)}"
      aria-label="${safeTitle}"
    >
      <div class="tale-card__inner p-2.5 sm:p-4 flex flex-col flex-1">
        <!-- Top Bar: Era Badges & Options Menu -->
        <div class="tale-card__top mb-2 sm:mb-3 flex items-center justify-between gap-1.5 sm:gap-2 relative z-20 min-h-6 sm:min-h-7">
          <div class="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
            ${safeEra ? renderBadge(safeEra, 'badge-era max-w-[85px] sm:max-w-none truncate') : ''}
            ${isFinished ? renderBadge('Finished', statusBadgeClasses) : ''}
          </div>

          <div class="tale-card__menu relative shrink-0">
            <button
              type="button"
              data-action="options"
              data-menu-id="${escapeHtml(menuId)}"
              class="tale-card__options flex items-center justify-center rounded-lg bg-surface-2 border border-line text-muted transition-all"
              aria-label="Options for ${safeTitle}"
              aria-haspopup="menu"
              aria-expanded="false"
              aria-controls="${escapeHtml(menuId)}"
            >
              <i data-lucide="more-vertical" class="h-4 w-4"></i>
            </button>

            <div
              id="${escapeHtml(menuId)}"
              class="options-menu hidden"
              role="menu"
              aria-label="Chronicle options for ${safeTitle}"
            >
              <div class="options-menu__header">
                <span class="options-menu__eyebrow">Chronicle options</span>
                <span class="options-menu__title">${safeTitle}</span>
              </div>

              <div class="options-menu__group">
                <button type="button" data-action="copy-link" data-id="${escapeHtml(id)}"
                  class="options-menu__item" role="menuitem">
                  <span class="options-menu__icon"><i data-lucide="link" class="h-3.5 w-3.5"></i></span>
                  <span class="options-menu__label">Copy tale link</span>
                </button>

                <button type="button" data-action="download" data-id="${escapeHtml(id)}"
                  class="options-menu__item" role="menuitem">
                  <span class="options-menu__icon"><i data-lucide="download" class="h-3.5 w-3.5"></i></span>
                  <span class="options-menu__label">Download chronicle</span>
                </button>
              </div>

              <div class="options-menu__divider"></div>

              <div class="options-menu__group">
                <button type="button"
                  class="options-menu__item ${isFinished ? 'is-disabled' : ''}"
                  data-action="${isFinished ? '' : 'mark-finished'}"
                  data-id="${escapeHtml(id)}"
                  role="menuitem"
                  ${isFinished ? 'disabled aria-disabled="true"' : ''}>
                  <span class="options-menu__icon"><i data-lucide="check-circle" class="h-3.5 w-3.5"></i></span>
                  <span class="options-menu__label">${isFinished ? 'Chronicle sealed' : 'Seal chronicle'}</span>
                </button>
              </div>

              <div class="options-menu__divider"></div>

              <div class="options-menu__group">
                <button type="button"
                  class="options-menu__item ${isBookmarked ? 'options-menu__item--danger' : 'options-menu__item--save'}"
                  data-action="${bookmarkedAction}"
                  data-id="${escapeHtml(id)}"
                  role="menuitem">
                  <span class="options-menu__icon"><i data-lucide="${bookmarkedIcon}" class="h-3.5 w-3.5"></i></span>
                  <span class="options-menu__label">${bookmarkedLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Dedicated Portrait Book Cover (3:4 ratio) -->
        <div class="tale-card__cover card-image-wrap mb-2.5 sm:mb-3.5">
          <img
            src="${escapeHtml(cover)}"
            alt="${safeTitle}"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onerror="this.onerror=null;this.src='${escapeHtml(_defaultCover())}'"
          />
          <div class="card-image-scrim"></div>

          <!-- Bottom of Cover: Progress Bar & Percentage (Only shown once reading has started) -->
          ${
            progress > 0
              ? `
          <div class="tale-card__progress absolute inset-x-0 bottom-0 p-2 sm:p-2.5 z-10">
            <div class="card-progress-meta">
              <span class="card-progress-label">Progress</span>
              <span class="card-progress-val text-accent-tint text-indigo-300">${_progressLabel(progress)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          `
              : ''
          }
        </div>

        <!-- Middle: Fragment Tag, Title, and Description -->
        <div class="tale-card__body flex-1 flex flex-col justify-start">
          <div class="tale-card__kicker flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <span class="h-px w-3 sm:w-4 bg-indigo-500/40"></span>
            <span class="text-[8px] sm:text-[9px] font-bold text-muted uppercase tracking-widest">Scroll #${id.slice(-4)}</span>
          </div>

          <h3 class="tale-card__title mb-1 sm:mb-1.5 line-clamp-1 text-xs sm:text-base font-bold font-cinzel text-ink group-hover:text-accent transition-colors">
            ${safeTitle}
          </h3>

          <p class="tale-card__desc line-clamp-1 sm:line-clamp-2 text-[10px] sm:text-xs leading-relaxed text-muted group-hover:text-ink-soft transition-colors mb-2 sm:mb-3">
            ${safeDescription}
          </p>
        </div>

        <!-- Footer: Metadata & Action -->
        <div class="tale-card__footer flex items-center justify-between pt-2 sm:pt-3 mt-auto border-t border-line gap-1.5">
          <div class="flex items-center gap-1.5 sm:gap-3 min-w-0">
            ${_metaItem('layers', `${chapterCount} ${Number(chapterCount) === 1 ? 'Chapter' : 'Chapters'}`)}
            ${_reactionItem(reactionCount)}
            <span class="tale-card__readtime hidden sm:inline-flex">${timeBadge}</span>
          </div>
          <button
            type="button"
            data-action="resume"
            data-id="${escapeHtml(id)}"
            class="card-button text-[8px] sm:text-[10px] px-2 py-1 sm:px-3 sm:py-1.5 shrink-0"
          >
            <span>${isFinished ? 'Completed' : 'Read'}</span>
            <i data-lucide="chevron-right" class="h-2.5 w-2.5 sm:h-3 sm:w-3"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}
