// src/pages/shelf/interactions.js
// All event wiring for the shelf page.
// Tab switching, filter input, sort panel, card action delegation,
// and right-rail shelf ritual buttons.

import { shelfState } from './state.js';
import {
  loadBookmarkedTales,
  loadDrafts,
  loadRecentTales,
  applyAndRender,
  computeAndRenderHeroStats,
} from './content.js';
import { setActiveTab, buildSortPanel, refreshSortPanel } from './ui.js';
import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/components/icons.js';
import {
  addToBookmarks,
  removeFromBookmarks,
  downloadChronicle,
  markTaleFinished,
} from '@services/index.js';
import { cacheService } from '@services/cache.service.js';
import { auth } from '@fb/index.js';
import { appState } from '@state/index.js';
import { debounce, navigateTo, taleUrl, createLogger } from '@/utils';

const log = createLogger('ShelfInteractions');

/* ─────────────────────────────────────────────
   Public Init
   ───────────────────────────────────────────── */

let _shelfInteractionsInitialized = false;

/**
 * Wires all shelf interactions.
 * Call once after DOMContentLoaded. Idempotent.
 */
export function initShelfInteractions() {
  if (_shelfInteractionsInitialized) return;
  _shelfInteractionsInitialized = true;

  _bindBackNavigation();
  _bindTabs();
  _bindFilter();
  _bindSort();
  _bindCardActions();
  _bindRightRail();
  buildSortPanel();
}

/**
 * Resets the initialization state (primarily for unit test isolation).
 */
export function resetShelfInteractions() {
  _shelfInteractionsInitialized = false;
}

/* ─────────────────────────────────────────────
   Back Navigation
   ───────────────────────────────────────────── */

function _bindBackNavigation() {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/library.html';
    }
  });
}

/* ─────────────────────────────────────────────
   Tabs
   ───────────────────────────────────────────── */

function _bindTabs() {
  document.querySelectorAll('.shelf-tab').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.tab;
      if (!tab || tab === shelfState.activeTab) return;

      log.info('Switching tab', { from: shelfState.activeTab, to: tab });
      shelfState.activeTab = tab;
      setActiveTab(tab);

      if (!shelfState.userId) {
        log.warn('No userId available for tab data load');
        return;
      }

      if (tab === 'bookmarked') {
        await loadBookmarkedTales(shelfState.userId);
      } else if (tab === 'drafts') {
        await loadDrafts(shelfState.userId);
        computeAndRenderHeroStats();
      } else if (tab === 'recent') {
        await loadRecentTales(shelfState.userId);
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
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      input.select();
    }
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
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
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
  const grid = document.getElementById('shelf-grid');
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
    if (card && !target.closest('.options-menu') && !target.closest('[data-action="options"]')) {
      const id = card.dataset.id;
      if (id) navigateTo(taleUrl(id));
    }
  });

  document.addEventListener('click', _closeAllMenus);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeAllMenus();
  });
}

function _setMenuOpen(menu, open, triggerBtn) {
  if (!menu) return;
  menu.hidden = !open;
  menu.classList.toggle('hidden', !open);
  const card = menu.closest('.shelf-card, [data-id]');
  card?.classList.toggle('menu-open', open);

  const btn = triggerBtn || document.querySelector(`[data-menu-id="${menu.id}"]`);
  btn?.setAttribute('aria-expanded', String(open));
}

function _toggleMenu(menuId, triggerBtn) {
  const menu = document.getElementById(menuId);
  if (!menu) return;

  const isCurrentlyOpen = !menu.hidden && !menu.classList.contains('hidden');

  _closeAllMenus();

  if (!isCurrentlyOpen) {
    _setMenuOpen(menu, true, triggerBtn);
  }
}

