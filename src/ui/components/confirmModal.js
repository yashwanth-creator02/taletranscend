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
 * @param {boolean} [options.showFormatOptions=false] - Whether to show Markdown vs EPUB format choice
 * @param {string} [options.defaultFormat='md'] - Default selected format ('md' | 'epub')
 * @returns {Promise<boolean | { confirmed: boolean, format: string }>}
 */
export function showConfirmModal({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  subtext = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  icon = 'alert-circle',
  showFormatOptions = false,
  defaultFormat = 'md',
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
            ? `<p class="text-xs text-zinc-400 leading-relaxed mb-4 italic">${escapeHtml(subtext)}</p>`
            : '<div class="mb-4"></div>'
        }

        ${
          showFormatOptions
            ? `
          <div class="format-choice-container mb-6 text-left" role="radiogroup" aria-label="Archive Format">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Archive Format</span>
              <span id="${CONFIRM_MODAL_ID}-format-indicator" class="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md uppercase">
                ${defaultFormat.toUpperCase()} Selected
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                data-format="md"
                role="radio"
                aria-checked="${defaultFormat === 'md' ? 'true' : 'false'}"
                class="format-choice-btn p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  defaultFormat === 'md'
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-white ring-1 ring-indigo-500/30'
                    : 'border-white/8 bg-white/4 text-zinc-400 hover:text-zinc-200 hover:border-white/15 hover:bg-white/6'
                }"
              >
                <div class="flex items-center justify-between w-full">
                  <span class="text-xs font-bold text-white tracking-tight">Markdown</span>
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-indigo-300">.MD</span>
                </div>
                <p class="text-[10px] text-zinc-400 leading-snug">Plaintext archive for notes & Obsidian</p>
              </button>
              <button
                type="button"
                data-format="epub"
                role="radio"
                aria-checked="${defaultFormat === 'epub' ? 'true' : 'false'}"
                class="format-choice-btn p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  defaultFormat === 'epub'
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-white ring-1 ring-indigo-500/30'
                    : 'border-white/8 bg-white/4 text-zinc-400 hover:text-zinc-200 hover:border-white/15 hover:bg-white/6'
                }"
              >
                <div class="flex items-center justify-between w-full">
                  <span class="text-xs font-bold text-zinc-200 tracking-tight">EPUB Book</span>
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-amber-300">.EPUB</span>
                </div>
                <p class="text-[10px] text-zinc-400 leading-snug">Electronic book for Apple Books & e-readers</p>
              </button>
            </div>
          </div>
        `
            : ''
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

    let selectedFormat = defaultFormat || 'md';

    if (showFormatOptions) {
      const formatBtns = overlay.querySelectorAll('.format-choice-btn');
      const indicator = overlay.querySelector(`#${CONFIRM_MODAL_ID}-format-indicator`);

      formatBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const fmt = btn.dataset.format || 'md';
          selectedFormat = fmt;

          formatBtns.forEach((b) => {
            const isMatch = b.dataset.format === fmt;
            b.setAttribute('aria-checked', isMatch ? 'true' : 'false');
            if (isMatch) {
              b.className =
                'format-choice-btn p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 border-indigo-500/50 bg-indigo-500/15 text-white ring-1 ring-indigo-500/30';
            } else {
              b.className =
                'format-choice-btn p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 border-white/8 bg-white/4 text-zinc-400 hover:text-zinc-200 hover:border-white/15 hover:bg-white/6';
            }
          });

          if (indicator) {
            indicator.textContent = `${fmt.toUpperCase()} Selected`;
          }
        });
      });
    }

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

    confirmBtn?.addEventListener('click', () => {
      if (showFormatOptions) {
        cleanup({ confirmed: true, format: selectedFormat });
      } else {
        cleanup(true);
      }
    });
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
 * and downloading a chronicle or fragment archive, offering Markdown (.md)
 * and EPUB (.epub) format selection.
 *
 * @param {Object} [options]
 * @param {string} [options.title='Chronicle'] - Tale title
 * @param {boolean} [options.isFragment=false] - Whether downloading an individual fragment
 * @param {string} [options.fragmentTitle=''] - Fragment/chapter title
 * @param {number} [options.chapterCount=0] - Total chapters in chronicle
 * @returns {Promise<boolean | { confirmed: boolean, format: string }>}
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
      subtext: 'Choose your desired archive format below to save on your device.',
      confirmText: 'Download Fragment',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
      icon: 'download',
      showFormatOptions: true,
      defaultFormat: 'md',
    });
  }

  const subtext =
    chapterCount > 0
      ? `All ${chapterCount} fragments from <span class="text-amber-300 font-semibold font-serif">"${safeTitle}"</span> will be compiled for offline reading.`
      : `Download <span class="text-amber-300 font-semibold font-serif">"${safeTitle}"</span> for offline reading?`;

  return showConfirmModal({
    title: 'Download Chronicle?',
    message: subtext,
    subtext: 'Choose your desired archive format below to save on your device.',
    confirmText: 'Download Archive',
    cancelText: 'Cancel',
    confirmVariant: 'primary',
    icon: 'download',
    showFormatOptions: true,
    defaultFormat: 'md',
  });
}
