// src/pages/library/ui.js
// UI helpers for the library page:
//   - Sidebar toggle with localStorage persistence
//   - Era chip builder
//   - Active state management for sidebar and era buttons
//   - Auth user display in sidebar
//   - Skeleton / empty / error grid states

import { libraryState } from './state.js';
import { initIcons } from '@ui/components/icons.js';

/* ─────────────────────────────────────────────
   Sidebar Toggle
   ───────────────────────────────────────────── */

/**
 * Initialises the sidebar collapse/expand toggle.
 * Persists collapsed state to localStorage.
 * Applies initial state from libraryState.sidebarCollapsed.
 */
export function setupSidebarToggle() {
  const sidebar   = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-sidebar');
  if (!sidebar || !toggleBtn) return;

  _applySidebarState(sidebar, libraryState.sidebarCollapsed);

  toggleBtn.addEventListener('click', () => {
    libraryState.sidebarCollapsed = !libraryState.sidebarCollapsed;
    localStorage.setItem('tt-lib-sidebar-collapsed', JSON.stringify(libraryState.sidebarCollapsed));
    _applySidebarState(sidebar, libraryState.sidebarCollapsed);
  });
}

function _applySidebarState(sidebar, collapsed) {
  sidebar.classList.toggle('sidebar--collapsed', collapsed);
  const icon = document.querySelector('#toggle-sidebar i[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', collapsed ? 'panel-left-open' : 'panel-left-close');
    initIcons(document.getElementById('toggle-sidebar'));
  }
}

/* ─────────────────────────────────────────────
   Sidebar Active Button
   ───────────────────────────────────────────── */

/**
 * @param {string} activeFilter
 */
export function setActiveSidebarBtn(activeFilter) {
  document.querySelectorAll('.sidebar-filter').forEach((btn) => {
    const isActive = btn.dataset.filter === activeFilter;
    btn.classList.toggle('sidebar-filter--active', isActive);
    btn.classList.toggle('sidebar-filter--inactive', !isActive);
  });
}

/* ─────────────────────────────────────────────
   Era Chips
   ───────────────────────────────────────────── */

/**
 * Renders era filter chips into #era-filter-bar from real tale data.
 *
 * @param {string[]} eras
 */
export function buildEraChips(eras) {
  const bar = document.getElementById('era-filter-bar');
  if (!bar) return;

  const chips = [{ era: 'all', label: 'All Scrolls' }, ...eras.map((era) => ({ era, label: era }))];

  bar.innerHTML = chips
    .map(
      ({ era, label }) => `
    <button
      data-era="${era}"
      class="era-chip${era === libraryState.activeEra ? ' era-chip--active' : ' era-chip--inactive'}"
    >
      ${label}
    </button>
  `
    )
    .join('');
}

/**
 * @param {string} activeEra
 */
export function setActiveEraChip(activeEra) {
  document.querySelectorAll('[data-era]').forEach((btn) => {
    const isActive = btn.dataset.era === activeEra;
    btn.classList.toggle('era-chip--active', isActive);
    btn.classList.toggle('era-chip--inactive', !isActive);
  });
}

/* ─────────────────────────────────────────────
   Sidebar Auth User
   ───────────────────────────────────────────── */

/**
 * @param {import('firebase/auth').User} user
 * @param {{ name?: string }} [profile]
 */
export function updateSidebarUser(user, profile = {}) {
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl   = document.getElementById('sidebar-user-name');
  const subEl    = document.getElementById('sidebar-user-sub');

  const seed      = user.uid.slice(0, 8);
  const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  const name      = profile.name || user.displayName || `Scribe ${seed.slice(0, 4)}`;

  if (avatarEl) avatarEl.src         = avatarSrc;
  if (nameEl)   nameEl.textContent   = name;
  if (subEl)    subEl.textContent    = 'Archive Member';
}

/* ─────────────────────────────────────────────
   Grid States
   ───────────────────────────────────────────── */

/**
 * @param {number} [count=8]
 */
export function showGridSkeleton(count = 8) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = Array.from(
    { length: count },
    () => `
    <div class="rounded-[2.5rem] overflow-hidden border border-white/[0.04] bg-white/[0.01]">
      <div class="aspect-[16/10] skeleton"></div>
      <div class="p-6 space-y-4">
        <div class="skeleton h-4 w-1/4 rounded-lg"></div>
        <div class="skeleton h-6 w-3/4 rounded-lg"></div>
        <div class="space-y-2">
          <div class="skeleton h-3.5 w-full rounded-md"></div>
          <div class="skeleton h-3.5 w-2/3 rounded-md"></div>
        </div>
        <div class="flex items-center justify-between pt-4 border-t border-white/5">
          <div class="flex gap-3">
            <div class="skeleton h-3 w-16 rounded-md"></div>
            <div class="skeleton h-3 w-16 rounded-md"></div>
          </div>
          <div class="skeleton h-4 w-4 rounded-full"></div>
        </div>
      </div>
    </div>
  `
  ).join('');
}

/**
 * @param {string} [message]
 */
export function showGridEmpty(message = 'No tales found in the archives.') {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full flex flex-col items-center gap-6 py-32 text-center animate-fade-in">
      <div class="w-20 h-20 rounded-[2rem] bg-indigo-500/[0.05] border border-indigo-500/10 flex items-center justify-center shadow-2xl">
        <i data-lucide="scroll-text" class="w-8 h-8 text-indigo-500/30"></i>
      </div>
      <div class="space-y-2">
        <h3 class="text-xl font-cinzel font-bold text-white tracking-tight">The Weave is Silent</h3>
        <p class="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed font-medium italic">${message}</p>
      </div>
      <button
        id="empty-search-focus-btn"
        class="group inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-[0.25em] hover:bg-indigo-500/20 hover:text-indigo-300 transition-all shadow-xl shadow-indigo-500/10"
      >
        <i data-lucide="search" class="w-4 h-4 group-hover:scale-110 transition-transform"></i>
        Consult the Oracle
      </button>
    </div>
  `;

  // Wire button via event listener — no onclick attribute
  document.getElementById('empty-search-focus-btn')?.addEventListener('click', () => {
    document.getElementById('search-input')?.focus();
  });

  initIcons(grid);
}

export function showGridError() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full text-center py-24 animate-fade-in">
      <div class="inline-flex flex-col items-center gap-4 px-10 py-10 rounded-[2.5rem] bg-rose-500/[0.03] border border-rose-500/15">
        <div class="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-2">
          <i data-lucide="alert-triangle" class="w-6 h-6 text-rose-500/60"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-bold text-rose-400">Neural Link Severed</h3>
          <p class="text-xs text-rose-500/70 font-medium uppercase tracking-widest">Database connection failed</p>
        </div>
        <button
          id="grid-error-reload-btn"
          class="mt-4 px-6 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-500/20 hover:bg-rose-500/20 transition-all"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  `;

  // Wire button via event listener — no onclick attribute
  document.getElementById('grid-error-reload-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  initIcons(grid);
}
