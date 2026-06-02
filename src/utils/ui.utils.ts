// src/utils/ui.utils.ts
// Shared UI utilities used across all pages.

export { formatJoinDate } from './format.utils.ts';
import { escapeText } from './sanitize.utils.ts';

/* ─────────────────────────────────────────────
   Auth Timeout Guard
   ───────────────────────────────────────────── */

/**
 * Ensures the page doesn't hang indefinitely if Firebase Auth
 * fails to resolve within a reasonable window.
 *
 * @param {Function} callback - Success callback
 * @param {number} [timeout=8000] - Timeout in ms
 * @param {string} [message="The Neural Link is unstable. Please refresh."]
 */
export function setupAuthTimeout(
  callback: (user: any) => void,
  timeout = 8000,
  message = 'The Neural Link is unstable. Please refresh.'
): void {
  const timer = setTimeout(() => {
    const container = document.getElementById('auth-status-fallback');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
          ${escapeText(message)}
        </div>
      `;
    }
  }, timeout);

  // Note: Actual auth state listener should clear this timer.
  // This is just the UI-side guard.
}

/* ─────────────────────────────────────────────
   Page Reveal
   ───────────────────────────────────────────── */

/**
 * Sets initial opacity to 0 to prevent FOUC.
 * Call this immediately at the top of page entry points.
 */
export function initPageReveal(): void {
  document.documentElement.style.opacity = '0';
  document.documentElement.style.transition = `opacity 600ms cubic-bezier(0.4,0,0.2,1)`;
}

/**
 * Fades the page body in smoothly.
 * Call once the page content is ready to be seen.
 */
export function readyReveal(): void {
  requestAnimationFrame(() => {
    document.documentElement.style.opacity = '1';
  });
}
