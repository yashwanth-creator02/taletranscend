// src/utils/navigation.ts

import { initDevMode } from './dev.utils.ts';

/* ─────────────────────────────────────────────
   Page Reveal
   ───────────────────────────────────────────── */

const TRANSITION_DURATION_MS = 220;
export const VIEWS_PATH = '/src/views/';

/**
 * Sets initial opacity to 0 to prevent FOUC.
 * Call this immediately at the top of page entry points.
 */
export function initPageReveal(): void {
  document.documentElement.style.opacity = '0';
  document.documentElement.style.transition = 'opacity 600ms cubic-bezier(0.4,0,0.2,1)';

  // Initialize Developer Mode
  initDevMode();
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

function resolveHref(target: string): string {
  const value = target.trim();
  if (!value) return value;

  const isExternal =
    /^(https?:)?\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:');

  const isRootRelative = value.startsWith('/');

  if (isExternal || isRootRelative) {
    return value;
  }

  return `${VIEWS_PATH}${value}`;
}

/**
 * Navigates with an optional fade-out transition.
 * Works with both:
 * - view names: "library", "profile", "reader.html"
 * - normal URLs: "/home", "https://example.com"
 *
 * @param target - Destination view or URL
 * @param delay - Extra delay in ms
 */
export function navigateTo(target: string, delay = 0): void {
  if (!target) return;

  const href = resolveHref(target);

  const body = document.body;
  if (body) {
    body.style.transition = `opacity ${TRANSITION_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1)`;
    body.style.opacity = '0';
    body.style.pointerEvents = 'none';
  }

  window.setTimeout(() => {
    window.location.href = href;
  }, TRANSITION_DURATION_MS + delay);
}
