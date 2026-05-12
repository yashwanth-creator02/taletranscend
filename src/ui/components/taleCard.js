// src/ui/components/taleCard.js
// Renders the tale cards grid and individual tale card templates.
// Used by the library and shelf pages to display community tales.

import { getTotalReadTime, getBookmarks, getTaleProgressData } from '@services/index.js';
import { getOverallProgress } from '@/utils/progress.utils';

/* ================= Helpers ================= */

/**
 * Escapes a string for safe HTML insertion.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Returns the default cover image when a tale has no custom cover.
 *
 * @returns {string}
 */
function getDefaultCover() {
  return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';
}

/**
 * Formats read time in minutes.
 *
 * @param {number} totalMs
 * @returns {string}
 */
function formatReadTime(totalMs = 0) {
  const minutes = Math.floor(Number(totalMs || 0) / 60000);
  if (minutes < 1) return '';
  return `${minutes}m read`;
}

/**
 * Returns a short status label for a tale.
 *
 * @param {string} status
 * @returns {string}
 */
function getStatusLabel(status) {
  if (status === 'finished') return 'Completed';
  if (status === 'draft') return 'Draft';
  if (status === 'published') return 'Live';
  return 'In Progress';
}

/**
 * Creates a small pill badge.
 *
 * @param {string} text
 * @param {string} classes
 * @returns {string}
 */
function buildBadge(text, classes = '') {
  return `
    <span class="inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] ${classes}">
      ${escapeHtml(text)}
    </span>
  `;
}

/**
 * Creates a metadata row item.
 *
 * @param {string} icon
 * @param {string} label
 * @returns {string}
 */
function buildMetaItem(icon, label) {
  return `
    <div class="flex items-center gap-2 text-zinc-500">
      <i data-lucide="${icon}" class="h-3.5 w-3.5 shrink-0"></i>
      <span class="text-[9px] font-bold uppercase tracking-[0.22em]">
        ${escapeHtml(label)}
      </span>
    </div>
  `;
}

/**
 * Returns a progress label with fallback.
 *
 * @param {number} percent
 * @returns {string}
 */
function getProgressLabel(percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  return `${clamped}%`;
}

/* ================= Grid Renderer ================= */

/**
 * Renders a grid of tale cards into the #cards-grid container.
 * Fetches progress, bookmarks, and read times in parallel for performance.
 *
 * @param {string} userId - ID of the authenticated user
 * @param {Array<Object>} tales - Array of tale objects from Firestore
 */
