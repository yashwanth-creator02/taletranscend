// src/pages/shelf/ui.js
// All HTML string builders and DOM renderers for the shelf page.
// Pure presentation layer — no data fetching here.

import { shelfState } from './state.js';
import { initIcons } from '@ui/components/icons.js';
import { setText, formatNumber, timeAgo, escapeHtml as escapeHtml } from '@/utils';

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _badge(text, classes = '') {
  return `<span class="badge ${classes}">${escapeHtml(text)}</span>`;
}

/* ─────────────────────────────────────────────
   Grid Renderers
   ───────────────────────────────────────────── */

/**
 * Renders items into #shelf-grid using the correct card type.
 *
 * @param {Array<Object>} items
 * @param {'bookmarked' | 'drafts' | 'recent'} type
 */
export function renderGrid(items, type) {
  const grid = document.getElementById('shelf-grid');
  if (!grid) return;

  if (!items.length) {
    let emptyMsg = 'No fragments match your filter.';
    if (type === 'bookmarked') emptyMsg = 'No bookmarked tales match your filter.';
    else if (type === 'drafts') emptyMsg = 'No drafts match your filter.';
    else if (type === 'recent') emptyMsg = 'No recently opened tales match your filter.';

    setGridEmpty(emptyMsg);
    return;
  }

  grid.innerHTML = items
    .map((item) => (type === 'drafts' ? buildDraftCard(item) : buildBookmarkCard(item)))
    .join('');

  initIcons();
}

export function setGridLoading() {
  const grid = document.getElementById('shelf-grid');
  if (!grid) return;

  grid.innerHTML = Array.from(
    { length: 6 },
    () => `
    <div class="rounded-2xl overflow-hidden border border-white/[0.04]">
      <div class="aspect-[16/10] max-h-36 skeleton"></div>
      <div class="p-3 sm:p-3.5 space-y-2.5">
        <div class="skeleton h-3.5 w-2/3 rounded-lg"></div>
        <div class="skeleton h-2.5 w-full rounded-lg"></div>
        <div class="skeleton h-2.5 w-3/4 rounded-lg"></div>
        <div class="flex gap-2 pt-1.5">
          <div class="skeleton h-2.5 w-12 rounded-lg"></div>
          <div class="skeleton h-2.5 w-12 rounded-lg"></div>
        </div>
      </div>
    </div>
  `
  ).join('');
}

