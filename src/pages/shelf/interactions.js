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
import { showToast } from '@ui/components/toast.js';
import { removeFromBookmarks } from '@services/index.js';
import { debounce } from '@/utils/function.utils';
import { navigateTo } from '@/utils/ui.utils';

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

  const onFilter = debounce((e) => {
    shelfState.filterQuery = e.target.value.toLowerCase();
    applyAndRender();
  }, 220);

  input.addEventListener('input', onFilter);

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

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) {
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  panel.addEventListener('click', (e) => {
    const option = e.target.closest('[data-sort]');
    if (!option) return;

    const key = option.dataset.sort;

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
   Card Actions (delegated)
   ───────────────────────────────────────────── */

function _bindCardActions() {
  const grid = document.getElementById('studio-grid');
  if (!grid) return;

  grid.addEventListener('click', async (e) => {
    const target = e.target;

    // Options button — toggle menu
    const optionsBtn = target.closest('[data-action="options"]');
    if (optionsBtn) {
      e.stopPropagation();
      _toggleMenu(optionsBtn.dataset.menuId, optionsBtn);
      return;
    }

    // Menu item action
    const menuItem = target.closest('[data-action]');
    if (menuItem) {
      const action = menuItem.dataset.action;
      const id = menuItem.dataset.id;
      await _handleCardAction(action, id, e);
      return;
    }

    // Card body click → navigate to tale
    const card = target.closest('[data-id]');
    if (card && !target.closest('.shelf-menu') && !target.closest('.shelf-options-btn')) {
      const id = card.dataset.id;
      if (id) navigateTo(`tale.html?id=${id}`);
    }
  });

  document.addEventListener('click', _closeAllMenus);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeAllMenus();
  });
}

function _toggleMenu(menuId, triggerBtn) {
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

async function _handleCardAction(action, id, e) {
  e.stopPropagation();

  switch (action) {
    case 'resume':
      navigateTo(`tale.html?id=${id}`);
      break;

    case 'copy-link': {
      const url = `${window.location.origin}/src/views/tale.html?id=${id}`;
      await navigator.clipboard?.writeText(url);
      showToast('Link copied to clipboard.', 'success');
      break;
    }

    case 'mark-finished':
      // markFinish.service.js handles this — stub until UI is wired
      showToast('Marked as finished.', 'success');
      break;

    case 'decouple': {
      // Bug fix: was only doing optimistic UI without calling the service
      if (!shelfState.userId || !id) break;
      try {
        await removeFromBookmarks({ userId: shelfState.userId, taleId: id });
        // Optimistic UI: remove card from DOM and cached state
        document.querySelector(`[data-id="${id}"]`)?.remove();
        shelfState.bookmarkedTales = shelfState.bookmarkedTales.filter((t) => t.id !== id);
        computeAndRenderHeroStats();
        showToast('Removed from shelf.', 'info');
      } catch (err) {
        console.error('[shelf] Decouple failed:', err);
        showToast('Could not remove from shelf.', 'error');
      }
      break;
    }

    default:
      break;
  }

  _closeAllMenus();
}

/* ─────────────────────────────────────────────
   Right Rail — Studio Rituals
   ───────────────────────────────────────────── */

function _bindRightRail() {
  document.getElementById('ritual-new-draft')?.addEventListener('click', () => {
    navigateTo('contribution.html');
  });

  document.getElementById('hero-new-tale-btn')?.addEventListener('click', () => {
    navigateTo('contribution.html');
  });

  document.getElementById('ritual-voice-note')?.addEventListener('click', () => {
    showToast('Voice Chronicle — coming soon.', 'info');
  });

  document.getElementById('ritual-publish')?.addEventListener('click', () => {
    navigateTo('contribution.html');
  });

  document.getElementById('hero-voice-btn')?.addEventListener('click', () => {
    showToast('Voice Chronicle — coming soon.', 'info');
  });
}
