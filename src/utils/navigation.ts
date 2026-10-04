// src/utils/navigation.ts
//
// Central URL resolution and page-transition helpers.
//
// Every internal link in the app goes through resolveHref(). That is what
// makes the routing shape a single decision rather than 60 scattered string
// literals — and it is why fixing the shape below was a one-line change.

import { initDevMode } from './dev.utils.ts';
import { createLogger } from './logger.ts';
import { initRouter, softNavigate, isSmallChange } from './router.js';
import { cacheService } from '@services/cache.service.js';

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
  if (typeof document !== 'undefined') {
    initRouter();
    const reveal = () => {
      if (document.body) {
        document.body.classList.add('booted');
        document.body.style.opacity = '';
        document.body.style.pointerEvents = '';
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', reveal, { once: true });
    } else {
      reveal();
    }
  }
}

/**
 * Marks the document body as booted to reveal styled content and fade the boot curtain.
 */
export function readyReveal(): void {
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.add('booted');
    document.body.style.opacity = '';
    document.body.style.pointerEvents = '';
  }
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
  const isAsset = /\.(png|jpe?g|svg|webp|ico|gif|avif|css|js|json|xml|txt)$/i.test(path);
  const withExtension = isAsset || path.endsWith('.html') ? path : `${path}.html`;

  return `${VIEWS_PATH}${withExtension}${query}`;
}

/**
 * Returns the canonical hierarchical URL for a tale detail page.
 * Produces `/tales/{taleId}` which Firebase rewrites to `/tale.html`.
 *
 * All internal navigation to a tale page should go through this helper so that
 * the URL scheme is a single decision rather than scattered string literals.
 *
 * @param taleId - Firestore document ID of the tale
 * @param origin - Optional base origin for absolute URLs (e.g. window.location.origin)
 */
export function taleUrl(taleId: string, origin?: string): string {
  const path = `/tales/${encodeURIComponent(taleId)}`;
  return origin ? `${origin}${path}` : path;
}

/**
 * Returns the canonical hierarchical URL for a reader chapter page.
 * Produces `/tales/{taleId}/read/{chapterIndex}` which Firebase rewrites to `/reader.html`.
 *
 * @param taleId       - Firestore document ID of the tale
 * @param chapterIndex - 0-based chapter index (defaults to 0)
 * @param origin       - Optional base origin for absolute URLs
 */
export function readerUrl(
  taleId: string,
  chapterIndex: number | string = 0,
  origin?: string
): string {
  const path = `/tales/${encodeURIComponent(taleId)}/read/${chapterIndex}`;
  return origin ? `${origin}${path}` : path;
}

/**
 * Navigates to a destination view.
 * If small change: swaps respective div (#main-content) instantly.
 * If large change: executes full browser reload with smooth fade.
 *
 * @param target - Destination view name or URL
 * @param delay  - Extra delay in ms before the location changes (for full reloads)
 */
export function navigateTo(target: string, delay = 0): void {
  if (!target) return;

  const href = resolveHref(target);
  log.info('Navigating to', { target, resolvedHref: href });

  // If repeat visit in this session and small change: soft navigate
  if (
    typeof window !== 'undefined' &&
    !cacheService.isFirstVisit(href) &&
    isSmallChange(window.location.href, href)
  ) {
    softNavigate(href);
    return;
  }

  // First visit or large change: respect motion preference and reload page fully
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

// Reset body pointer-events and opacity when navigating via browser back/forward buttons (bfcache)
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', () => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.opacity = '';
      document.body.style.pointerEvents = '';
      document.body.classList.add('booted');
    }
  });
}

log.debug('Navigation initialized');