export function setGridEmpty(message) {
  const grid = document.getElementById('shelf-grid');

  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full">
      <div class="glass-panel-elevated rounded-[2rem] py-20 px-8 text-center border border-white/[0.04] flex flex-col items-center gap-5">
        <div class="w-14 h-14 rounded-2xl bg-indigo-500/[0.07] border border-indigo-500/15 flex items-center justify-center">
          <i data-lucide="archive" class="w-6 h-6 text-indigo-500/50"></i>
        </div>
        <div>
          <h3 class="text-base font-cinzel font-bold text-white mb-2">Nothing here yet</h3>
          <p class="text-sm text-slate-400 max-w-sm leading-relaxed">${escapeHtml(message)}</p>
        </div>
        <a href="/library.html"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-indigo-500/20 transition-colors">
          <i data-lucide="compass" class="w-3.5 h-3.5"></i>
          Browse Library
        </a>
      </div>
    </div>
  `;
  initIcons();
}

export function setGridError() {
  const grid = document.getElementById('shelf-grid');

  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full text-center py-16">
      <div class="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-red-500/[0.07] border border-red-500/15 text-red-400 text-sm">
        <i data-lucide="alert-triangle" class="w-4 h-4"></i>
        Failed to load. Check your connection and
        <button id="shelf-error-reload-btn" class="underline hover:no-underline ml-1">refresh</button>.
      </div>
    </div>
  `;

  // Wire via event listener — no onclick attribute
  document.getElementById('shelf-error-reload-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  initIcons();
}

/* ─────────────────────────────────────────────
   Bookmark Card
   ───────────────────────────────────────────── */

/**
 * @param {import('@state/schemas/tale.schema.js').Tale & { progress?: number }} tale
 * @returns {string}
 */
export function buildBookmarkCard(tale) {
  const {
    id = '0000',
    title = 'Untitled Echo',
    coverUrl,
    authorName = 'Unknown Scribe',
    description = '',
    era = 'Unknown Era',
    chapterCount = 0,
    progress = 0,
  } = tale;

  const safeTitle = escapeHtml(title);
  const safeAuthor = escapeHtml(authorName);
  const safeDescription = escapeHtml(description);
  const safeEra = escapeHtml(era);

  const cover =
    coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800';
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress)));
  const menuId = `menu-${id}`;
  const isFinished = progress >= 100;

  const statusBadgeClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  const isBookmarked = true;
  const bookmarkedAction = 'decouple';
  const bookmarkedIcon = 'bookmark-minus';
  const bookmarkedLabel = 'Remove from Shelf';

  return `
    <article
      class="shelf-card group relative rounded-2xl overflow-visible border border-white/[0.05] bg-white/[0.025] hover:border-indigo-500/25 transition-all duration-400 cursor-pointer"
      data-id="${id}"
    >
      <!-- Dedicated options button & menu at card level so it is not clipped -->
      <div class="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30">
        <button
          type="button"
          data-action="options"
          data-menu-id="${escapeHtml(menuId)}"
          class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 transition-all hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-white"
          aria-expanded="false"
          aria-haspopup="menu"
          aria-label="Chronicle Options"
        >
          <i data-lucide="more-horizontal" class="h-3.5 w-3.5"></i>
        </button>

        <div
          id="${escapeHtml(menuId)}"
          class="options-menu hidden absolute right-0 z-[70] mt-2 w-56 overflow-hidden rounded-2xl p-2 shadow-2xl"
          role="menu"
          hidden
        >
          <div class="px-3 py-2 border-b border-white/5 mb-1">
            <span class="text-[8px] font-black uppercase tracking-widest text-zinc-400">Chronicle Options</span>
          </div>

          <button type="button" data-action="copy-link" data-id="${escapeHtml(id)}"
            class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
            <i data-lucide="link" class="h-3.5 w-3.5"></i>
            <span>Copy Tale Link</span>
          </button>

          <button type="button" data-action="download" data-id="${escapeHtml(id)}"
            class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
            <i data-lucide="download" class="h-3.5 w-3.5"></i>
            <span>Download Chronicle</span>
          </button>

          <div class="h-px bg-white/5 my-1"></div>

          <button type="button"
            class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${isFinished ? 'opacity-40 text-zinc-600' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}"
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

      <div class="relative aspect-[16/10] max-h-44 bg-zinc-900 rounded-t-2xl overflow-hidden">
        <img
          src="${cover}"
          alt="${safeTitle}"
          class="w-full h-full object-cover opacity-55 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        <!-- Header: Badges -->
        <div class="absolute top-0 left-0 right-14 p-2.5 sm:p-3 flex items-start justify-between gap-2 z-10">
          <div class="flex flex-wrap items-center gap-1.5">
            ${_badge(safeEra, 'bg-indigo-500/5 text-indigo-300 text-[8px] sm:text-[9px] px-2 py-0.5')}
            ${isFinished ? _badge('Finished', `${statusBadgeClasses} text-[8px] sm:text-[9px] px-2 py-0.5`) : ''}
          </div>
        </div>

        <div class="absolute bottom-0 left-0 right-0 px-2.5 sm:px-3 pb-2 pt-4 bg-gradient-to-t from-black/70 to-transparent">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white/40">Progress</span>
            <span class="text-[8px] sm:text-[9px] font-bold text-indigo-400">${isFinished ? 'Done' : `${progressPercent}%`}</span>
          </div>
          <div class="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ${isFinished ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}"
              style="width: ${Math.max(isFinished ? 100 : 2, progressPercent)}%"
            ></div>
          </div>
        </div>
      </div>

      <div class="p-3 sm:p-3.5">
        <p class="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-500/60 mb-1 truncate">${safeAuthor}</p>
        <h3 class="font-bold text-white text-xs sm:text-sm leading-snug mb-1 group-hover:text-indigo-300 transition-colors line-clamp-1">
          ${safeTitle}
        </h3>
        <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
          ${safeDescription}
        </p>

        <div class="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          <div class="flex items-center gap-2 text-[9px] sm:text-[10px] text-slate-400">
            <span class="flex items-center gap-1">
              <i data-lucide="layers" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i>
              ${chapterCount} ch
            </span>
          </div>
          <button
            class="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-400 transition-colors group/btn"
            type="button"
            data-action="resume"
            data-id="${id}"
          >
            ${isFinished ? 'Re-read' : 'Continue'}
            <i data-lucide="arrow-right" class="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover/btn:translate-x-0.5 transition-transform"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ─────────────────────────────────────────────
   Draft Card
   ───────────────────────────────────────────── */

export function buildDraftCard(draft) {
  const {
    id,
    title = 'Untitled Draft',
    synopsis = '',
    era = '',
    chapterCount = 0,
    wordCount = 0,
    updatedAt,
  } = draft;

  const safeTitle = escapeHtml(title);
  const safeSynopsis = escapeHtml(synopsis);
  const safeEra = escapeHtml(era);

  const updated = updatedAt?.seconds ? timeAgo(new Date(updatedAt.seconds * 1000)) : 'Recently';
  const wordLabel =
    wordCount > 0
      ? wordCount >= 1000
        ? `${(wordCount / 1000).toFixed(1)}k words`
        : `${wordCount} words`
      : 'No content yet';

  const menuId = `menu-${id}`;

  return `
    <article
      class="shelf-card group relative rounded-2xl border border-white/[0.05] bg-white/[0.025] hover:border-indigo-500/25 transition-all duration-400 overflow-visible cursor-pointer"
      data-id="${id}"
    >
      <div class="relative p-3 sm:p-3.5">
        <!-- Header: Badges & Actions -->
        <div class="flex items-start justify-between gap-2 mb-2.5">
          <div class="flex flex-wrap items-center gap-1.5">
            ${_badge('Draft', 'bg-amber-500/10 text-amber-400 border-amber-500/20 text-[8px] sm:text-[9px] px-2 py-0.5')}
            ${safeEra ? _badge(safeEra, 'bg-indigo-500/5 text-indigo-300 text-[8px] sm:text-[9px] px-2 py-0.5') : ''}
          </div>

          <div class="relative shrink-0">
            <button
              type="button"
              data-action="options"
              data-menu-id="${escapeHtml(menuId)}"
              class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-zinc-500 transition-all hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-white"
              aria-expanded="false"
              aria-haspopup="menu"
              aria-label="Draft Options"
            >
              <i data-lucide="more-horizontal" class="h-3.5 w-3.5"></i>
            </button>

            <div
              id="${escapeHtml(menuId)}"
              class="options-menu hidden absolute right-0 z-[70] mt-2 w-56 overflow-hidden rounded-2xl p-2 shadow-2xl"
              role="menu"
              hidden
            >
              <div class="px-3 py-2 border-b border-white/5 mb-1">
                <span class="text-[8px] font-black uppercase tracking-widest text-zinc-600">Draft Operations</span>
              </div>

              <button type="button" data-action="copy-link" data-id="${escapeHtml(id)}"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white">
                <i data-lucide="link" class="h-3.5 w-3.5"></i>
                <span>Copy Draft Link</span>
              </button>

              <div class="h-px bg-white/5 my-1"></div>

              <button type="button" data-action="delete-draft" data-id="${escapeHtml(id)}"
                class="menu-btn flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[0.22em] text-rose-400/70 transition-colors hover:bg-rose-500/10 hover:text-rose-400">
                <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
                <span>Discard Draft</span>
              </button>
            </div>
          </div>
        </div>

        <h3 class="font-bold text-white text-xs sm:text-sm leading-snug mb-1 group-hover:text-indigo-300 transition-colors line-clamp-1">
          ${safeTitle}
        </h3>

        <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
          ${safeSynopsis || 'No synopsis yet. Open the editor to add one.'}
        </p>

        <div class="grid grid-cols-2 gap-2 py-2 border-t border-white/[0.04] mb-2 text-[9px] sm:text-[10px]">
          <div class="flex items-center gap-1.5 text-slate-400 truncate">
            <i data-lucide="layers" class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 shrink-0"></i>
            <span class="truncate">${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}</span>
          </div>
          <div class="flex items-center gap-1.5 text-slate-400 truncate">
            <i data-lucide="file-text" class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 shrink-0"></i>
            <span class="truncate">${wordLabel}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-1">
          <span class="text-[8px] sm:text-[9px] text-slate-400 truncate">Last updated ${updated}</span>
          <a
            href="/contribution.html?draft=${id}"
            class="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors group/btn shrink-0"
          >
            Edit
            <i data-lucide="arrow-right" class="w-2.5 h-2.5 sm:w-3 sm:h-3 group-hover/btn:translate-x-0.5 transition-transform"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

