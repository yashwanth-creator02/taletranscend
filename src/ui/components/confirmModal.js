// src/ui/components/confirmModal.js
/**
 * Accessible Glassmorphic Confirmation Modal.
 *
 * Provides generic confirmation dialogs and specific tale download confirmations.
 * Adheres strictly to token discipline and accessibility standards (WAI-ARIA modal dialog).
 */

import { escapeHtml } from '@/utils';
import { initIcons } from '@/ui/icons.js';

export const CONFIRM_MODAL_ID = 'tt-confirm-modal';

/**
 * Shows an accessible confirmation modal dialog and returns a Promise resolving
 * to true (confirmed) or false (cancelled / dismissed).
 *
 * @param {Object} options
 * @param {string} [options.title='Confirm Action'] - Dialog heading
 * @param {string} [options.message='Are you sure you want to proceed?'] - Main description (safe HTML or text)
 * @param {string} [options.subtext=''] - Optional secondary text or caveat
 * @param {string} [options.confirmText='Confirm'] - Confirmation button label
 * @param {string} [options.cancelText='Cancel'] - Cancel button label
 * @param {string} [options.confirmVariant='primary'] - 'primary' | 'danger' | 'accent' | 'mythic'
 * @param {string} [options.icon='alert-circle'] - Lucide icon name
 * @returns {Promise<boolean>}
 */
export function showConfirmModal({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  subtext = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  icon = 'alert-circle',
} = {}) {
  return new Promise((resolve) => {
    // Dismiss any existing confirmation modal
    const existing = document.getElementById(CONFIRM_MODAL_ID);
    if (existing) {
      existing.remove();
    }

    const previousActiveElement = document.activeElement;

    // Overlay container
    const overlay = document.createElement('div');
    overlay.id = CONFIRM_MODAL_ID;
    overlay.className = 'modal-overlay flex';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', `${CONFIRM_MODAL_ID}-title`);
    overlay.setAttribute('aria-describedby', `${CONFIRM_MODAL_ID}-desc`);

    const variantBtnClass =
      confirmVariant === 'danger'
        ? 'btn-danger'
        : confirmVariant === 'mythic'
          ? 'btn-mythic'
          : confirmVariant === 'accent'
            ? 'btn-accent'
            : 'btn-primary';

    const iconColorClass =
      confirmVariant === 'danger'
        ? 'text-red-400 bg-red-500/10 border-red-500/20'
        : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

    overlay.innerHTML = `
      <div
        class="modal-card relative mx-4 text-center select-none"
        tabindex="-1"
      >
        <button
          type="button"
          class="confirm-modal-close absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          aria-label="Close dialog"
        >
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="w-14 h-14 ${iconColorClass} rounded-2xl border flex items-center justify-center mx-auto mb-5">
          <i data-lucide="${escapeHtml(icon)}" class="w-7 h-7"></i>
        </div>

        <h3
          id="${CONFIRM_MODAL_ID}-title"
          class="text-lg sm:text-xl font-cinzel font-bold text-white uppercase tracking-tight mb-2"
        >
          ${escapeHtml(title)}
        </h3>

        <div
          id="${CONFIRM_MODAL_ID}-desc"
          class="text-sm text-zinc-300 leading-relaxed mb-2"
        >
          ${message}
        </div>

        ${
          subtext
            ? `<p class="text-xs text-zinc-400 leading-relaxed mb-6 italic">${escapeHtml(subtext)}</p>`
            : '<div class="mb-6"></div>'
        }

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            class="confirm-modal-cancel w-full sm:w-1/2 btn btn-ghost py-3 rounded-xl text-xs font-bold uppercase tracking-wider order-2 sm:order-1"
          >
            ${escapeHtml(cancelText)}
          </button>
          <button
            type="button"
            class="confirm-modal-confirm w-full sm:w-1/2 btn ${variantBtnClass} h-12 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg order-1 sm:order-2"
          >
            ${escapeHtml(confirmText)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    initIcons(overlay);

    const confirmBtn = overlay.querySelector('.confirm-modal-confirm');
    const cancelBtn = overlay.querySelector('.confirm-modal-cancel');
    const closeBtn = overlay.querySelector('.confirm-modal-close');

    // Focus confirm button for quick keyboard interaction
    requestAnimationFrame(() => {
      confirmBtn?.focus();
    });

    let settled = false;

    const cleanup = (confirmed) => {
      if (settled) return;
      settled = true;

      document.removeEventListener('keydown', handleKeydown);
      overlay.remove();

      if (
        previousActiveElement instanceof HTMLElement &&
        document.body.contains(previousActiveElement)
      ) {
        previousActiveElement.focus();
      }

      resolve(confirmed);
    };

    // Close on backdrop click (clicking overlay outside the modal card)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });

    confirmBtn?.addEventListener('click', () => cleanup(true));
    cancelBtn?.addEventListener('click', () => cleanup(false));
    closeBtn?.addEventListener('click', () => cleanup(false));

    // Keyboard trap & shortcuts (Esc to cancel)
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
        return;
      }

      if (e.key === 'Tab') {
        const focusable = overlay.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);
  });
}

/**
 * Displays a specialized download confirmation popup before compiling
 * and downloading a chronicle or fragment archive.
 *
 * @param {Object} [options]
 * @param {string} [options.title='Chronicle'] - Tale title
 * @param {boolean} [options.isFragment=false] - Whether downloading an individual fragment
 * @param {string} [options.fragmentTitle=''] - Fragment/chapter title
 * @param {number} [options.chapterCount=0] - Total chapters in chronicle
 * @returns {Promise<boolean>}
 */
export async function confirmTaleDownload({
  title = 'Chronicle',
  isFragment = false,
  fragmentTitle = '',
  chapterCount = 0,
} = {}) {
  const safeTitle = escapeHtml(title || 'Chronicle');

  if (isFragment) {
    const safeFrag = escapeHtml(fragmentTitle || 'Fragment');
    return showConfirmModal({
      title: 'Download Fragment?',
      message: `Download <span class="text-amber-300 font-semibold font-serif">"${safeFrag}"</span> from <span class="text-white font-medium">${safeTitle}</span>?`,
      subtext:
        'The scroll will be compiled into a Markdown archive (.md) and saved to your device.',
      confirmText: 'Download Fragment',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
      icon: 'download',
    });
  }

  const subtext =
    chapterCount > 0
      ? `All ${chapterCount} fragments will be compiled into a Markdown archive (.md) and stored offline.`
      : 'The entire chronicle will be compiled into a Markdown archive (.md) and stored offline.';

  return showConfirmModal({
    title: 'Download Chronicle?',
    message: `Download <span class="text-amber-300 font-semibold font-serif">"${safeTitle}"</span> for offline reading?`,
    subtext,
    confirmText: 'Download Archive',
    cancelText: 'Cancel',
    confirmVariant: 'primary',
    icon: 'download',
  });
}
