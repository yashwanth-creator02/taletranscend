// src/utils/router.js
//
// Client-side soft navigation & respective div swapper with HTML page caching.
//
// Behavior:
// - Small Change: Swaps only the respective content container (<main id="main-content">)
//   between compatible app shell routes (Home, Library, Profile, TOC).
//   Stylesheets and JS modules are preloaded BEFORE the swap so that no unstyled
//   layout flashes (such as full-screen sidebars) ever occur.
// - Large Change: Falls back to a clean full browser navigation with smooth fade
//   for standalone routes (Shelf, Contribution Studio, Tale Detail, Reader, Login, 404).

import { createLogger } from './logger.ts';
import { resolveHref } from './navigation.ts';
import { initIcons } from '@ui/components/icons.js';
import { cacheService } from '@services/cache.service.js';
import {
  getRouteByUrl,
  isSmallChange as routesIsSmallChange,
  isStandalonePage as routesIsStandalonePage,
} from './routes.js';

const log = createLogger('Router');

/** In-memory HTML page cache for instant 0ms loads */
const pageCache = new Map();
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const isStandalonePage = routesIsStandalonePage;
export const isSmallChange = routesIsSmallChange;

/**
 * Fetches page HTML with caching.
 *
 * @param {string} url
 * @returns {Promise<string|null>}
 */
export async function fetchPageHtml(url) {
  const normalized = new URL(url, window.location.origin).href;
  const cached = pageCache.get(normalized);
  const now = Date.now();

  if (cached && now - cached.timestamp < PAGE_CACHE_TTL_MS) {
    log.debug('Page HTML served from cache', { url: normalized });
    return cached.html;
  }

  try {
    const res = await fetch(normalized, {
      headers: { 'X-Requested-With': 'TaleTranscend-SoftNav' },
    });

    if (!res.ok) {
      log.warn(`Fetch page failed with status ${res.status}`);
      return null;
    }

    const html = await res.text();
    pageCache.set(normalized, { html, timestamp: now });
    return html;
  } catch (err) {
    log.warn('Fetch page network error', err);
    return null;
  }
}

/**
 * Prefetches a page's HTML into the cache.
 *
 * @param {string} url
 */
export function prefetchPage(url) {
  if (!isSmallChange(window.location.href, url)) return;
  const normalized = new URL(url, window.location.origin).href;
  if (pageCache.has(normalized)) return;

  fetchPageHtml(normalized).catch(() => {});
}

/**
 * Updates active navigation link states in the header and mobile dock.
 *
 * @param {string} targetUrl
 */
export function updateNavActiveLinks(targetUrl) {
  const route = getRouteByUrl(targetUrl);
  const activeFilename = route?.navActive || 'index.html';

  // Desktop links
  document.querySelectorAll('#app-nav .nav-link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const isMatch =
      href.includes(activeFilename) ||
      (activeFilename === 'index.html' && (href === '/' || href === '/index.html'));
    link.classList.toggle('nav-link--active', isMatch);
    if (isMatch) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // Mobile dock links
  document.querySelectorAll('#mobile-dock-container .dock-item').forEach((item) => {
    const href = item.getAttribute('href') || '';
    const isMatch =
      href.includes(activeFilename) ||
      (activeFilename === 'index.html' && (href === '/' || href === '/index.html'));
    item.classList.toggle('dock-item--active', isMatch);
    if (isMatch) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

let _isNavigating = false;
let _lastRenderedUrl = typeof window !== 'undefined' ? window.location.href : '';

/**
 * Triggers a full browser navigation while fading out document body to prevent jarring flashes.
 *
 * @param {string} targetUrl
 */
function executeFullReload(targetUrl) {
  if (typeof document !== 'undefined' && document.body) {
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      document.body.style.transition = 'opacity 220ms var(--ease-standard, ease)';
      document.body.style.opacity = '0';
      document.body.style.pointerEvents = 'none';
    }
  }
  window.location.href = targetUrl;
}

/**
 * Displays an illuminated gradient progress bar at the top of the viewport during transitions.
 */
export function showNavigationProgressBar() {
  if (typeof document === 'undefined' || !document.body) return;
  let bar = document.getElementById('router-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'router-progress-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.style.position = 'fixed';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.height = '3px';
    bar.style.width = '0%';
    bar.style.background = 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)';
    bar.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.7), 0 0 5px rgba(168, 85, 247, 0.5)';
    bar.style.zIndex = '9999999';
    bar.style.transition = 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease';
    bar.style.pointerEvents = 'none';
    document.body.appendChild(bar);
  }
  bar.style.opacity = '1';
  bar.style.width = '35%';
  setTimeout(() => {
    if (bar && bar.style.opacity === '1') {
      bar.style.width = '75%';
    }
  }, 100);
}

/**
 * Finishes and fades out the top progress bar.
 */
export function hideNavigationProgressBar() {
  if (typeof document === 'undefined') return;
  const bar = document.getElementById('router-progress-bar');
  if (bar) {
    bar.style.width = '100%';
    setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => {
        bar.style.width = '0%';
      }, 250);
    }, 150);
  }
}