export async function renderCardsGrid(userId, tales) {
  const container = document.getElementById('cards-grid');
  if (!container) return;

  const safeTales = Array.isArray(tales) ? tales : [];

  if (!safeTales.length) {
    container.innerHTML = `
      <div class="col-span-full rounded-[2rem] border border-white/8 bg-white/5 px-6 py-20 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          <i data-lucide="sparkles" class="h-6 w-6 text-zinc-500"></i>
        </div>
        <p class="text-sm font-medium text-zinc-400">No tales found in the archives.</p>
        <p class="mt-2 text-xs text-zinc-600">Try a different filter or come back later.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Show a lightweight loading state before async data resolves.
  container.innerHTML = `
    <div class="col-span-full grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      ${Array.from({ length: Math.min(6, safeTales.length) })
        .map(
          () => `
            <div class="overflow-hidden rounded-[2.25rem] border border-white/8 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div class="animate-pulse">
                <div class="mb-4 flex items-start justify-between">
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
          `
        )
        .join('')}
    </div>
  `;

  try {
    const safeUserId = userId || null;

    const [progressSnapshots, bookmarks, readTimeEntries] = await Promise.all([
      safeUserId
        ? Promise.all(safeTales.map((tale) => getTaleProgressData(safeUserId, tale.id)))
        : Promise.resolve(safeTales.map(() => ({}))),
      safeUserId ? getBookmarks({ userId: safeUserId }) : Promise.resolve([]),
      safeUserId
        ? Promise.all(
            safeTales.map(async (tale) => {
              const ms = await getTotalReadTime({ userId: safeUserId, taleId: tale.id });
              return [tale.id, ms];
            })
          )
        : Promise.resolve([]),
    ]);

    const bookmarkMap = Object.fromEntries(
      (bookmarks || []).map((bookmark) => [bookmark.id, true])
    );
    const readTimeMap = Object.fromEntries(readTimeEntries || []);

    container.innerHTML = safeTales
      .map((tale, index) => {
        const chaptersProgress = progressSnapshots[index] || {};

        const progressStats = getOverallProgress({
          chapterCount: Number(tale.chapterCount) || 0,
          chaptersProgress,
        });

        const displayPercent = tale.status === 'finished' ? 100 : progressStats.percent || 0;

        return createTaleCard(tale, displayPercent, readTimeMap, bookmarkMap);
      })
      .join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (err) {
    console.error('renderCardsGrid: failed to populate library:', err);
    container.innerHTML = `
      <div class="col-span-full rounded-[2rem] border border-red-500/10 bg-red-500/5 px-6 py-16 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <i data-lucide="triangle-alert" class="h-6 w-6 text-red-400"></i>
        </div>
        <p class="text-sm font-medium text-red-200">We could not load the tales right now.</p>
        <p class="mt-2 text-xs text-red-300/70">Please refresh and try again.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

/* ================= Card Template ================= */

/**
 * Builds the HTML string for a single tale card.
 *
 * @param {Object} tale - Tale data object from Firestore
 * @param {number} progressPercent - Pre-calculated overall progress percentage
 * @param {Object} readTimeMap - Map of taleId => totalReadTimeMs
 * @param {Object} bookmarkMap - Map of taleId => true for bookmarked tales
 * @returns {string} HTML string for the tale card
 */
function createTaleCard(tale, progressPercent, readTimeMap = {}, bookmarkMap = {}) {
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
  const safeEra = escapeHtml(era);
  const isBookmarked = !!bookmarkMap[id];
  const isFinished = tale?.status === 'finished';
  const totalMs = readTimeMap[id] || 0;
  const readTimeLabel = formatReadTime(totalMs);
  const menuId = `menu-${id}`;
  const progress = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  const cover = coverUrl || getDefaultCover();
  const statusLabel = getStatusLabel(tale?.status);

  const timeBadge = readTimeLabel
    ? buildBadge(readTimeLabel, 'bg-zinc-900/80 text-zinc-300 border border-white/8')
    : '';

  const statusBadgeClasses = isFinished
    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15'
    : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/15';

  const bookmarkedAction = isBookmarked ? 'decouple' : 'couple';
  const bookmarkedLabel = isBookmarked ? 'Remove Bookmark' : 'Save to Shelf';
  const bookmarkedIcon = isBookmarked ? 'bookmark-minus' : 'bookmark-plus';

  return `
    <article
      class="tale-card group relative overflow-hidden rounded-[2.25rem] border border-white/8 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/20 hover:bg-white/[0.055]"
      data-id="${escapeHtml(id)}"
      aria-label="${safeTitle}"
    >
      <div class="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

      <div class="p-5">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              ${buildBadge(safeEra, 'border border-indigo-500/15 bg-indigo-500/10 text-indigo-300')}
              ${buildBadge(statusLabel, statusBadgeClasses)}
            </div>
            <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              Tale Archive
            </p>
          </div>

          <div class="relative shrink-0">
            <button
              type="button"
              data-action="options"
              data-menu-id="${escapeHtml(menuId)}"
              aria-label="Open tale actions"
              aria-haspopup="menu"
              aria-expanded="false"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-black/20 text-zinc-500 transition-all hover:border-white/12 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <i data-lucide="more-vertical" class="h-4 w-4"></i>
            </button>

            <div
              id="${escapeHtml(menuId)}"
              class="options-menu hidden absolute right-0 z-[60] mt-2 w-56 overflow-hidden rounded-[1.25rem] border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl"
              role="menu"
              aria-label="Tale quick actions"
            >
              <div class="px-3 py-2">
                <span class="text-[7px] font-black uppercase tracking-[0.32em] text-zinc-600">Quick Actions</span>
              </div>

              <button
                type="button"
                data-action="copy-link"
                data-id="${escapeHtml(id)}"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <i data-lucide="link" class="h-3.5 w-3.5"></i>
                Copy Link
              </button>

              <button
                type="button"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <i data-lucide="download" class="h-3.5 w-3.5"></i>
                Enable Offline Read
              </button>

              <div class="my-2 h-px bg-white/5"></div>

              <div class="px-3 py-2">
                <span class="text-[7px] font-black uppercase tracking-[0.32em] text-zinc-600">Management</span>
              </div>

              <button
                type="button"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${isFinished ? 'cursor-not-allowed text-zinc-600' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}"
                ${isFinished ? 'disabled' : ''}
                data-action="${isFinished ? '' : 'mark-finished'}"
                data-id="${escapeHtml(id)}"
              >
                <i data-lucide="check-circle" class="h-3.5 w-3.5"></i>
                ${isFinished ? 'Finished' : 'Mark Finished'}
              </button>

              <button
                type="button"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-orange-300/80 transition-colors hover:bg-orange-500/10 hover:text-orange-200"
              >
                <i data-lucide="triangle-alert" class="h-3.5 w-3.5"></i>
                Report
              </button>

              <div class="my-2 h-px bg-white/5"></div>

              <button
                type="button"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${isBookmarked ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200' : 'text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200'}"
                data-action="${bookmarkedAction}"
                data-id="${escapeHtml(id)}"
              >
                <i data-lucide="${bookmarkedIcon}" class="h-3.5 w-3.5"></i>
                ${bookmarkedLabel}
              </button>
            </div>
          </div>
        </div>

        <div class="relative mb-5 overflow-hidden rounded-[1.75rem] border border-white/8 bg-zinc-900">
          <div class="aspect-[16/10] w-full overflow-hidden">
            <img
              src="${escapeHtml(cover)}"
              alt="${safeTitle} cover"
              class="h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-100"
              loading="lazy"
            />
          </div>

          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4">
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="text-[8px] font-bold uppercase tracking-[0.28em] text-zinc-400">
                Reading Progress
              </span>
              <span class="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300">
                ${getProgressLabel(progress)}
              </span>
            </div>

            <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                style="width:${Math.max(2, progress)}%"
              ></div>
            </div>
          </div>
        </div>

        <div class="px-1">
          <h3 class="mb-2 line-clamp-2 text-xl font-semibold tracking-tight text-white transition-colors group-hover:text-indigo-300">
            ${safeTitle}
          </h3>

          <p class="mb-4 line-clamp-3 text-sm leading-6 text-zinc-400">
            ${safeDescription}
          </p>

          <div class="grid grid-cols-2 gap-3 border-t border-white/6 pt-4">
            ${buildMetaItem('layers', `${chapterCount} fragments`)}
            ${timeBadge}
          </div>

          <div class="mt-5 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              ${
                isFinished
                  ? buildBadge(
                      'Complete',
                      'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15'
                    )
                  : ''
              }

              ${
                !isFinished && progress > 0
                  ? buildBadge(
                      'Continue',
                      'bg-indigo-500/10 text-indigo-300 border border-indigo-500/15'
                    )
                  : ''
              }
            </div>

            <button
              type="button"
              data-action="resume"
              data-id="${escapeHtml(id)}"
              class="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white transition-colors hover:text-indigo-300"
            >
              ${isFinished ? 'Read Again' : 'Resume Tale'}
              <i data-lucide="arrow-right-circle" class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"></i>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}
