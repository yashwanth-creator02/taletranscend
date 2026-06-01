// src/pages/shelf/ui.js
// All HTML string builders and DOM renderers for the shelf page.
// Pure presentation layer — no data fetching here.

import { shelfState } from './state.js';
import { initIcons } from '@ui/components/icons.js';
import { setText, formatNumber, timeAgo } from '@/utils';

/* ─────────────────────────────────────────────
   Grid Renderers
   ───────────────────────────────────────────── */

/**
 * Renders items into #studio-grid using the correct card type.
 *
 * @param {Array<Object>} items
 * @param {'bookmarked' | 'drafts'} type
 */
export function renderGrid(items, type) {
  const grid = document.getElementById('studio-grid');
  if (!grid) return;

  if (!items.length) {
    setGridEmpty(
      type === 'bookmarked'
        ? 'No bookmarked tales match your filter.'
        : 'No drafts match your filter.'
    );
    return;
  }

  grid.innerHTML = items
    .map((item) => (type === 'drafts' ? buildDraftCard(item) : buildBookmarkCard(item)))
    .join('');

  initIcons();
}

export function setGridLoading() {
  const grid = document.getElementById('studio-grid');
  if (!grid) return;

  grid.innerHTML = Array.from(
    { length: 6 },
    () => `
    <div class="rounded-[2rem] overflow-hidden border border-white/[0.04]">
      <div class="aspect-[4/3] skeleton"></div>
      <div class="p-5 space-y-3">
        <div class="skeleton h-4 w-2/3 rounded-lg"></div>
        <div class="skeleton h-3 w-full rounded-lg"></div>
        <div class="skeleton h-3 w-3/4 rounded-lg"></div>
        <div class="flex gap-3 pt-2">
          <div class="skeleton h-3 w-16 rounded-lg"></div>
          <div class="skeleton h-3 w-16 rounded-lg"></div>
        </div>
      </div>
    </div>
  `
  ).join('');
}

