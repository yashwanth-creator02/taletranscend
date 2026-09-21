// src/utils/navigation.ts
//
// Central URL resolution and page-transition helpers.
//
// Every internal link in the app goes through resolveHref(). That is what
// makes the routing shape a single decision rather than 60 scattered string
// literals — and it is why fixing the shape below was a one-line change.

import { initDevMode } from './dev.utils.ts';
import { createLogger } from './logger.ts';

const log = createLogger('Navigation');

const TRANSITION_DURATION_MS = 220;

/**
 * Prefix applied to bare view names.
 *
 * This used to be `/src/views/`, which mirrored the source layout into the
 * URL bar: every link in the app pointed at
 * `taletranscend.web.app/src/views/library.html`. The rewrites in
 * firebase.json map `/library` → `/library.html`, so none of them ever
 * matched and the clean URLs they describe were unreachable.
 *
 * With Vite's root set to `src/views`, the build output is flat and this is
 * simply the site root.
 */
export const VIEWS_PATH = '/';

/**
 * Initialises per-page boot behaviour.
 *
 * It used to also set `documentElement.style.opacity = '0'` and rely on
 * readyReveal() to undo it. That made every page's visibility conditional on
 * a JavaScript module resolving successfully — a blocked CDN or a single
 * import error left a fully-rendered page invisible with no way back. The
 * fade now lives in base.css as a CSS animation with `forwards`, so it
 * completes whether or not this file ever runs.
 */
export function initPageReveal(): void {
  initDevMode();
}

/**
 * Retained for the page entry points that call it. The reveal is handled by
 * CSS now, so this is a no-op kept to avoid a breaking change across nine
 * entry files for no behavioural gain.
 *
 * @deprecated The boot fade is CSS-driven — see `boot-reveal` in base.css.
 */
export function readyReveal(): void {
  /* intentionally empty */
}

/**
 * Resolves a view name or URL to a final href.
 *
 * Accepts:
 *   - bare view names       "library"      → "/library.html"
 *   - view filenames        "library.html" → "/library.html"
 *   - view + query          "tale.html?id=x" → "/tale.html?id=x"
 *   - root-relative paths   "/shelf"       → unchanged
 *   - absolute URLs         "https://…"    → unchanged
 *
 * Relative forms are normalised to root-relative deliberately. Firebase
 * rewrites `/tale/**` to tale.html, so a page served at `/tale/abc` would
 * resolve a relative `library.html` to `/tale/library.html` — a 404 that
 * only appears on deep links and never in local development.
 */
export function resolveHref(target: string): string {
  const value = target.trim();
  if (!value) return value;

  const isExternal =
    /^(https?:)?\/\//i.test(value) ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    value.startsWith('#');

  if (isExternal || value.startsWith('/')) return value;

  const cleaned = value.replace(/^\.?\//, '');
  const [path, query = ''] = cleaned.split(/(?=[?#])/, 2);
  const withExtension = path.endsWith('.html') ? path : `${path}.html`;

  return `${VIEWS_PATH}${withExtension}${query}`;
}

/**
 * Navigates with a fade-out transition.
 *
 * @param target - Destination view name or URL
 * @param delay  - Extra delay in ms before the location changes
 */
export function navigateTo(target: string, delay = 0): void {
  if (!target) return;

  const href = resolveHref(target);
  log.info('Navigating to', { target, resolvedHref: href });

  // Respect the user's motion preference: fading out a page the user asked
  // not to animate is exactly the kind of vestibular trigger the media
  // query exists for, and it also delays the navigation by 220ms for no
  // reason they wanted.
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    window.location.href = href;
    return;
  }

  const body = document.body;
  if (body) {
    body.style.transition = `opacity ${TRANSITION_DURATION_MS}ms var(--ease-standard, ease)`;
    body.style.opacity = '0';
    body.style.pointerEvents = 'none';
  }

  window.setTimeout(() => {
    window.location.href = href;
  }, TRANSITION_DURATION_MS + delay);
}

log.debug('Navigation initialized');
