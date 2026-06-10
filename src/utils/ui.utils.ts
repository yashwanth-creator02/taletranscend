// src/utils/ui.utils.ts
// Shared UI utilities used across all pages.

export { formatJoinDate } from './format.utils.ts';
import { escapeText } from './sanitize.utils.ts';

/* ─────────────────────────────────────────────
   Auth Timeout Guard
   ───────────────────────────────────────────── */

/**
 * Sets up a timeout guard for initial data load.
 * If Firestore/Auth doesn't respond in time, shows an error message.
 *
 * @param containerId - ID of the DOM element to show the error in
 * @param message - Error message to display
 * @param timeoutMs - Timeout duration in ms
 * @returns The timeout ID for clearTimeout()
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
        <div class="col-span-full text-center py-20 text-red-500 font-medium">
          ${escapeText(message)}
        </div>
      `;
    }
  }, timeoutMs);
}
