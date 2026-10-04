// src/ui/components/toast.js
/**
 * Centralized Mythic Notification System.
 * Provides high-fidelity glassmorphic toasts with smooth entrance/exit,
 * countdown progress bar, pause-on-hover, action buttons, mobile swipe gestures,
 * and queue management.
 */

import { initIcons } from '@/ui/icons.js';
import { escapeText } from '@/utils';

const TOAST_DURATION = 4000;
const TOAST_CONTAINER_ID = 'mythic-toast-hub';
const MAX_ACTIVE_TOASTS = 4;

/**
 * Ensures the toast container exists on the page and has appropriate accessibility attributes.
 * @returns {HTMLElement}
 */
function _getContainer() {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    // Check if any legacy container placeholder exists to adopt it
    const legacy =
      document.getElementById('reader-toast-container') ||
      document.getElementById('toast-container');
    if (legacy) {
      legacy.id = TOAST_CONTAINER_ID;
      container = legacy;
    } else {
      container = document.createElement('div');
      container.id = TOAST_CONTAINER_ID;
      document.body.appendChild(container);
    }
  }

  // Ensure styling and ARIA attributes
  if (!container.classList.contains('toast-region')) {
    container.className =
      'toast-region fixed top-20 right-6 z-[999] flex flex-col gap-3 pointer-events-none w-full max-w-[340px] md:max-w-[380px]';
  }
  if (!container.getAttribute('role')) {
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notifications');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
  }

  return container;
}

/**
 * Enforces the maximum number of simultaneously active toasts.
 * Older toasts are dismissed gracefully.
 * @param {HTMLElement} container
 */
function _enforceLimit(container) {
  const activeToasts = Array.from(container.children).filter(
    (el) => !el.classList.contains('toast-dismissing')
  );

  if (activeToasts.length >= MAX_ACTIVE_TOASTS) {
    const excess = activeToasts.length - MAX_ACTIVE_TOASTS + 1;
    for (let i = 0; i < excess; i++) {
      const oldest = activeToasts[i];
      if (oldest && typeof oldest._dismissToast === 'function') {
        oldest._dismissToast();
      }
    }
  }
}

/**
 * Displays a mythic toast notification.
 *
 * @param {string} message - The message to display
 * @param {'success' | 'error' | 'info' | 'warning' | object} [typeOrOptions='success'] - Tone of the notification or options object
 * @param {object} [extraOptions={}] - Additional options when type is passed as string
 * @returns {HTMLElement} The created toast element
 */
