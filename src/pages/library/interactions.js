// src/pages/library/interactions.js
// Card action handlers for the library page.
// Scope: resume, bookmark (couple/decouple), copy link, mark finished.
// Everything else (search, filters, sidebar toggle) lives in filters.js / ui.js.

import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@/ui/icons.js';
import {
  resolveResumePoint,
  addToBookmarks,
  removeFromBookmarks,
  markTaleFinished,
} from '@services/index.js';

/* ─────────────────────────────────────────────
   Card Interactions — single delegated handler
   ───────────────────────────────────────────── */

/**
 * Sets up all card interactions via a single delegated click handler on #cards-grid.
 *
 * @param {string} userId
 */
export function setupCardInteractions(userId) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.addEventListener('click', async (e) => {
    const actionEl = e.target.closest('[data-action]');
    const card = e.target.closest('.tale-card');

    if (!card || !grid.contains(card)) return;

    const taleId = card.dataset.id;
    if (!taleId) return;

    // Action button clicked
    if (actionEl && card.contains(actionEl)) {
      e.stopPropagation();
      const action = actionEl.dataset.action;

      switch (action) {
        case 'options':
          _toggleMenu(actionEl.dataset.menuId);
          return;

        case 'resume':
          await _handleResume(userId, taleId);
          return;

        case 'copy-link':
          _handleCopyLink(taleId);
          return;

        case 'mark-finished':
          if (actionEl.hasAttribute('disabled')) return;
          _confirmMarkFinished(() => _handleMarkFinished(userId, taleId));
          return;

        case 'couple':
          await _handleCouple(userId, taleId, actionEl);
          return;

        case 'decouple':
          await _handleDecouple(userId, taleId, actionEl);
          return;

        default:
          return;
      }
    }

    // Card body click → tale detail page
    if (!e.target.closest('.options-menu')) {
      window.location.assign(`tale.html?id=${encodeURIComponent(taleId)}`);
    }
  });

  // Close menus on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.options-menu') && !e.target.closest('[data-action="options"]')) {
      _closeAllMenus();
    }
  });

  // Escape closes open menus
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeAllMenus();
  });
}

/* ─────────────────────────────────────────────
   Handlers
   ───────────────────────────────────────────── */

async function _handleResume(userId, taleId) {
  try {
    const resume = await resolveResumePoint({ userId, taleId });
    const chapterId = resume?.chapterIndex ?? 0;
    window.location.assign(
      `reader.html?taleId=${encodeURIComponent(taleId)}&chapterId=${chapterId}`
    );
  } catch (err) {
    console.error('[library] Resume failed:', err);
  }
}

function _handleCopyLink(taleId) {
  const url = `${window.location.origin}/tale.html?id=${encodeURIComponent(taleId)}`;
  const modal = document.getElementById('copy-link-modal');
  const input = document.getElementById('copy-link-input');
  if (!modal || !input) return;

  input.value = url;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const close = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  document.getElementById('copy-link-confirm').onclick = async () => {
    await navigator.clipboard.writeText(url);
    close();
    showToast('Link copied.', 'success');
  };

  document.getElementById('copy-link-close').onclick = close;
}

function _confirmMarkFinished(onConfirm) {
  const modal = document.getElementById('confirm-modal');
  const cancel = document.getElementById('confirm-cancel');
  const accept = document.getElementById('confirm-accept');
  if (!modal || !cancel || !accept) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const cleanup = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    cancel.onclick = null;
    accept.onclick = null;
  };

  cancel.onclick = cleanup;
  accept.onclick = async () => {
    cleanup();
    try {
      await onConfirm();
    } catch (err) {
      console.error('[library] Mark finished:', err);
    }
  };
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
  } catch (err) {
    console.error('[library] Couple failed:', err);
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
  } catch (err) {
    console.error('[library] Decouple failed:', err);
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

  // Close all others first
  document.querySelectorAll('.options-menu:not(.hidden)').forEach((m) => {
    if (m !== menu) m.classList.add('hidden');
  });

  menu.classList.toggle('hidden');
}

function _closeAllMenus() {
  document.querySelectorAll('.options-menu:not(.hidden)').forEach((m) => m.classList.add('hidden'));
}