function _closeAllMenus() {
  document.querySelectorAll('.options-menu, .shelf-menu').forEach((m) => {
    m.hidden = true;
    m.classList.add('hidden');
    const card = m.closest('.shelf-card, [data-id]');
    card?.classList.remove('menu-open');
  });
  document.querySelectorAll('[data-action="options"]').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

async function _handleCardAction(action, id, e) {
  e.stopPropagation();

  const uid = shelfState.userId || auth.currentUser?.uid || appState?.userId;

  switch (action) {
    case 'resume':
      navigateTo(taleUrl(id));
      break;

    case 'copy-link': {
      const url = taleUrl(id, window.location.origin);
      await navigator.clipboard?.writeText(url);
      showToast('Link copied to clipboard.', 'success');
      break;
    }

    case 'download':
    case 'save-offline': {
      if (!id) break;
      await downloadChronicle(id);
      break;
    }

    case 'mark-finished': {
      if (!uid || !id) {
        showToast('Please sign in to seal chronicles.', 'warning');
        break;
      }
      try {
        await markTaleFinished({ userId: uid, taleId: id });
        cacheService.invalidateProgress(uid, id);
        cacheService.invalidateTale(id);
        cacheService.invalidateTales();

        // Update in-memory cached tales so tab switching or re-filtering preserves finished state
        const bookmarked = shelfState.bookmarkedTales.find((t) => t.id === id);
        if (bookmarked) {
          bookmarked.progress = 100;
          bookmarked.status = 'finished';
        }
        const recent = shelfState.recentTales.find((t) => t.id === id);
        if (recent) {
          recent.progress = 100;
          recent.status = 'finished';
        }
        computeAndRenderHeroStats();

        const cardEl = document.querySelector(`[data-id="${id}"]`);
        if (cardEl) {
          const sealBtn = cardEl.querySelector('[data-action="mark-finished"]');
          if (sealBtn) {
            sealBtn.dataset.action = '';
            sealBtn.classList.remove('text-zinc-300', 'hover:bg-white/10', 'hover:text-white');
            sealBtn.classList.add('opacity-40', 'text-zinc-600');
            sealBtn.innerHTML = `<i data-lucide="check-circle" class="h-4 w-4 shrink-0"></i><span>Already Sealed</span>`;
          }
          const progressFill = cardEl.querySelector('.progress-fill');
          if (progressFill) progressFill.style.width = '100%';
          const progressLabel = cardEl.querySelector('.text-indigo-300, .text-indigo-400');
          if (progressLabel) progressLabel.textContent = '100%';
        }
        showToast('Chronicle sealed in the Eternal Archives.', 'success');
        initIcons();
      } catch (err) {
        log.error('Mark finished failed on shelf:', err);
        showToast('Could not seal chronicle.', 'error');
      }
      break;
    }

    case 'couple': {
      if (!uid || !id) {
        showToast('Please sign in to add to shelf.', 'warning');
        break;
      }
      try {
        const tale = shelfState.bookmarkedTales.find((t) => t.id === id) ||
          shelfState.recentTales.find((t) => t.id === id) || { id };
        await addToBookmarks({ userId: uid, taleId: id, tale });
        showToast('Added to shelf.', 'success');
      } catch (err) {
        log.error('Couple failed on shelf:', err);
        showToast('Could not add to shelf.', 'error');
      }
      break;
    }

    case 'decouple': {
      if (!uid || !id) {
        showToast('Please sign in to manage shelf.', 'warning');
        break;
      }
      try {
        await removeFromBookmarks({ userId: uid, taleId: id });
        // Optimistic UI: remove card from DOM and cached state
        document.querySelector(`[data-id="${id}"]`)?.remove();
        shelfState.bookmarkedTales = shelfState.bookmarkedTales.filter((t) => t.id !== id);
        computeAndRenderHeroStats();
        showToast('Removed from shelf.', 'info');
      } catch (err) {
        log.error('Decouple failed:', err);
        showToast('Could not remove from shelf.', 'error');
      }
      break;
    }

    case 'delete-draft': {
      if (!uid || !id) break;
      if (!confirm('Are you sure you want to discard this draft? This cannot be undone.')) break;

      try {
        const { deleteDoc, refs } = await import('@fb/index.js');
        await deleteDoc(refs.draft(uid, id));

        // Optimistic UI: remove card from DOM and cached state
        document.querySelector(`[data-id="${id}"]`)?.remove();
        shelfState.drafts = shelfState.drafts.filter((d) => d.id !== id);
        computeAndRenderHeroStats();
        showToast('Draft discarded.', 'info');
      } catch (err) {
        log.error('Delete draft failed:', err);
        showToast('Could not discard draft.', 'error');
      }
      break;
    }

    default:
      break;
  }

  _closeAllMenus();
}

/* ─────────────────────────────────────────────
   Right Rail — shelf Rituals
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
