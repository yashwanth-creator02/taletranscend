// src/ui/components/toast.js
/**
 * Centralized Mythic Notification System.
 * Provides high-fidelity glassmorphic toasts with smooth entrance/exit.
 */

import { initIcons } from '@/ui/icons.js';

const TOAST_DURATION = 4000;
const TOAST_CONTAINER_ID = 'mythic-toast-hub';

/**
 * Ensures the toast container exists on the page.
 * @returns {HTMLElement}
 */
function _getContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    // Standard position: top-right, clear of nav but prominent
    container.className =
      'fixed top-20 right-6 z-[999] flex flex-col gap-3 pointer-events-none w-full max-w-[340px] md:max-w-[380px]';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Displays a mythic toast notification.
 *
 * @param {string} message - The message to display
 * @param {'success' | 'error' | 'info' | 'warning'} type - Tone of the notification
 */
export function showToast(message, type = 'success') {
  const container = _getContainer();

  const colorMap = {
    success: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5',
    error: 'border-rose-500/20 text-rose-400 bg-rose-500/5',
    info: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5',
    warning: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
  };

  const iconMap = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'sparkles',
    warning: 'alert-triangle',
  };

  const toast = document.createElement('div');
  // High-fidelity styling: Glassmorphism + Glow + Transition states
  toast.className = `
    flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-2xl shadow-2xl 
    pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
    opacity-0 translate-x-12 scale-95
    ${colorMap[type]}
  `;

  toast.innerHTML = `
    <div class="flex-shrink-0">
      <i data-lucide="${iconMap[type]}" class="w-5 h-5"></i>
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-[13px] font-bold tracking-wide leading-tight">${message}</p>
    </div>
    <button class="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity" aria-label="Dismiss">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;

  // Entrance
  container.appendChild(toast);
  initIcons(toast);

  // Trigger smooth reveal
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-x-12', 'scale-95');
  });

  // Auto-dismiss logic
  const dismiss = () => {
    toast.classList.add('opacity-0', 'translate-x-8', 'scale-95');
    setTimeout(() => {
      toast.remove();
      // Clean up container if empty
      if (container.children.length === 0) {
        // We could remove it, but keeping it is fine.
      }
    }, 700);
  };

  const dismissTimeout = setTimeout(dismiss, TOAST_DURATION);

  // Manual dismiss
  toast.querySelector('button')?.addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    dismiss();
  });
}
