// src/pages/library/interactions.js
// Card action handlers for the library page.
// Scope: resume, bookmark (couple/decouple), copy link, mark finished.
// Everything else (search, filters, sidebar toggle) lives in filters.js / ui.js.

import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/components/icons.js';
import { navigateTo, taleUrl, readerUrl, createLogger } from '@/utils';

const log = createLogger('LibraryInteractions');
log.debug('Module initialized');
import {
  resolveResumePoint,
  addToBookmarks,
  removeFromBookmarks,
  markTaleFinished,
  downloadChronicle,
} from '@services/index.js';

/* ─────────────────────────────────────────────
   Card Interactions — single delegated handler
   ───────────────────────────────────────────── */

let _activeUserId = null;
let _lastBoundGrid = null;

/**
 * Sets up all card interactions via a single delegated click handler on #cards-grid.
 *
 * @param {string} userId
 */
export function setupCardInteractions(userId) {
  _activeUserId = userId;
  const grid = document.getElementById('cards-grid');
  if (!grid || _lastBoundGrid === grid) return;
  _lastBoundGrid = grid;

  grid.addEventListener('click', async (e) => {
    const actionEl = e.target.closest('[data-action]');
    const card = e.target.closest('.tale-card');

    if (!card || !grid.contains(card)) return;

    const taleId = card.dataset.id;
    if (!taleId) return;

    if (actionEl && card.contains(actionEl)) {
      e.stopPropagation();

      switch (actionEl.dataset.action) {
        case 'options':
          _toggleMenu(actionEl.dataset.menuId);
          return;

        case 'resume':
          await _handleResume(_activeUserId, taleId);
          return;

        case 'copy-link':
          _handleCopyLink(taleId);
          return;

        case 'download':
        case 'save-offline':
          await downloadChronicle(taleId);
          return;

        case 'mark-finished':
          if (actionEl.hasAttribute('disabled')) return;
          _confirmMarkFinished(() => _handleMarkFinished(_activeUserId, taleId));
          return;

        case 'couple':
          await _handleCouple(_activeUserId, taleId, actionEl);
          return;

        case 'decouple':
          await _handleDecouple(_activeUserId, taleId, actionEl);
          return;

        default:
          return;
      }
    }

    // Card body click → tale detail page
    if (!e.target.closest('.options-menu') && !e.target.closest('[data-action="options"]')) {
      navigateTo(taleUrl(taleId));
    }
  });

  // Close menus on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.options-menu') && !e.target.closest('[data-action="options"]')) {
      _closeAllMenus();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeAllMenus();
  });
}

/* ─────────────────────────────────────────────
   Handlers
   ───────────────────────────────────────────── */

async function _handleResume(userId, taleId) {
  log.info('Resume requested', { taleId });
  try {
    const resume = await resolveResumePoint({ userId, taleId });
    const chapterId = resume?.chapterIndex ?? 0;
    log.info('Resume point resolved', { chapterId });
    navigateTo(readerUrl(taleId, chapterId));
  } catch (err) {
    log.error('Resume failed:', err);
  }
}

function _handleCopyLink(taleId) {
  log.info('Copy link requested', { taleId });
  // Use resolveHref for cross-environment compatibility
  const url = taleUrl(taleId, window.location.origin);
  log.debug('Link built', { url });
  const modal = document.getElementById('copy-link-modal');
  const input = document.getElementById('copy-link-input');
  if (!modal || !input) return;

  const previousActiveElement = document.activeElement;
  input.value = url;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  window.requestAnimationFrame(() => {
    input.focus();
    input.select();
  });

  const confirmBtn = document.getElementById('copy-link-confirm');
  const closeBtn = document.getElementById('copy-link-close');

  const close = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.removeEventListener('keydown', onModalKeydown);
    confirmBtn?.removeEventListener('click', onConfirm);
    closeBtn?.removeEventListener('click', close);
    if (previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus();
    }
  };

  const onConfirm = async () => {
    await navigator.clipboard.writeText(url);
    close();
    showToast('Link copied.', 'success');
  };

  const onModalKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      input.select();
    }

    if (e.key === 'Tab') {
      const focusables = Array.from(
        modal.querySelectorAll('button:not([disabled]), input:not([disabled])')
      ).filter((el) => el instanceof HTMLElement && el.offsetParent !== null);

      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
  };

  modal.addEventListener('keydown', onModalKeydown);
  confirmBtn?.addEventListener('click', onConfirm);
  closeBtn?.addEventListener('click', close);
}