export function showToast(message, typeOrOptions = 'success', extraOptions = {}) {
  let type = 'success';
  let options = {};

  if (typeof typeOrOptions === 'string') {
    type = typeOrOptions;
    options = extraOptions || {};
  } else if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
    options = typeOrOptions;
    type = options.type || 'success';
  }

  const container = _getContainer();
  _enforceLimit(container);

  // Prevent duplicate concurrent toasts with identical message
  const existingToast = Array.from(container.children).find(
    (el) =>
      !el.classList.contains('toast-dismissing') &&
      el.querySelector('.toast-card__message')?.textContent?.trim() === String(message).trim()
  );
  if (existingToast) {
    return existingToast;
  }

  const duration =
    options.duration !== undefined ? options.duration : options.persistent ? 0 : TOAST_DURATION;

  const colorMap = {
    success: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5 toast-card--success',
    error: 'border-rose-500/20 text-rose-400 bg-rose-500/5 toast-card--error',
    info: 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5 toast-card--info',
    warning: 'border-amber-500/20 text-amber-400 bg-amber-500/5 toast-card--warning',
  };

  const iconMap = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'sparkles',
    warning: 'alert-triangle',
  };

  const safeType = colorMap[type] ? type : 'info';

  const toast = document.createElement('div');
  toast.className = `
    toast-card
    flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-2xl shadow-2xl
    pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
    opacity-0 translate-x-12 scale-95
    ${colorMap[safeType]}
  `;

  let actionHtml = '';
  if (options.action && options.action.label) {
    actionHtml = `
      <button class="toast-card__action-btn" type="button">
        ${escapeText(options.action.label)}
      </button>
    `;
  }

  const progressBarHtml =
    duration > 0
      ? `
    <div class="toast-card__progress-track" aria-hidden="true">
      <div class="toast-card__progress-bar"></div>
    </div>
  `
      : '';

  toast.innerHTML = `
    <div class="toast-card__icon-badge shrink-0">
      <i data-lucide="${iconMap[safeType]}" class="w-4 h-4"></i>
    </div>
    <div class="toast-card__content flex-1 min-w-0">
      ${options.title ? `<div class="toast-card__title">${escapeText(options.title)}</div>` : ''}
      <p class="toast-card__message text-[13px] font-bold tracking-wide leading-tight">${escapeText(message)}</p>
    </div>
    <div class="toast-card__actions shrink-0">
      ${actionHtml}
      <button class="toast-card__close-btn shrink-0 opacity-40 hover:opacity-100 transition-opacity" aria-label="Dismiss" type="button">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    </div>
    ${progressBarHtml}
  `;

  // Entrance
  container.appendChild(toast);
  initIcons(toast);

  // Trigger smooth reveal
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-x-12', 'scale-95');
  });

  const progressBar = toast.querySelector('.toast-card__progress-bar');
  if (progressBar && duration > 0) {
    progressBar.style.animation = `toastCountdown ${duration}ms linear forwards`;
  }

  // Dismiss handling
  let isDismissing = false;
  let remaining = duration;
  let startTime = Date.now();
  let dismissTimeout = null;
  let isPaused = false;

  const dismiss = () => {
    if (isDismissing) return;
    isDismissing = true;
    if (dismissTimeout) clearTimeout(dismissTimeout);

    // Measure height for smooth accordion collapse
    const initialHeight = toast.offsetHeight;
    if (initialHeight > 0) {
      toast.style.maxHeight = `${initialHeight}px`;
    }
    // Force reflow
    void toast.offsetHeight;

    // Both opacity-0 (for test assertions and visual fade) and toast-dismissing (for collapse)
    toast.classList.add('opacity-0', 'translate-x-8', 'scale-95', 'toast-dismissing');
    toast.style.maxHeight = '0px';

    if (typeof options.onDismiss === 'function') {
      try {
        options.onDismiss();
      } catch (err) {
        console.error('Error in toast onDismiss callback:', err);
      }
    }

    setTimeout(() => {
      toast.remove();
    }, 700);
  };

  toast._dismissToast = dismiss;

  // Timer controls for countdown and pause-on-hover
  const startTimer = () => {
    if (duration <= 0 || isDismissing) return;
    startTime = Date.now();
    dismissTimeout = setTimeout(dismiss, remaining);
  };

  const pauseTimer = () => {
    if (isDismissing || isPaused || duration <= 0) return;
    isPaused = true;
    if (dismissTimeout) clearTimeout(dismissTimeout);
    remaining = Math.max(0, remaining - (Date.now() - startTime));
    if (progressBar) {
      progressBar.style.animationPlayState = 'paused';
    }
  };

  const resumeTimer = () => {
    if (isDismissing || !isPaused || duration <= 0) return;
    isPaused = false;
    if (progressBar) {
      progressBar.style.animationPlayState = 'running';
    }
    startTimer();
  };

  if (duration > 0) {
    startTimer();

    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', resumeTimer);
    toast.addEventListener('focusin', pauseTimer);
    toast.addEventListener('focusout', resumeTimer);
  }

  // Close button
  const closeBtn = toast.querySelector('.toast-card__close-btn');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });

  // Action button
  if (options.action && typeof options.action.onClick === 'function') {
    const actionBtn = toast.querySelector('.toast-card__action-btn');
    actionBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        options.action.onClick(e);
      } catch (err) {
        console.error('Error in toast action click handler:', err);
      }
      dismiss();
    });
  }

  // Touch gesture (swipe to dismiss)
  let touchStartX = 0;
  let touchStartY = 0;
  let deltaX = 0;
  let isSwiping = false;

  toast.addEventListener(
    'touchstart',
    (e) => {
      if (!e.touches || e.touches.length !== 1 || isDismissing) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      deltaX = 0;
      isSwiping = false;
      pauseTimer();
    },
    { passive: true }
  );

  toast.addEventListener(
    'touchmove',
    (e) => {
      if (!e.touches || e.touches.length !== 1 || isDismissing) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      deltaX = currentX - touchStartX;
      const deltaY = currentY - touchStartY;

      if (!isSwiping && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isSwiping = true;
      }

      if (isSwiping) {
        toast.style.transform = `translateX(${deltaX}px)`;
        toast.style.opacity = `${Math.max(0.2, 1 - Math.abs(deltaX) / 300)}`;
      }
    },
    { passive: true }
  );

  toast.addEventListener('touchend', () => {
    if (!isSwiping) {
      resumeTimer();
      return;
    }
    isSwiping = false;
    if (Math.abs(deltaX) > 75) {
      toast.style.transform = `translateX(${deltaX > 0 ? '120%' : '-120%'})`;
      dismiss();
    } else {
      toast.style.transform = '';
      toast.style.opacity = '';
      resumeTimer();
    }
  });

  toast.addEventListener('touchcancel', () => {
    if (isSwiping) {
      isSwiping = false;
      toast.style.transform = '';
      toast.style.opacity = '';
    }
    resumeTimer();
  });

  return toast;
}

// Shorthand helpers
showToast.success = (message, options) =>
  showToast(message, typeof options === 'object' ? { ...options, type: 'success' } : 'success');

showToast.error = (message, options) =>
  showToast(message, typeof options === 'object' ? { ...options, type: 'error' } : 'error');

showToast.warning = (message, options) =>
  showToast(message, typeof options === 'object' ? { ...options, type: 'warning' } : 'warning');

showToast.info = (message, options) =>
  showToast(message, typeof options === 'object' ? { ...options, type: 'info' } : 'info');

showToast.dismiss = (toastElement) => {
  if (toastElement && typeof toastElement._dismissToast === 'function') {
    toastElement._dismissToast();
  }
};

showToast.clear = () => {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) return;
  Array.from(container.children).forEach((toast) => {
    if (typeof toast._dismissToast === 'function') {
      toast._dismissToast();
    }
  });
};

showToast.dismissAll = showToast.clear;
