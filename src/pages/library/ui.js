// src/pages/library/ui.js
// UI helpers for the library page:
//   - Sidebar toggle with localStorage persistence (desktop collapsed + mobile drawer)
//   - Era chip builder
//   - Active state management for sidebar and era buttons
//   - Auth user display in sidebar
//   - Skeleton / empty / error grid states

import { libraryState } from './state.js';
import { initIcons } from '@ui/components/icons.js';
import { escapeHtml as escapeHtml, createLogger } from '@/utils';

const log = createLogger('LibraryUI');
log.debug('Module initialized');

/* ─────────────────────────────────────────────
   Sidebar Toggle (Desktop Collapse & Mobile Drawer)
   ───────────────────────────────────────────── */

/**
 * Initialises the sidebar collapse/expand toggle and mobile drawer controls.
 * Persists collapsed state to localStorage.
 * Applies initial state from libraryState.sidebarCollapsed.
 */
export function setupSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const toggleBtn = document.getElementById('toggle-sidebar');
  if (toggleBtn) {
    _applySidebarState(sidebar, libraryState.sidebarCollapsed);

    toggleBtn.addEventListener('click', () => {
      libraryState.sidebarCollapsed = !libraryState.sidebarCollapsed;
      localStorage.setItem(
        'tt-lib-sidebar-collapsed',
        JSON.stringify(libraryState.sidebarCollapsed)
      );
      _applySidebarState(sidebar, libraryState.sidebarCollapsed);
    });
  }

  // Mobile Drawer Controls
  const mobileToggleBtn = document.getElementById('mobile-filter-toggle');
  const mobileCloseBtn = document.getElementById('close-sidebar-mobile');
  const backdrop = document.getElementById('sidebar-backdrop');

  const openMobileDrawer = () => {
    sidebar.classList.add('sidebar--mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    document.body.classList.add('overflow-hidden', 'has-sidebar-open');
  };

  const closeMobileDrawer = () => {
    sidebar.classList.remove('sidebar--mobile-open');
    if (backdrop) backdrop.classList.add('hidden');
    document.body.classList.remove('overflow-hidden', 'has-sidebar-open');
  };

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', openMobileDrawer);
  }

  if (mobileCloseBtn) {
    mobileCloseBtn.addEventListener('click', closeMobileDrawer);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeMobileDrawer);
  }

  // Close drawer when a filter or action is clicked on mobile
  sidebar.querySelectorAll('.sidebar-filter, #btn-submit-tale').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        closeMobileDrawer();
      }
    });
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
      ${escapeHtml(label)}
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
 * @param {number} [count=8]
 */
export function showGridSkeleton(count = 8) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.innerHTML = Array.from(
    { length: count },
    () => `
    <div class="tale-card animate-pulse rounded-2xl overflow-hidden border border-white/5 bg-white/2 p-2.5 sm:p-4 flex flex-col justify-between">
      <div class="mb-2 sm:mb-3 flex items-center justify-between gap-1.5 sm:gap-2">
        <div class="skeleton h-4 sm:h-5 w-14 sm:w-20 rounded-full"></div>
        <div class="skeleton h-6 w-6 sm:h-7 sm:w-7 rounded-lg"></div>
      </div>
      <div class="card-image-wrap skeleton rounded-xl mb-2.5 sm:mb-3.5"></div>
      <div class="space-y-1.5 sm:space-y-2 flex-1">
        <div class="skeleton h-2.5 sm:h-3 w-1/3 rounded"></div>
        <div class="skeleton h-4 sm:h-5 w-3/4 rounded"></div>
        <div class="space-y-1 sm:space-y-1.5 mt-1.5 sm:mt-2">
          <div class="skeleton h-2.5 sm:h-3 w-full rounded"></div>
          <div class="hidden sm:block skeleton h-3 w-2/3 rounded"></div>
        </div>
      </div>
      <div class="flex items-center justify-between pt-2 sm:pt-3 mt-auto border-t border-white/5">
        <div class="flex gap-2">
          <div class="skeleton h-3 w-10 sm:w-12 rounded"></div>
        </div>
        <div class="skeleton h-5 sm:h-6 w-12 sm:w-16 rounded-lg"></div>
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
    <div class="col-span-full flex flex-col items-center gap-6 py-28 text-center animate-fade-in">
      <div class="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-2xl">
        <i data-lucide="scroll-text" class="w-7 h-7 text-indigo-400"></i>
      </div>
      <div class="space-y-1.5">
        <h3 class="text-xl font-cinzel font-bold text-white tracking-tight">The Weave is Silent</h3>
        <p class="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed font-medium italic">${escapeHtml(message)}</p>
      </div>
      <button
        id="empty-search-focus-btn"
        class="group inline-flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-500/20 hover:text-white transition-all shadow-lg shadow-indigo-500/10"
      >
        <i data-lucide="search" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
        Consult the Oracle
      </button>
    </div>
  `;

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
      <div class="inline-flex flex-col items-center gap-4 px-8 py-8 rounded-3xl bg-rose-500/5 border border-rose-500/15">
        <div class="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-1">
          <i data-lucide="alert-triangle" class="w-6 h-6 text-rose-400"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-rose-400">Archive Connection Interrupted</h3>
          <p class="text-xs text-rose-400/70 font-medium uppercase tracking-wider">Database connection failed</p>
        </div>
        <button
          id="grid-error-reload-btn"
          class="mt-3 px-5 py-2 rounded-xl bg-rose-500/10 text-rose-300 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20 hover:bg-rose-500/20 transition-all"
        >
          Re-establish Connection
        </button>
      </div>
    </div>
  `;

  document.getElementById('grid-error-reload-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  initIcons(grid);
}
