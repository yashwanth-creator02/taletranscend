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

/* ─────────────────────────────────────────────
   Rate Limit UI
   ───────────────────────────────────────────── */

/**
 * Applies a visual cooldown timer to a button.
 *
 * @param btn - The button element to disable and update
 * @param cooldownMs - Total cooldown duration in ms
 * @param originalText - The text to restore after cooldown
 * @param getRemaining - Function that returns remaining ms
 */
export function applyButtonCooldown(
  btn: HTMLElement,
  cooldownMs: number,
  originalText: string,
  getRemaining: () => number
): void {
  if (!btn) return;

  // Prefer an explicit label or text span (excluding counter elements), fall back to span or button if no icons/counters exist
  const label =
    btn.querySelector('.cooldown-label, .btn-label, .resonance-label, [data-cooldown-label]') ||
    btn.querySelector('span:not([id*="count"]):not(.sr-only)') ||
    btn.querySelector('span:not([id*="count"])') ||
    (btn.querySelector('i, svg, [id*="count"]') ? null : btn);

  // If it's an icon button with sr-only text (like our shelf button),
  // we might want to show the timer even if it was hidden.
  const isSrOnly = label?.classList.contains('sr-only') ?? false;

  const updateUI = () => {
    const remaining = getRemaining();

    if (remaining <= 0) {
      btn.removeAttribute('disabled');
      if (btn instanceof HTMLButtonElement) btn.disabled = false;
      btn.classList.remove('cooldown-active');

      if (label) {
        label.textContent = originalText;
        if (isSrOnly) label.classList.add('sr-only'); // Put it back to hidden
      }
      return;
    }

    btn.setAttribute('disabled', 'true');
    if (btn instanceof HTMLButtonElement) btn.disabled = true;
    btn.classList.add('cooldown-active');

    const seconds = Math.ceil(remaining / 1000);

    if (label && originalText) {
      label.textContent = `${originalText} (${seconds}s)`;
    }

    if (btn.hasAttribute('title') || !label) {
      const originalTitle =
        btn.getAttribute('data-original-title') || btn.getAttribute('title') || 'Action';
      if (!btn.hasAttribute('data-original-title')) {
        btn.setAttribute('data-original-title', originalTitle);
      }
      btn.setAttribute('title', `${originalTitle} (${seconds}s)`);
    }

    setTimeout(updateUI, 1000);
  };

  updateUI();
}
