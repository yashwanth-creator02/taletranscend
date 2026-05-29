// src/ui/components/taleCard.js
// Shared tale card component used by the library page.
// Renders a grid of tale cards with progress, bookmarks, and read time overlays.

import { getTotalReadTime, getBookmarks, getTaleProgressData } from '@services/index.js';
import { getOverallProgress } from '@/utils/progress.utils';
import { escapeHtml } from '@/utils/string.utils';
import { renderEmptyState, renderErrorState } from './feedback.js';
import '@css/pages/tale-cards.css';

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _defaultCover() {
  return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';
}

function _formatReadTime(totalMs = 0) {
  const minutes = Math.floor(Number(totalMs || 0) / 60000);
  return minutes < 1 ? '' : `${minutes}m read`;
}

function _statusLabel(status) {
  if (status === 'finished')  return 'Completed';
  if (status === 'draft')     return 'Draft';
  if (status === 'published') return 'Live';
  return 'In Progress';
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
    <div class="col-span-full grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      ${Array.from({ length: count }).map(() => `
        <div class="tale-card animate-pulse">
          <div class="p-6">
            <div class="mb-6 flex items-start justify-between gap-3">
              <div class="space-y-2">
                <div class="h-4 w-20 rounded-full bg-white/6"></div>
                <div class="h-3 w-28 rounded-full bg-white/5"></div>
              </div>
              <div class="h-9 w-9 rounded-full bg-white/5"></div>
            </div>
            <div class="mb-5 h-56 rounded-[1.7rem] bg-white/6"></div>
            <div class="space-y-3">
              <div class="h-5 w-3/4 rounded-full bg-white/6"></div>
              <div class="h-4 w-full rounded-full bg-white/5"></div>
              <div class="h-4 w-5/6 rounded-full bg-white/5"></div>
              <div class="mt-4 flex gap-4">
                <div class="h-4 w-24 rounded-full bg-white/5"></div>
                <div class="h-4 w-20 rounded-full bg-white/5"></div>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
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
  const safeTales  = Array.isArray(tales) ? tales : [];

  if (!safeTales.length) {
    return { progressSnapshots: [], bookmarkMap: {}, readTimeMap: {} };
  }

  const [progressSnapshots, bookmarks, readTimeEntries] = await Promise.all([
    safeUserId
      ? Promise.all(safeTales.map((t) => getTaleProgressData(safeUserId, t.id)))
      : Promise.resolve(safeTales.map(() => ({}))),

    safeUserId
      ? getBookmarks({ userId: safeUserId })
      : Promise.resolve([]),

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
  const bookmarkMap = Object.fromEntries(
    (bookmarks || []).map((b) => [b.taleId, true])
  );
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
      const progressStats    = getOverallProgress({
        chapterCount: Number(tale.chapterCount) || 0,
        chaptersProgress,
      });
      const displayPercent = tale.status === 'finished' ? 100 : progressStats.percent || 0;
      return _createTaleCard(tale, displayPercent, readTimeMap, bookmarkMap);
    })
    .join('');

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
      classes: 'col-span-full rounded-[2rem] border border-white/8 bg-white/5 px-6 py-20 text-center shadow-2xl shadow-black/20 backdrop-blur-xl',
    });
    return;
  }

  renderCardsSkeleton(container, Math.min(6, safeTales.length));

  try {
    const metadata = await fetchTalesMetadata(userId, safeTales);
    renderTaleCards(container, safeTales, metadata);
  } catch (err) {
    console.error('[taleCard] renderCardsGrid failed:', err);
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
    id           = '0000',
    title        = 'Untitled Echo',
    coverUrl,
    description  = 'No description provided.',
    era          = 'Unknown Era',
    chapterCount = 0,
  } = tale || {};

  const safeTitle       = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeEra         = escapeHtml(era);
  const isBookmarked    = !!bookmarkMap[id];
  const isFinished      = tale?.status === 'finished';
  const totalMs         = readTimeMap[id] || 0;
  const readTimeLabel   = _formatReadTime(totalMs);
  const menuId          = `menu-${id}`;
  const progress        = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  const cover           = coverUrl || _defaultCover();

  const timeBadge          = readTimeLabel ? _badge(readTimeLabel, 'bg-white/5 text-zinc-400') : '';
  const statusBadgeClasses = isFinished
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  const bookmarkedAction   = isBookmarked ? 'decouple' : 'couple';
  const bookmarkedLabel    = isBookmarked ? 'Remove Bookmark' : 'Save to Shelf';
  const bookmarkedIcon     = isBookmarked ? 'bookmark-minus' : 'bookmark-plus';

  return `
    <article
      class="tale-card group relative overflow-hidden"
      data-id="${escapeHtml(id)}"
      aria-label="${safeTitle}"
    >
      <div class="absolute -inset-px bg-gradient-to-b from-indigo-500/0 via-indigo-500/0 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div class="p-6">
        <!-- Header: Badges & Actions -->
        <div class="mb-6 flex items-start justify-between gap-3 relative z-10">
          <div class="flex flex-wrap items-center gap-2">
            ${_badge(safeEra, 'bg-indigo-500/5 text-indigo-300')}
            ${isFinished ? _badge('Finished', statusBadgeClasses) : ''}
          </div>

          <div class="relative shrink-0">
            <button
              type="button"
              data-action="options"
              data-menu-id="${escapeHtml(menuId)}"
              class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-500 transition-all hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-white"
            >
              <i data-lucide="more-horizontal" class="h-4 w-4"></i>
            </button>

            <div
              id="${escapeHtml(menuId)}"
              class="options-menu hidden absolute right-0 z-[60] mt-2 w-60 overflow-hidden rounded-2xl p-2"
              role="menu"
            >
              <div class="px-3 py-2 border-b border-white/5 mb-1">
                <span class="text-[8px] font-black uppercase tracking-widest text-zinc-600">Archive Operations</span>
              </div>

              <button type="button" data-action="copy-link" data-id="${escapeHtml(id)}"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
                <i data-lucide="link" class="h-3.5 w-3.5"></i>
                <span>Copy Access Link</span>
              </button>

              <button type="button"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
                <i data-lucide="download" class="h-3.5 w-3.5"></i>
                <span>Neural Download</span>
              </button>

              <div class="h-px bg-white/5 my-1"></div>

              <button type="button"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${isFinished ? 'opacity-40 text-zinc-600' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}"
                data-action="${isFinished ? '' : 'mark-finished'}" data-id="${escapeHtml(id)}">
                <i data-lucide="check-circle" class="h-3.5 w-3.5"></i>
                <span>${isFinished ? 'Already Sealed' : 'Seal Chronicle'}</span>
              </button>

              <div class="h-px bg-white/5 my-1"></div>

              <button type="button"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${isBookmarked ? 'text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}"
                data-action="${bookmarkedAction}" data-id="${escapeHtml(id)}">
                <i data-lucide="${bookmarkedIcon}" class="h-3.5 w-3.5"></i>
                <span>${bookmarkedLabel}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Cover Image with Progress Overlay -->
        <div class="card-image-wrap mb-6 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500">
          <div class="aspect-[16/10] w-full relative">
            <img
              src="${escapeHtml(cover)}"
              alt="${safeTitle}"
              class="h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-110 group-hover:opacity-100"
              loading="lazy"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60"></div>
            <div class="absolute inset-x-0 bottom-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/50">Neural Progress</span>
                <span class="text-[10px] font-black text-indigo-400">${_progressLabel(progress)}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="relative z-10 px-1">
          <div class="flex items-center gap-3 mb-3">
            <span class="h-px w-8 bg-indigo-500/30"></span>
            <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fragment ${id.slice(-4)}</span>
          </div>

          <h3 class="mb-3 line-clamp-1 text-2xl font-black tracking-tight text-white group-hover:text-indigo-300 transition-colors duration-300">
            ${safeTitle}
          </h3>

          <p class="mb-6 line-clamp-2 text-sm leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300">
            ${safeDescription}
          </p>

          <!-- Footer Metadata -->
          <div class="flex items-center justify-between pt-5 border-t border-white/5">
            <div class="flex items-center gap-5">
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
              <i data-lucide="chevron-right" class="h-3.5 w-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}
