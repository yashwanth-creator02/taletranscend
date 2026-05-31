// src/utils/ui.utils.ts
// Shared UI utilities used across all pages.
//
// setEl and formatJoinDate are re-exported from string.utils.ts here
// so existing imports from '@/utils/ui.utils' continue to work.

export { setText, setEl, formatJoinDate } from './string.utils.js';

/* ─────────────────────────────────────────────
   Auth Timeout Guard
   ───────────────────────────────────────────── */

/**
 * Sets up a timeout guard for authentication.
 * Shows an error message inside containerId if auth does not resolve in time.
 *
 * @param containerId - The ID of the DOM element to show the error in
 * @param message - The error message to display
 * @param timeoutMs - Timeout duration in milliseconds
 * @returns The timeout ID so the caller can clearTimeout on auth success
 */
export function setupAuthTimeout(
  containerId: string,
  message: string = 'Connection timed out. Please refresh.',
  timeoutMs: number = 10000
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full text-center py-20 text-red-500">
          ${message}
        </div>
      `;
    }
  }, timeoutMs);
}

/* ─────────────────────────────────────────────
   Page Transition System
   ───────────────────────────────────────────── */

const TRANSITION_DURATION_MS = 220;

/**
 * Navigates to a URL with a smooth fade-out transition.
 * Use this instead of window.location.href = url anywhere a page change happens.
 *
 * @param url - Destination URL (relative or absolute)
 * @param delay - Optional extra delay before navigation (ms)
 */
export function navigateTo(url: string, delay = 0): void {
  const body = document.body;
  body.style.transition = `opacity ${TRANSITION_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1)`;
  body.style.opacity = '0';
  body.style.pointerEvents = 'none';
  setTimeout(() => {
    window.location.href = url;
  }, TRANSITION_DURATION_MS + delay);
}

/**
 * Hides the page body immediately on script load to prevent FOUC.
 * Call at the top of every page entry file.
 * Then call readyReveal() once auth resolves and the first render is done.
 */
export function initPageReveal(): void {
  const body = document.body;
  body.style.opacity = '0';
  body.style.transition = `opacity ${TRANSITION_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1)`;
}

/**
 * Fades the page body in smoothly.
 * Call once the page content is ready to be seen.
 */
export function readyReveal(): void {
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
}

/* ─────────────────────────────────────────────
   Debounce
   ───────────────────────────────────────────── */

/**
 * Returns a debounced version of a function.
 *
 * @param fn - Function to debounce
 * @param wait - Delay in milliseconds
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
