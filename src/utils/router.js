// src/utils/router.js
//
// Client-side soft navigation & respective div swapper with HTML page caching.
//
// Behavior:
// - Small Change: Swaps only the respective content container (<main id="main-content">),
//   runs smooth View Transition, keeps shared header/dock/atmosphere mounted, and executes
//   the target page's lifecycle with instant cached data.
// - Large Change: Falls back to a full page reload when navigating to/from standalone views
//   (e.g. reader, login, 404, external links, or structural divergence).

import { createLogger, resolveHref } from '@/utils';
import { initIcons } from '@ui/components/icons.js';

const log = createLogger('Router');

/** In-memory HTML page cache for instant 0ms loads */
const pageCache = new Map();
const PAGE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Pages that have dedicated standalone layouts (large changes) */
const STANDALONE_PATTERNS = [
  /^\/reader(\.html)?(\?.*)?$/,
  /^\/tales\/[^/]+\/read(\/.*)?$/,
  /^\/login(\.html)?(\?.*)?$/,
  /^\/404(\.html)?(\?.*)?$/,
];

/**
 * Checks if a URL points to a standalone page that requires a full reload.
 * @param {string} urlString
 * @returns {boolean}
 */
export function isStandalonePage(urlString) {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString, window.location.origin);
    return STANDALONE_PATTERNS.some((pattern) => pattern.test(parsed.pathname));
  } catch {
    return false;
  }
}

/**
 * Determines whether a navigation between fromUrl and toUrl is a "small change"
 * (compatible shell pages, swap respective div) or a "large change" (full reload).
 *
 * @param {string} fromUrl
 * @param {string} toUrl
 * @returns {boolean} True if small change (soft swap), False if large change (full reload)
 */
export function isSmallChange(fromUrl, toUrl) {
  if (!fromUrl || !toUrl) return false;

  try {
    const from = new URL(fromUrl, window.location.origin);
    const to = new URL(toUrl, window.location.origin);

    // 1. Cross-origin is always a large change
    if (from.origin !== to.origin) return false;

    // 2. Either current or target is a standalone layout (Reader, Login, 404)
    if (isStandalonePage(from.pathname) || isStandalonePage(to.pathname)) {
      return false;
    }

    // 3. Static asset files (xml, json, png, etc.)
    if (/\.(xml|json|png|jpe?g|svg|webp|avif|ico|pdf|txt)$/i.test(to.pathname)) {
      return false;
    }

    // 4. Same page hash navigation only (let browser scroll)
    if (from.pathname === to.pathname && from.search === to.search && to.hash) {
      return false;
    }

    // Both are shell pages (home, library, shelf, profile, tale, contribution, toc)
    return true;
  } catch {
    return false;
  }
}

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
  const parsed = new URL(targetUrl, window.location.origin);
  const pathname = parsed.pathname;

  let activeFilename = 'index.html';
  if (pathname.startsWith('/library')) activeFilename = 'library.html';
  else if (pathname.startsWith('/shelf')) activeFilename = 'shelf.html';
  else if (pathname.startsWith('/profile')) activeFilename = 'profile.html';
  else if (pathname.startsWith('/contribution')) activeFilename = 'contribution.html';
  else if (pathname.startsWith('/toc') || pathname.startsWith('/sitemap'))
    activeFilename = 'toc.html';
  else if (pathname.startsWith('/tales/')) activeFilename = 'tale.html';

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

/**
 * Executes the destination page controller.
 *
 * @param {string} targetUrl
 */
async function runPageInitializer(targetUrl) {
  const parsed = new URL(targetUrl, window.location.origin);
  const pathname = parsed.pathname;

  try {
    if (pathname === '/' || pathname === '/index.html' || pathname === '/index') {
      const { initHomePage } = await import('/pages/home/home.js');
      initHomePage?.();
    } else if (pathname === '/library.html' || pathname === '/library') {
      const { initLibraryPage } = await import('/pages/library/library.js');
      await initLibraryPage?.();
    } else if (pathname === '/shelf.html' || pathname === '/shelf') {
      const { initShelfPage } = await import('/pages/shelf/shelf.js');
      await initShelfPage?.();
    } else if (pathname === '/profile.html' || pathname === '/profile') {
      const { initProfilePage } = await import('/pages/profile/profile.js');
      await initProfilePage?.();
    } else if (pathname.startsWith('/tales/') || pathname === '/tale.html') {
      const { initTalePage } = await import('/pages/tale/tale.js');
      await initTalePage?.();
    } else if (pathname === '/contribution.html' || pathname === '/contribution') {
      const { initContributionPage } = await import('/pages/contribution/contribution.js');
      await initContributionPage?.();
    } else if (pathname === '/toc.html' || pathname === '/toc' || pathname === '/sitemap') {
      const { initTOCPage } = await import('/pages/toc/toc.js');
      await initTOCPage?.();
    }
  } catch (err) {
    log.error('Failed to run page initializer', err);
  } finally {
    initIcons();
  }
}

let _isNavigating = false;

/**
 * Performs client-side navigation.
 * If small change: swaps respective div (#main-content) with view transition.
 * If large change: executes full browser reload.
 *
 * @param {string} targetUrl
 * @param {Object} [options]
 * @param {boolean} [options.isPopState=false]
 * @param {boolean} [options.forceReload=false]
 */
export async function softNavigate(targetUrl, { isPopState = false, forceReload = false } = {}) {
  const resolved = resolveHref(targetUrl);
  const fullTargetUrl = new URL(resolved, window.location.origin).href;
  const currentUrl = window.location.href;

  // 1. If large change or forced reload, perform full page reload
  if (forceReload || !isSmallChange(currentUrl, fullTargetUrl)) {
    log.info('Large change detected — performing full page reload', {
      from: currentUrl,
      to: fullTargetUrl,
    });
    window.location.href = fullTargetUrl;
    return;
  }

  if (_isNavigating) return;
  _isNavigating = true;

  log.info('Small change detected — performing soft respective div swap', {
    from: currentUrl,
    to: fullTargetUrl,
  });

  try {
    const html = await fetchPageHtml(fullTargetUrl);
    if (!html) {
      // Fall back to full reload if fetch failed
      window.location.href = fullTargetUrl;
      return;
    }

    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    const newMain = newDoc.getElementById('main-content');
    const currentMain = document.getElementById('main-content');

    if (!newMain || !currentMain) {
      log.warn('Missing #main-content container in target document — reloading');
      window.location.href = fullTargetUrl;
      return;
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

      // 3. Inject new page stylesheets if missing
      const existingHrefs = new Set(
        Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) =>
          l.getAttribute('href')
        )
      );

      newDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = link.getAttribute('href');
        if (href && !existingHrefs.has(href)) {
          const clone = document.createElement('link');
          clone.rel = 'stylesheet';
          clone.href = href;
          document.head.appendChild(clone);
        }
      });

      // 4. Update History state
      if (!isPopState) {
        window.history.pushState({ url: fullTargetUrl }, '', fullTargetUrl);
      }

      // 5. Scroll reset
      currentMain.scrollTop = 0;
      window.scrollTo(0, 0);

      // 6. Update active nav states
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

    // 7. Initialize target page
    await runPageInitializer(fullTargetUrl);
  } catch (err) {
    log.error('Soft navigation error, falling back to full reload', err);
    window.location.href = fullTargetUrl;
  } finally {
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
