// src/utils/ui.utils.ts
// Shared UI utilities used across all pages.

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
 * Use this instead of `window.location.href = url` or
 * `window.location.assign(url)` anywhere a page change happens.
 *
 * The body fades to opacity 0 over TRANSITION_DURATION_MS milliseconds,
 * then navigation fires. The destination page fades back in via the
 * .page-fade-in class applied to <body> in each HTML file.
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
 * Makes the page body invisible immediately on script load,
 * then reveals it smoothly once the page is ready.
 *
 * Call readyReveal() once auth resolves and the first render is done.
 * This prevents the flash of unstyled content (FOUC) that appears
 * when the browser paints the raw HTML before JS has hydrated it.
 *
 * Usage in every page entry file:
 *   import { initPageReveal, readyReveal } from '@/utils/ui.utils';
 *   initPageReveal(); // call at top of entry file
 *   initAuth((user) => { ... render content ...; readyReveal(); });
 */
export function initPageReveal(): void {
  const body = document.body;
  // Hide immediately — before the first paint if possible
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
 * Returns a debounced version of a function that delays invoking it
 * until after `wait` milliseconds have elapsed since the last call.
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

/**
 * Sets the textContent of an element by ID.
 * Shared helper used by editor.js and profile/ui.js.
 * @param id - Element ID
 * @param value - Text value to set
 */
export function setEl(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Formats a Firestore Timestamp or ISO string into a human-readable join date.
 * @param joinedAt - Firestore Timestamp object with .seconds property
 * @returns Formatted string e.g. "March 2024"
 */
export function formatJoinDate(joinedAt: { seconds: number } | null): string {
  if (!joinedAt?.seconds) return '';
  return new Date(joinedAt.seconds * 1000).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
