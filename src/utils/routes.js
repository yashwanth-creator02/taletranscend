// src/utils/routes.js
//
// Centralized Route Registry for TaleTranscend.
// Defines application shells, view mapping, lifecycle loaders, and compatibility.
//
// Shells:
// - 'app': Core browsing pages that share #app-nav and #mobile-dock-container (Home, Library, Profile, TOC).
//   Eligible for instant, seamless div soft-navigation on repeat visits.
// - 'standalone': Dedicated immersive layouts with custom headers, floating docks, or full-viewport canvas
//   (Shelf, Tale Detail, Contribution Studio, Reader, Login, 404).
//   Requires full page load to maintain pure layout isolation and prevent cross-page CSS/DOM leakage.

/**
 * @typedef {'app' | 'standalone'} RouteShell
 *
 * @typedef {Object} RouteDefinition
 * @property {string} id
 * @property {string} file
 * @property {RouteShell} shell
 * @property {string} navActive
 * @property {(pathname: string) => boolean} match
 * @property {(() => Promise<any>)=} load
 * @property {((module: any) => Promise<void> | void)=} init
 */

/** @type {RouteDefinition[]} */
export const ROUTES = [
  // ── 1. Reader Views (High Priority Pattern Match) ───────────────────
  {
    id: 'reader',
    file: 'reader.html',
    shell: 'standalone',
    navActive: 'reader.html',
    match: (path) =>
      path.startsWith('/reader') ||
      path.startsWith('/chapter') ||
      path.startsWith('/fragment') ||
      (path.startsWith('/tales/') && /\/(?:read|chapters?|fragments?)(\/|$)/.test(path)),
  },

  // ── 2. Tale Detail Page ─────────────────────────────────────────────
  {
    id: 'tale',
    file: 'tale.html',
    shell: 'standalone',
    navActive: 'tale.html',
    match: (path) => path.startsWith('/tales/') || path === '/tale.html' || path === '/tale',
  },

  // ── 3. App Shell Pages (Soft-nav compatible) ─────────────────────────
  {
    id: 'home',
    file: 'index.html',
    shell: 'app',
    navActive: 'index.html',
    match: (path) => path === '/' || path === '/index.html' || path === '/index',
    load: () => import('@pages/home/home.js'),
    init: (mod) => mod.initHomePage?.(),
  },
  {
    id: 'library',
    file: 'library.html',
    shell: 'app',
    navActive: 'library.html',
    match: (path) => path === '/library.html' || path === '/library',
    load: () => import('@pages/library/library.js'),
    init: async (mod) => {
      await mod.initLibraryPage?.();
    },
  },
  {
    id: 'profile',
    file: 'profile.html',
    shell: 'app',
    navActive: 'profile.html',
    match: (path) => path === '/profile.html' || path === '/profile',
    load: () => import('@pages/profile/profile.js'),
    init: async (mod) => {
      await mod.initProfilePage?.();
    },
  },
  {
    id: 'toc',
    file: 'toc.html',
    shell: 'app',
    navActive: 'toc.html',
    match: (path) => path === '/toc.html' || path === '/toc' || path === '/sitemap',
    load: () => import('@pages/toc/toc.js'),
    init: async (mod) => {
      await mod.initTOCPage?.();
    },
  },

  // ── 4. Standalone Dedicated Views ───────────────────────────────────
  {
    id: 'shelf',
    file: 'shelf.html',
    shell: 'standalone',
    navActive: 'shelf.html',
    match: (path) => path === '/shelf.html' || path === '/shelf',
  },
  {
    id: 'contribution',
    file: 'contribution.html',
    shell: 'standalone',
    navActive: 'contribution.html',
    match: (path) => path === '/contribution.html' || path === '/contribution',
  },
  {
    id: 'login',
    file: 'login.html',
    shell: 'standalone',
    navActive: 'login.html',
    match: (path) => path === '/login.html' || path === '/login' || path.startsWith('/login'),
  },
  {
    id: '404',
    file: '404.html',
    shell: 'standalone',
    navActive: '404.html',
    match: (path) => path === '/404.html' || path === '/404',
  },
];

/**
 * Finds the matching route definition for a given pathname or full URL.
 *
 * @param {string} urlOrPath
 * @returns {RouteDefinition|null}
 */
export function getRouteByUrl(urlOrPath) {
  if (!urlOrPath) return null;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(urlOrPath, origin);
    const pathname = parsed.pathname;

    for (const route of ROUTES) {
      if (route.match(pathname)) {
        return route;
      }
    }
  } catch {
    // Ignore invalid URL
  }
  return null;
}

/**
 * Checks if a route belongs to the shared app shell (home, library, profile, toc).
 *
 * @param {string} urlOrPath
 * @returns {boolean}
 */
export function isAppShellRoute(urlOrPath) {
  const route = getRouteByUrl(urlOrPath);
  return route?.shell === 'app';
}

/**
 * Checks if a route is a standalone dedicated view (shelf, contribution, reader, login, etc.).
 *
 * @param {string} urlOrPath
 * @returns {boolean}
 */
export function isStandalonePage(urlOrPath) {
  const route = getRouteByUrl(urlOrPath);
  return !route || route.shell === 'standalone';
}

/**
 * Determines whether navigation between fromUrl and toUrl is a "small change"
 * (both pages share the same app shell container).
 *
 * @param {string} fromUrl
 * @param {string} toUrl
 * @returns {boolean}
 */
export function isSmallChange(fromUrl, toUrl) {
  if (!fromUrl || !toUrl) return false;

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const from = new URL(fromUrl, origin);
    const to = new URL(toUrl, origin);

    // 1. Cross-origin is always a full reload
    if (from.origin !== to.origin) return false;

    // 2. Static assets are always direct loads
    if (/\.(xml|json|png|jpe?g|svg|webp|avif|ico|pdf|txt)$/i.test(to.pathname)) {
      return false;
    }

    // 3. Same page hash navigation only (let browser scroll)
    if (from.pathname === to.pathname && from.search === to.search && to.hash) {
      return false;
    }

    // 4. Soft-navigation is ONLY allowed between compatible 'app' shell views!
    const fromRoute = getRouteByUrl(from.href);
    const toRoute = getRouteByUrl(to.href);

    if (fromRoute?.shell === 'app' && toRoute?.shell === 'app') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
