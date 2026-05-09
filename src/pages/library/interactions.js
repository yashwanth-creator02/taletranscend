// src/pages/library/interactions.js
// All interaction handlers for the library page tale cards.
// Uses event delegation for efficient click handling across the card grid.

import {
  resolveResumePoint,
  addToBookmarks,
  removeFromBookmarks,
  markTaleFinished,
} from '@services/index.js';

/* ==================== CARD INTERACTIONS (SINGLE ENTRY) ==================== */

/**
 * Sets up ALL interactions for tale cards using ONE delegated click handler.
 *
 * @param {string} userId - Current user ID
 */
export function setupCardInteractions(userId) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  grid.addEventListener('click', async (e) => {
    try {
      const actionEl = e.target.closest('[data-action]');
      const card = e.target.closest('.tale-card');

      // Click not related to a card
      if (!card || !grid.contains(card)) return;

      const taleId = card.dataset?.id;
      if (!taleId) return;

      /* ================= ACTION ROUTING ================= */

      if (actionEl && card.contains(actionEl)) {
        const action = actionEl.dataset?.action;
        if (!action) return;

        e.stopPropagation();

        switch (action) {
          case 'options':
            handleOptionsToggle(actionEl);
            return;

          case 'resume':
            await handleResume(userId, taleId);
            return;

          case 'copy-link':
            e.stopPropagation();
            handleCopyLink(taleId);
            return;

          case 'mark-finished':
            if (actionEl.hasAttribute('disabled')) return;
            confirmMarkFinished(() => handleMarkFinished(userId, taleId));
            return;

          case 'couple':
            await handleCouple(userId, taleId, actionEl);
            return;

          case 'decouple':
            await handleDecouple(userId, taleId, actionEl);
            return;

          default:
            return;
        }
      }

      /* ================= CARD NAVIGATION ================= */

      window.location.assign(`tale.html?id=${encodeURIComponent(taleId)}`);
    } catch (err) {
      console.error('Card interaction failed:', err);
    }
  });

  /* ================= OUTSIDE CLICK (MENU CLOSE) ================= */

  document.addEventListener('click', (e) => {
    if (e.target.closest('.options-menu') || e.target.closest('[data-action="options"]')) {
      return;
    }

    closeAllMenus();
  });
}

/* ==================== HANDLERS ==================== */

function handleOptionsToggle(btn) {
  if (!btn) return;

  const menuId = btn.dataset?.menuId;
  if (!menuId) return;

  const menu = document.getElementById(menuId);
  if (!menu) return;

  document.querySelectorAll('.options-menu:not(.hidden)').forEach((m) => {
    if (m !== menu) m.classList.add('hidden');
  });

  menu.classList.toggle('hidden');
}

async function handleResume(userId, taleId) {
  if (!userId || !taleId) return;

  try {
    const resume = await resolveResumePoint({ userId, taleId });

    const chapterId = resume?.chapterIndex != null ? resume.chapterIndex : 0;

    window.location.assign(
      `reader.html?taleId=${encodeURIComponent(taleId)}&chapterId=${chapterId}`
    );
  } catch (err) {
    console.error('Resume failed:', err);
  }
}

function handleCopyLink(taleId) {
  const url = `${window.location.origin}/pages/tale.html?id=${encodeURIComponent(taleId)}`;

  const modal = document.getElementById('copy-link-modal');
  const input = document.getElementById('copy-link-input');

  if (!modal || !input) return;

  input.value = url;
  modal.classList.remove('hidden');

  document.getElementById('copy-link-confirm').onclick = async () => {
    await navigator.clipboard.writeText(url);
    modal.classList.add('hidden');
  };

  document.getElementById('copy-link-close').onclick = () => {
    modal.classList.add('hidden');
  };
}

function confirmMarkFinished(onConfirm) {
  if (typeof onConfirm !== 'function') return;

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
      console.error('Mark finished failed:', err);
    }
  };
}

async function handleMarkFinished(userId, taleId) {
  if (!userId || !taleId) return;

  try {
    await markTaleFinished({ userId, taleId });
    closeAllMenus();
    reinitIcons();
  } catch (err) {
    console.error('Mark finished service error:', err);
  }
}

async function handleCouple(userId, taleId, btn) {
  if (!userId || !taleId || !btn) return;

  btn.setAttribute('disabled', 'true');

  try {
    await addToBookmarks({ userId, taleId });

    btn.dataset.action = 'decouple';
    btn.innerHTML = `
      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      Decouple Fragment
    `;
    btn.classList.remove('text-emerald-400', 'hover:bg-emerald-500/20');
    btn.classList.add('text-red-400', 'hover:bg-red-500/20');

    reinitIcons();
    closeAllMenus();
  } catch (err) {
    console.error('Couple failed:', err);
  } finally {
    btn.removeAttribute('disabled');
  }
}

async function handleDecouple(userId, taleId, btn) {
  if (!userId || !taleId || !btn) return;

  btn.setAttribute('disabled', 'true');

  try {
    await removeFromBookmarks({ userId, taleId });

    btn.dataset.action = 'couple';
    btn.innerHTML = `
      <i data-lucide="link" class="w-3.5 h-3.5"></i>
      Couple Fragment
    `;
    btn.classList.remove('text-red-400', 'hover:bg-red-500/20');
    btn.classList.add('text-emerald-400', 'hover:bg-emerald-500/20');

    reinitIcons();
    closeAllMenus();
  } catch (err) {
    console.error('Decouple failed:', err);
  } finally {
    btn.removeAttribute('disabled');
  }
}

/* ==================== HELPERS ==================== */

function closeAllMenus() {
  document.querySelectorAll('.options-menu:not(.hidden)').forEach((m) => m.classList.add('hidden'));
}

function reinitIcons() {
  if (window?.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

/* ==================== SEARCH ==================== */

export function setupSearch(getAllTales, onFilter, initIcons) {
  const input = document.getElementById('search-input');
  if (!input || typeof getAllTales !== 'function') return;

  input.addEventListener('input', async (e) => {
    try {
      const term = (e.target.value || '').toLowerCase();

      const tales = getAllTales() || [];
      const filtered = tales.filter((t) =>
        [t?.title, t?.description, t?.era].some((v) => v?.toLowerCase().includes(term))
      );

      if (typeof onFilter === 'function') {
        await onFilter(filtered);
      }

      if (typeof initIcons === 'function') {
        initIcons();
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  });
}

/* ==================== SIDEBAR TOGGLE ==================== */

export function setupSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-sidebar');

  if (!sidebar || !toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}