export function setGridEmpty(message) {
  const grid = document.getElementById('studio-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full">
      <div class="glass-panel-elevated rounded-[2rem] py-20 px-8 text-center border border-white/[0.04] flex flex-col items-center gap-5">
        <div class="w-14 h-14 rounded-2xl bg-indigo-500/[0.07] border border-indigo-500/15 flex items-center justify-center">
          <i data-lucide="archive" class="w-6 h-6 text-indigo-500/50"></i>
        </div>
        <div>
          <h3 class="text-base font-cinzel font-bold text-white mb-2">Nothing here yet</h3>
          <p class="text-sm text-slate-600 max-w-sm leading-relaxed">${message}</p>
        </div>
        <a href="library.html"
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
  const grid = document.getElementById('studio-grid');
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
    description = '',
    era = 'Unknown Era',
    chapterCount = 0,
    progress = 0,
  } = tale;

  const cover =
    coverUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800';
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress)));
  const menuId = `menu-${id}`;
  const isFinished = progress >= 100;

  return `
    <article
      class="shelf-card group relative rounded-[2rem] overflow-hidden border border-white/[0.05] bg-white/[0.025] hover:border-indigo-500/25 transition-all duration-400 cursor-pointer"
      data-id="${id}"
    >
      <div class="relative aspect-[16/10] bg-zinc-900 overflow-hidden">
        <img
          src="${cover}"
          alt="${title}"
          class="w-full h-full object-cover opacity-55 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        <div class="absolute top-3 left-3">
          <span class="shelf-era-badge">${era}</span>
        </div>

        <div class="absolute top-3 right-3">
          <button
            type="button"
            class="shelf-options-btn"
            data-action="options"
            data-menu-id="${menuId}"
            aria-label="More options for ${title}"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <i data-lucide="more-horizontal" class="w-3.5 h-3.5"></i>
          </button>

          <div id="${menuId}" class="shelf-menu" role="menu" hidden>
            <p class="shelf-menu-label">Actions</p>
            <button class="shelf-menu-item" role="menuitem" type="button" data-action="copy-link" data-id="${id}">
              <i data-lucide="link" class="w-3.5 h-3.5"></i> Copy link
            </button>
            <button class="shelf-menu-item" role="menuitem" type="button">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Save offline
            </button>
            <div class="shelf-menu-divider"></div>
            <p class="shelf-menu-label">Manage</p>
            <button class="shelf-menu-item" role="menuitem" type="button"
              data-action="${isFinished ? '' : 'mark-finished'}" data-id="${id}"
              ${isFinished ? 'disabled aria-disabled="true"' : ''}>
              <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
              ${isFinished ? 'Already finished' : 'Mark as finished'}
            </button>
            <button class="shelf-menu-item shelf-menu-item--danger" role="menuitem" type="button"
              data-action="decouple" data-id="${id}">
              <i data-lucide="bookmark-minus" class="w-3.5 h-3.5"></i> Remove from shelf
            </button>
          </div>
        </div>

        <div class="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-6 bg-gradient-to-t from-black/70 to-transparent">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[9px] font-bold uppercase tracking-wider text-white/40">Progress</span>
            <span class="text-[9px] font-bold text-indigo-400">${isFinished ? 'Done' : `${progressPercent}%`}</span>
          </div>
          <div class="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ${isFinished ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}"
              style="width: ${Math.max(isFinished ? 100 : 2, progressPercent)}%"
            ></div>
          </div>
        </div>
      </div>

      <div class="p-4">
        <h3 class="font-bold text-white text-sm leading-snug mb-1.5 group-hover:text-indigo-300 transition-colors line-clamp-2">
          ${title}
        </h3>
        <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
          ${description}
        </p>

        <div class="flex items-center justify-between pt-3 border-t border-white/[0.04]">
          <div class="flex items-center gap-3 text-[10px] text-slate-600">
            <span class="flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3 h-3"></i>
              ${chapterCount} ch
            </span>
          </div>
          <button
            class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-400 transition-colors group/btn"
            type="button"
            data-action="resume"
            data-id="${id}"
          >
            ${isFinished ? 'Re-read' : 'Continue'}
            <i data-lucide="arrow-right" class="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

/* ─────────────────────────────────────────────
   Draft Card
   ───────────────────────────────────────────── */

/**
 * @param {import('@state/schemas/draft.schema.js').Draft} draft
 * @returns {string}
 */
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

  const updated = updatedAt?.seconds ? timeAgo(new Date(updatedAt.seconds * 1000)) : 'Recently';
  const wordLabel =
    wordCount > 0
      ? wordCount >= 1000
        ? `${(wordCount / 1000).toFixed(1)}k words`
        : `${wordCount} words`
      : 'No content yet';

  return `
    <article
      class="shelf-card group relative rounded-[2rem] border border-white/[0.05] bg-white/[0.025] hover:border-indigo-500/25 transition-all duration-400 overflow-hidden"
      data-id="${id}"
    >
      <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.04]">
        <span class="shelf-draft-badge">
          <i data-lucide="feather" class="w-2.5 h-2.5"></i>
          Draft
        </span>
        <span class="text-[9px] text-slate-700">${updated}</span>
      </div>

      <div class="p-5">
        ${era ? `<span class="shelf-era-badge mb-3 inline-block">${era}</span>` : ''}

        <h3 class="font-bold text-white text-base leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
          ${title}
        </h3>

        <p class="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
          ${synopsis || 'No synopsis yet. Open the editor to add one.'}
        </p>

        <div class="grid grid-cols-2 gap-3 py-3 border-t border-white/[0.04] mb-4">
          <div class="flex items-center gap-2 text-[10px] text-slate-600">
            <i data-lucide="layers" class="w-3 h-3 text-slate-700"></i>
            ${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}
          </div>
          <div class="flex items-center gap-2 text-[10px] text-slate-600">
            <i data-lucide="file-text" class="w-3 h-3 text-slate-700"></i>
            ${wordLabel}
          </div>
        </div>

        <a
          href="contribution.html?draft=${id}"
          class="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-indigo-500/[0.07] border border-indigo-500/15 text-indigo-400 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-500/15 transition-colors group/btn"
        >
          Continue Writing
          <i data-lucide="arrow-right" class="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform"></i>
        </a>
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
 * @param {'bookmarked' | 'drafts'} activeTab
 */
export function setActiveTab(activeTab) {
  document.querySelectorAll('.shelf-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === activeTab;
    btn.classList.toggle('studio-tab-active', isActive);
    btn.classList.toggle('text-zinc-500', !isActive);
    btn.classList.remove(isActive ? 'text-zinc-500' : 'studio-tab-active');
  });
}
