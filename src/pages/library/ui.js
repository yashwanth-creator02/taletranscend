// src/pages/library/ui.js
// UI helpers for the library page:
//   - Sidebar toggle (collapsed/expanded) with localStorage persistence
//   - Era chip builder (dynamic from real data)
//   - Active state management for sidebar + era buttons
//   - Sidebar auth user display
//   - Skeleton / empty / error grid states

import { libraryState } from './state.js';

/* ─────────────────────────────────────────────
   Sidebar Toggle
   ───────────────────────────────────────────── */

/**
 * Initialises the sidebar collapse/expand toggle.
 * Persists collapsed state to localStorage.
 * Applies initial state from libraryState.sidebarCollapsed.
 */
export function setupSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-sidebar');
  if (!sidebar || !toggleBtn) return;

  // Apply saved state immediately
  _applySidebarState(sidebar, libraryState.sidebarCollapsed);

  toggleBtn.addEventListener('click', () => {
    libraryState.sidebarCollapsed = !libraryState.sidebarCollapsed;
    localStorage.setItem('tt-lib-sidebar-collapsed', JSON.stringify(libraryState.sidebarCollapsed));
    _applySidebarState(sidebar, libraryState.sidebarCollapsed);
  });
}

function _applySidebarState(sidebar, collapsed) {
  sidebar.classList.toggle('sidebar--collapsed', collapsed);
  // Update chevron/menu icon direction
  const icon = document.querySelector('#toggle-sidebar i[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', collapsed ? 'panel-left-open' : 'panel-left-close');
    window.lucide?.createIcons?.();
  }
}

/* ─────────────────────────────────────────────
   Sidebar Active Button
   ───────────────────────────────────────────── */

/**
 * Updates sidebar filter button active styles.
 *
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
 * Preserves the "All Scrolls" chip as the first item.
 *
 * @param {string[]} eras - Unique era strings derived from tales
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
 * Updates era chip active styles after a selection change.
 *
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
 * Updates the sidebar user section with real auth user data.
 * Called after auth resolves + after Firestore profile sync.
 *
 * @param {import('firebase/auth').User} user
 * @param {{ name?: string }} [profile]
 */
export function updateSidebarUser(user, profile = {}) {
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl = document.getElementById('sidebar-user-name');
  const subEl = document.getElementById('sidebar-user-sub');

  const seed = user.uid.slice(0, 8);
  const avatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  const name = profile.name || user.displayName || `Scribe ${seed.slice(0, 4)}`;

  if (avatarEl) avatarEl.src = avatarSrc;
  if (nameEl) nameEl.textContent = name;
  if (subEl) subEl.textContent = 'Archive Member';
}

/* ─────────────────────────────────────────────
   Grid States
   ───────────────────────────────────────────── */

/**
 * Renders skeleton loading cards into #cards-grid.
 *
 * @param {number} [count=8]
 */
export function showGridSkeleton(count = 8) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = Array.from(
    { length: count },
    () => `
    <div class="rounded-[2rem] overflow-hidden border border-white/[0.04]">
      <div class="aspect-[4/3] skeleton"></div>
      <div class="p-5 space-y-3">
        <div class="skeleton h-4 w-1/3 rounded-lg"></div>
        <div class="skeleton h-5 w-3/4 rounded-lg"></div>
        <div class="skeleton h-3 w-full rounded-lg"></div>
        <div class="skeleton h-3 w-2/3 rounded-lg"></div>
        <div class="flex gap-3 pt-2">
          <div class="skeleton h-3 w-20 rounded-lg"></div>
          <div class="skeleton h-3 w-20 rounded-lg"></div>
        </div>
      </div>
    </div>
  `
  ).join('');
}

/**
 * Renders an empty state into #cards-grid.
 *
 * @param {string} [message]
 */
export function showGridEmpty(message = 'No tales found in the archives.') {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full flex flex-col items-center gap-5 py-24 text-center">
      <div class="w-14 h-14 rounded-2xl bg-indigo-500/[0.07] border border-indigo-500/15 flex items-center justify-center">
        <i data-lucide="scroll-text" class="w-6 h-6 text-indigo-500/40"></i>
      </div>
      <div>
        <h3 class="text-base font-bold text-white mb-2">Nothing here</h3>
        <p class="text-sm text-zinc-600 max-w-xs leading-relaxed">${message}</p>
      </div>
      <button
        onclick="document.getElementById('search-input')?.focus()"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-indigo-500/20 transition-colors"
      >
        <i data-lucide="search" class="w-3.5 h-3.5"></i>
        Search library
      </button>
    </div>
  `;
  window.lucide?.createIcons?.();
}

/**
 * Renders an error state into #cards-grid.
 */
export function showGridError() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full text-center py-20">
      <div class="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-red-500/[0.07] border border-red-500/15 text-red-400 text-sm">
        <i data-lucide="alert-triangle" class="w-4 h-4"></i>
        Database connection failed.
        <button onclick="window.location.reload()" class="underline hover:no-underline ml-1">Refresh</button>
      </div>
    </div>
  `;
  window.lucide?.createIcons?.();
}