/**
 * Preloads newly required stylesheets and awaits their parsing before swapping views.
 *
 * @param {Document} newDoc
 * @returns {Promise<void>}
 */
async function preloadStylesheets(newDoc) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return;
  }

  const existingHrefs = new Set(
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) =>
      l.getAttribute('href')
    )
  );

  const pendingPromises = [];

  newDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !existingHrefs.has(href)) {
      const clone = document.createElement('link');
      clone.rel = 'stylesheet';
      clone.href = href;

      const p = new Promise((resolve) => {
        clone.onload = () => resolve();
        clone.onerror = () => resolve();
        setTimeout(resolve, 350); // Safety timeout so page never gets stuck
      });

      pendingPromises.push(p);
      document.head.appendChild(clone);
    }
  });

  if (pendingPromises.length > 0) {
    await Promise.all(pendingPromises);
  }
}

/**
 * Performs client-side navigation.
 * If small change (app shell <-> app shell): swaps respective div (#main-content) with view transition.
 * If large change (standalone views or first visit in session): executes full browser reload.
 *
 * @param {string} targetUrl
 * @param {Object} [options]
 * @param {boolean} [options.isPopState=false]
 * @param {boolean} [options.forceReload=false]
 */
export async function softNavigate(targetUrl, { isPopState = false, forceReload = false } = {}) {
  const resolved = resolveHref(targetUrl);
  const fullTargetUrl = new URL(resolved, window.location.origin).href;
  let currentUrl =
    _lastRenderedUrl && _lastRenderedUrl !== 'about:blank'
      ? _lastRenderedUrl
      : window.location.href;
  if (!currentUrl || currentUrl === 'about:blank') {
    currentUrl = `${window.location.origin}/`;
  }

  // 1. If page is being visited for the first time in this browser session:
  // "like for evry browser session, if the page is being visited for the first time, then load the page fully, no chacheing here."
  if (cacheService.isFirstVisit(fullTargetUrl)) {
    log.info('First visit to page in this session — loading page fully', {
      target: fullTargetUrl,
    });
    executeFullReload(fullTargetUrl);
    return;
  }

  // 2. If large change or forced reload, perform full page reload
  if (forceReload || !isSmallChange(currentUrl, fullTargetUrl)) {
    log.info('Large change detected — performing full page reload', {
      from: currentUrl,
      to: fullTargetUrl,
    });
    executeFullReload(fullTargetUrl);
    return;
  }

  if (_isNavigating) return;
  _isNavigating = true;

  showNavigationProgressBar();

  log.info('Small change detected — performing soft respective div swap', {
    from: currentUrl,
    to: fullTargetUrl,
  });

  try {
    const html = await fetchPageHtml(fullTargetUrl);
    if (!html) {
      executeFullReload(fullTargetUrl);
      return;
    }

    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    const newMain = newDoc.getElementById('main-content');
    const currentMain = document.getElementById('main-content');

    if (!newMain || !currentMain) {
      log.warn('Missing #main-content container in target document — reloading');
      executeFullReload(fullTargetUrl);
      return;
    }

    // 3. Preload all target stylesheets BEFORE swapping to prevent unstyled flash
    await preloadStylesheets(newDoc);

    // 4. Preload destination route JS module before swapping (production / browser)
    const targetRoute = getRouteByUrl(fullTargetUrl);
    let loadedModule = null;
    if (targetRoute?.load && !(typeof process !== 'undefined' && process.env.NODE_ENV === 'test')) {
      try {
        loadedModule = await targetRoute.load();
      } catch (err) {
        log.warn('Route module preload failed, falling back to full reload', err);
        executeFullReload(fullTargetUrl);
        return;
      }
    }

    const doSwap = () => {
      // 1. Swap main content and attributes
      currentMain.className = newMain.className;
      currentMain.innerHTML = newMain.innerHTML;

      // 2. Synchronize Title & Meta description
      if (newDoc.title) {
        document.title = newDoc.title;
      }
      const newMeta = newDoc.querySelector('meta[name="description"]')?.getAttribute('content');
      if (newMeta) {
        let metaTag = document.querySelector('meta[name="description"]');
        if (!metaTag) {
          metaTag = document.createElement('meta');
          metaTag.setAttribute('name', 'description');
          document.head.appendChild(metaTag);
        }
        metaTag.setAttribute('content', newMeta);
      }

      // 3. Sync body classes while preserving .booted
      const wasBooted = document.body.classList.contains('booted');
      document.body.className = newDoc.body.className;
      if (wasBooted) {
        document.body.classList.add('booted');
      }

      // 4. Clean up any orphaned floating bars or docks outside <main>
      document.querySelectorAll('#tale-action-bar, .floating-bar').forEach((el) => {
        if (!currentMain.contains(el)) el.remove();
      });

      // 5. Update History state
      if (!isPopState) {
        window.history.pushState({ url: fullTargetUrl }, '', fullTargetUrl);
      }
      _lastRenderedUrl = fullTargetUrl;

      // 6. Scroll reset
      currentMain.scrollTop = 0;
      window.scrollTo(0, 0);

      // 7. Update active nav states
      updateNavActiveLinks(fullTargetUrl);
    };

    // Use modern View Transitions API if supported and user prefers standard motion
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (document.startViewTransition && !prefersReduced) {
      const transition = document.startViewTransition(() => doSwap());
      await transition.finished;
    } else {
      doSwap();
    }

    // 8. Initialize target page controller
    if (targetRoute?.init && loadedModule) {
      await targetRoute.init(loadedModule);
    }
  } catch (err) {
    log.error('Soft navigation error, falling back to full reload', err);
    executeFullReload(fullTargetUrl);
  } finally {
    hideNavigationProgressBar();
    initIcons();
    _isNavigating = false;
  }
}

