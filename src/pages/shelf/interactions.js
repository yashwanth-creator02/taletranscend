// src/pages/shelf/interactions.js
// All event wiring for the shelf page.
// Tab switching, filter input, sort panel, card action delegation,
// and right-rail studio ritual buttons.

import { shelfState } from './state.js';
import {
  loadBookmarkedTales,
  loadDrafts,
  applyAndRender,
  computeAndRenderHeroStats,
} from './content.js';
import { setActiveTab, buildSortPanel, refreshSortPanel } from './ui.js';

/* ─────────────────────────────────────────────
   Public Init
   ───────────────────────────────────────────── */

/**
 * Wires all shelf interactions.
 * Call once after DOMContentLoaded.
 */
export function initShelfInteractions() {
  _bindTabs();
  _bindFilter();
  _bindSort();
  _bindCardActions();
  _bindRightRail();
  buildSortPanel();
}

/* ─────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────── */

function _bindTabs() {
  document.querySelectorAll('.shelf-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.tab;
      if (!tab || tab === shelfState.activeTab) return;

      shelfState.activeTab = tab;
      setActiveTab(tab);

      if (!shelfState.userId) return;

      if (tab === 'bookmarked') {
        await loadBookmarkedTales(shelfState.userId);
      } else if (tab === 'drafts') {
        await loadDrafts(shelfState.userId);
        computeAndRenderHeroStats();
      }
    });
  });
}

/* ─────────────────────────────────────────────
   Filter
   ───────────────────────────────────────────── */

function _bindFilter() {
  const input = document.getElementById('shelf-filter-input');
  if (!input) return;

  let debounceTimer;

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      shelfState.filterQuery = e.target.value.toLowerCase();
      applyAndRender();
    }, 220);
  });

  // Clear filter on Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      shelfState.filterQuery = '';
      applyAndRender();
      input.blur();
    }
  });
}

/* ─────────────────────────────────────────────
   Sort
   ───────────────────────────────────────────── */

function _bindSort() {
  const btn = document.getElementById('sort-btn');
  const panel = document.getElementById('sort-panel');
  if (!btn || !panel) return;

  // Toggle panel
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) {
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Sort option click (delegated)
  panel.addEventListener('click', (e) => {
    const option = e.target.closest('[data-sort]');
    if (!option) return;

    const key = option.dataset.sort;

    // Toggle direction if same key selected again
    if (shelfState.sortBy === key) {
      shelfState.sortDir = shelfState.sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      shelfState.sortBy = key;
      shelfState.sortDir = 'desc';
    }

    refreshSortPanel();
    applyAndRender();

    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });
}

/* ─────────────────────────────────────────────
   Card Actions (click delegation)
   ───────────────────────────────────────────── */

function _bindCardActions() {
  const grid = document.getElementById('studio-grid');
  if (!grid) return;

  // Use a MutationObserver so newly rendered cards are always covered
  // without re-binding on every render.
  const observer = new MutationObserver(() => {
    // Re-attach is not needed — delegation on grid covers new children.
  });
  observer.observe(grid, { childList: true });

  grid.addEventListener('click', (e) => {
    const target = e.target;

    // Options button — toggle menu
    const optionsBtn = target.closest('[data-action="options"]');
    if (optionsBtn) {
      e.stopPropagation();
      const menuId = optionsBtn.dataset.menuId;
      _toggleMenu(menuId, optionsBtn);
      return;
    }

    // Close any open menu on outside click handled by document listener
    const menuItem = target.closest('[data-action]');
    if (menuItem) {
      const action = menuItem.dataset.action;
      const id = menuItem.dataset.id;
      _handleCardAction(action, id, e);
      return;
    }

    // Click on card body → resume/open
    const card = target.closest('[data-id]');
    if (card && !target.closest('.shelf-menu') && !target.closest('.shelf-options-btn')) {
      const id = card.dataset.id;
      if (id) _navigateToTale(id);
    }
  });

  // Close all menus on document click
  document.addEventListener('click', _closeAllMenus);

  // Escape closes open menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeAllMenus();
  });
}

