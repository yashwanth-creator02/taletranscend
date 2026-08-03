// src/shared/components/feedback/feedback.js

import { escapeHtml } from '@/utils';
import { initIcons } from '@/shared/icons.js';

/**
 * Renders an empty state message.
 *
 * @param {HTMLElement} container - Container to render into
 * @param {Object} options - Configuration options
 * @param {string} options.message - Main message
 * @param {string} options.subMessage - Secondary message
 * @param {string} options.icon - Lucide icon name
 * @param {string} options.classes - Additional CSS classes for the container
 */
export function renderEmptyState(
  container,
  {
    message = 'No data found.',
    subMessage = '',
    icon = 'sparkles',
    classes = 'py-20 text-center',
  } = {}
) {
  if (!container) return;

  container.innerHTML = `
    <div class="${classes}">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
        <i data-lucide="${icon}" class="h-6 w-6 text-zinc-500"></i>
      </div>
      <p class="text-sm font-medium text-zinc-400">${escapeHtml(message)}</p>
      ${subMessage ? `<p class="mt-2 text-xs text-zinc-600">${escapeHtml(subMessage)}</p>` : ''}
    </div>
  `;

  initIcons(container);
}

/**
 * Renders an error state message.
 *
 * @param {HTMLElement} container - Container to render into
 * @param {Object} options - Configuration options
 * @param {string} options.message - Error message
 * @param {string} options.subMessage - Secondary message
 */
export function renderErrorState(
  container,
  { message = 'Something went wrong.', subMessage = 'Please try again later.' } = {}
) {
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full rounded-4xl border border-red-500/10 bg-red-500/5 px-6 py-16 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
        <i data-lucide="triangle-alert" class="h-6 w-6 text-red-400"></i>
      </div>
      <p class="text-sm font-medium text-red-200">${escapeHtml(message)}</p>
      <p class="mt-2 text-xs text-red-300/70">${escapeHtml(subMessage)}</p>
    </div>
  `;

  initIcons(container);
}