function _confirmMarkFinished(onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const cancel = document.getElementById('confirm-cancel');
  const accept = document.getElementById('confirm-accept');
  if (!modal || !cancel || !accept) return;

  const previousActiveElement = document.activeElement;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  window.requestAnimationFrame(() => {
    accept.focus();
  });

  const cleanup = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    cancel.removeEventListener('click', onCancel);
    accept.removeEventListener('click', onAccept);
    modal.removeEventListener('keydown', onModalKeydown);
    if (previousActiveElement instanceof HTMLElement) {
      previousActiveElement.focus();
    }
  };

  const onCancel = () => cleanup();
  const onAccept = async () => {
    cleanup();
    try {
      await onConfirm();
    } catch (err) {
      log.error('Mark finished:', err);
    }
  };

  const onModalKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onAccept();
      return;
    }

    if (e.key === 'Tab') {
      const focusables = [accept, cancel].filter((el) => el.offsetParent !== null);
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
  };

  modal.addEventListener('keydown', onModalKeydown);
  cancel.addEventListener('click', onCancel);
  accept.addEventListener('click', onAccept);
}

async function _handleMarkFinished(userId, taleId) {
  await markTaleFinished({ userId, taleId });
  _closeAllMenus();
  initIcons();
}

async function _handleCouple(userId, taleId, btn) {
  btn.setAttribute('disabled', 'true');
  try {
    await addToBookmarks({ userId, taleId });
    btn.dataset.action = 'decouple';
    btn.innerHTML = `<i data-lucide="bookmark-minus" class="w-3.5 h-3.5"></i> Remove from shelf`;
    btn.classList.remove('text-emerald-400', 'hover:bg-emerald-500/20');
    btn.classList.add('text-red-400', 'hover:bg-red-500/20');
    initIcons();
    _closeAllMenus();
    showToast('Added to shelf.', 'success');
  } catch (err) {
    log.error('Couple failed:', err);
    showToast('Could not add to shelf.', 'error');
  } finally {
    btn.removeAttribute('disabled');
  }
}

async function _handleDecouple(userId, taleId, btn) {
  btn.setAttribute('disabled', 'true');
  try {
    await removeFromBookmarks({ userId, taleId });
    btn.dataset.action = 'couple';
    btn.innerHTML = `<i data-lucide="bookmark-plus" class="w-3.5 h-3.5"></i> Add to shelf`;
    btn.classList.remove('text-red-400', 'hover:bg-red-500/20');
    btn.classList.add('text-emerald-400', 'hover:bg-emerald-500/20');
    initIcons();
    _closeAllMenus();
    showToast('Removed from shelf.', 'info');
  } catch (err) {
    log.error('Decouple failed:', err);
    showToast('Could not remove from shelf.', 'error');
  } finally {
    btn.removeAttribute('disabled');
  }
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function _toggleMenu(menuId) {
  if (!menuId) return;
  const menu = document.getElementById(menuId);
  if (!menu) return;

  const card = menu.closest('.tale-card');
  const willOpen = menu.classList.contains('hidden');

  _closeAllMenus();

  if (willOpen) {
    menu.classList.remove('hidden');
    card?.classList.add('menu-open');
  }
}

function _closeAllMenus() {
  document.querySelectorAll('.options-menu:not(.hidden)').forEach((m) => {
    m.classList.add('hidden');
  });
  document.querySelectorAll('.tale-card.menu-open').forEach((c) => {
    c.classList.remove('menu-open');
  });
}