function _toggleMenu(menuId, triggerBtn) {
  // Close all other menus first
  document.querySelectorAll('.shelf-menu:not([hidden])').forEach((m) => {
    if (m.id !== menuId) {
      m.hidden = true;
      document.querySelector(`[data-menu-id="${m.id}"]`)?.setAttribute('aria-expanded', 'false');
    }
  });

  const menu = document.getElementById(menuId);
  if (!menu) return;

  const isOpen = !menu.hidden;
  menu.hidden = isOpen;
  triggerBtn?.setAttribute('aria-expanded', String(!isOpen));
}

function _closeAllMenus() {
  document.querySelectorAll('.shelf-menu:not([hidden])').forEach((m) => {
    m.hidden = true;
  });
  document.querySelectorAll('[data-action="options"]').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

function _handleCardAction(action, id, e) {
  e.stopPropagation();

  switch (action) {
    case 'resume':
      _navigateToTale(id);
      break;

    case 'copy-link': {
      const url = `${window.location.origin}/tale.html?id=${id}`;
      navigator.clipboard?.writeText(url).then(() => {
        _showToast('Link copied to clipboard.', 'success');
      });
      break;
    }

    case 'mark-finished':
      // markFinish.service.js is already in services — wire when ready
      _showToast('Marked as finished.', 'success');
      break;

    case 'decouple':
      _showToast('Removed from shelf.', 'success');
      // Optimistic UI: remove card immediately
      document.querySelector(`[data-id="${id}"]`)?.remove();
      // Remove from cached state
      shelfState.bookmarkedTales = shelfState.bookmarkedTales.filter((t) => t.id !== id);
      computeAndRenderHeroStats();
      break;

    default:
      break;
  }

  _closeAllMenus();
}

function _navigateToTale(id) {
  window.location.href = `tale.html?id=${id}`;
}

/* ─────────────────────────────────────────────
   Right Rail — Studio Rituals
   ───────────────────────────────────────────── */

function _bindRightRail() {
  // New Draft → contribution.html
  document.getElementById('ritual-new-draft')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  // Begin New Tale (hero CTA) → contribution.html
  document.getElementById('hero-new-tale-btn')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  // Voice Chronicle → stub with toast
  document.getElementById('ritual-voice-note')?.addEventListener('click', () => {
    _showToast('Voice Chronicle — coming soon.', 'info');
  });

  // Publishing flow → contribution.html (user picks draft there)
  document.getElementById('ritual-publish')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  // Hero Voice Chronicle button
  document.getElementById('hero-voice-btn')?.addEventListener('click', () => {
    _showToast('Voice Chronicle — coming soon.', 'info');
  });
}

/* ─────────────────────────────────────────────
   Toast
   ───────────────────────────────────────────── */

/**
 * Shows a lightweight toast notification.
 *
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function _showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none';
    document.body.appendChild(container);
  }

  const colorMap = {
    success: 'border-indigo-500/30 text-white',
    error: 'border-red-500/30 text-red-200',
    info: 'border-slate-500/30 text-slate-200',
  };
  const iconMap = { success: 'check-circle', error: 'alert-circle', info: 'info' };
  const iconColorMap = {
    success: 'text-indigo-400',
    error: 'text-red-400',
    info: 'text-slate-400',
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl border bg-zinc-900/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ${colorMap[type]}`;
  toast.innerHTML = `
    <i data-lucide="${iconMap[type]}" class="w-4 h-4 flex-shrink-0 ${iconColorMap[type]}"></i>
    <span class="text-sm font-medium">${message}</span>
  `;

  container.appendChild(toast);
  window.lucide?.createIcons?.();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(12px)';
    setTimeout(() => toast.remove(), 350);
  }, 3200);
}