/**
 * Bootstraps router event delegation (click intercept, prefetch, popstate).
 * Safe to call multiple times.
 */
let _routerInitialized = false;

export function initRouter() {
  if (typeof window === 'undefined' || _routerInitialized) return;
  _routerInitialized = true;
  _lastRenderedUrl = window.location.href;

  log.info('Initializing router click interception & prefetching');

  // Intercept eligible link clicks
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const link = target.closest('a[href]');
    if (!link) return;

    // Ignore clicks with modifiers or non-left clicks
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    // Ignore downloads or explicit target frames
    if (link.hasAttribute('download') || link.getAttribute('target') === '_blank') return;

    // Ignore opt-outs
    if (link.hasAttribute('data-no-pjax') || link.hasAttribute('data-full-reload')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    const resolved = resolveHref(href);
    const fullTargetUrl = new URL(resolved, window.location.origin).href;

    // RULE: For every browser session, if the page is being visited for the first time,
    // load the page fully, no caching here!
    if (cacheService.isFirstVisit(fullTargetUrl)) {
      return; // Do NOT preventDefault! Let browser navigate normally and load fully.
    }

    if (isSmallChange(window.location.href, href)) {
      e.preventDefault();
      softNavigate(href);
    }
  });

  // Prefetch on hover/pointerenter
  let prefetchTimer = null;
  document.addEventListener('pointerover', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const link = target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    if (prefetchTimer) clearTimeout(prefetchTimer);
    prefetchTimer = setTimeout(() => {
      prefetchPage(href);
    }, 60);
  });

  // Handle browser back and forward buttons
  window.addEventListener('popstate', () => {
    softNavigate(window.location.href, { isPopState: true });
  });
}