/* ─────────────────────────────────────────────
   Hero Stats
   ───────────────────────────────────────────── */

/**
 * @param {{ draftCount: number, bookmarkCount: number, wordsPreserved: number }} stats
 */
export function renderHeroStats({ draftCount, bookmarkCount, wordsPreserved }) {
  setText('hero-stat-drafts', String(draftCount));
  setText('hero-stat-bookmarks', String(bookmarkCount));
  setText('hero-stat-words', formatNumber(wordsPreserved));
}

/* ─────────────────────────────────────────────
   Sort Panel
   ───────────────────────────────────────────── */

export function buildSortPanel() {
  const panel = document.getElementById('sort-panel');
  if (!panel) return;

  const options = [
    { key: 'date', label: 'Date updated', icon: 'calendar' },
    { key: 'title', label: 'Title A–Z', icon: 'type' },
    { key: 'progress', label: 'Progress', icon: 'bar-chart-2' },
  ];

  panel.innerHTML = `
    <div class="py-1">
      <p class="sort-panel-label">Sort by</p>
      ${options
        .map(
          (opt) => `
        <button
          type="button"
          class="sort-option${shelfState.sortBy === opt.key ? ' sort-option--active' : ''}"
          data-sort="${opt.key}"
        >
          <i data-lucide="${opt.icon}" class="w-3.5 h-3.5"></i>
          ${opt.label}
          ${
            shelfState.sortBy === opt.key
              ? `<i data-lucide="${shelfState.sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}" class="w-3 h-3 ml-auto opacity-60"></i>`
              : ''
          }
        </button>
      `
        )
        .join('')}
    </div>
  `;

  initIcons();
}

export function refreshSortPanel() {
  buildSortPanel();
}

/* ─────────────────────────────────────────────
   Tab Styles
   ───────────────────────────────────────────── */

/**
 * @param {'bookmarked' | 'drafts' | 'recent'} activeTab
 */
export function setActiveTab(activeTab) {
  document.querySelectorAll('.shelf-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === activeTab;
    btn.classList.toggle('shelf-tab-active', isActive);
    btn.classList.toggle('text-zinc-500', !isActive && btn.dataset.tab !== 'recent');
    btn.classList.toggle('text-zinc-600', !isActive && btn.dataset.tab === 'recent');

    if (isActive) {
      btn.classList.remove('text-zinc-500', 'text-zinc-600');
    }
  });
}
