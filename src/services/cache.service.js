// src/services/cache.service.js
//
// High-performance client-side cache system with Stale-While-Revalidate (SWR),
// in-memory Map storage, and sessionStorage persistence for instant page loads.
//
// Used across data fetching services (tales, bookmarks, profile, progress)
// to eliminate repeated network calls when navigating between views.

const STORAGE_PREFIX = 'tt_cache:';
const VISITED_PAGES_KEY = 'tt_session_visited_pages';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL

/**
 * @typedef {Object} CacheEntry
 * @property {any} data
 * @property {number} timestamp
 * @property {number} expiresAt
 */

class CacheService {
  constructor() {
    /** @type {Map<string, CacheEntry>} */
    this.memoryCache = new Map();
    this._testModeEnabled = false;
    this._initFromStorage();
    this._setupSessionCleanup();
  }

  /**
   * Whether caching is active. Enabled in all environments except Vitest unit tests
   * unless explicitly enabled via enableForTests().
   */
  get isEnabled() {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return this._testModeEnabled;
    }
    return true;
  }

  /**
   * Helper to enable cache during testing.
   */
  enableForTests() {
    this._testModeEnabled = true;
  }

  /**
   * Helper to disable cache during testing.
   */
  disableForTests() {
    this._testModeEnabled = false;
    this.clear();
  }

  /**
   * Hydrates in-memory cache with valid entries from sessionStorage on initialization.
   * @private
   */
  _initFromStorage() {
    if (!this.isEnabled) return;
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    try {
      const now = Date.now();
      const keysToRemove = [];

      for (let i = 0; i < window.sessionStorage.length; i++) {
        const fullKey = window.sessionStorage.key(i);
        if (!fullKey || !fullKey.startsWith(STORAGE_PREFIX)) continue;

        const raw = window.sessionStorage.getItem(fullKey);
        if (!raw) continue;

        try {
          const entry = JSON.parse(raw);
          if (entry && typeof entry.expiresAt === 'number') {
            if (entry.expiresAt > now) {
              const key = fullKey.slice(STORAGE_PREFIX.length);
              this.memoryCache.set(key, entry);
            } else {
              keysToRemove.push(fullKey);
            }
          }
        } catch {
          keysToRemove.push(fullKey);
        }
      }

      for (const k of keysToRemove) {
        window.sessionStorage.removeItem(k);
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  /**
   * Retrieves an item from cache.
   *
   * @param {string} key
   * @param {Object} [options]
   * @param {boolean} [options.allowStale=false] - Return data even if expired (for SWR)
   * @returns {{ data: any, isStale: boolean } | null}
   */
  get(key, { allowStale = false } = {}) {
    if (!this.isEnabled) return null;

    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isStale = now >= entry.expiresAt;

    if (isStale && !allowStale) {
      this.delete(key);
      return null;
    }

    return {
      data: entry.data,
      isStale,
    };
  }

  /**
   * Stores an item in cache and persists to sessionStorage.
   *
   * @param {string} key
   * @param {any} data
   * @param {number} [ttlMs=DEFAULT_TTL_MS]
   */
  set(key, data, ttlMs = DEFAULT_TTL_MS) {
    if (!this.isEnabled) return;
    if (!key || data === undefined) return;

    const now = Date.now();
    const entry = {
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
    };

    this.memoryCache.set(key, entry);

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
      } catch {
        this._pruneStorage();
      }
    }
  }

  /**
   * Checks if a valid, non-expired cache entry exists for the key.
   *
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Removes a specific key from cache and storage.
   *
   * @param {string} key
   */
  delete(key) {
    this.memoryCache.delete(key);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Invalidates all cache keys matching a prefix.
   *
   * @param {string} prefix
   */
  invalidatePrefix(prefix) {
    if (!prefix) return;

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const fullPrefix = `${STORAGE_PREFIX}${prefix}`;
        const toRemove = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith(fullPrefix)) {
            toRemove.push(k);
          }
        }
        for (const k of toRemove) {
          window.sessionStorage.removeItem(k);
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Clears entire cache.
   */
  clear() {
    this.memoryCache.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const toRemove = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            toRemove.push(k);
          }
        }
        for (const k of toRemove) {
          window.sessionStorage.removeItem(k);
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Prunes oldest/expired entries from sessionStorage when quota is full.
   * @private
   */
  _pruneStorage() {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      const now = Date.now();
      const entries = [];

      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (!k || !k.startsWith(STORAGE_PREFIX)) continue;
        try {
          const item = JSON.parse(window.sessionStorage.getItem(k) || '');
          entries.push({ key: k, expiresAt: item.expiresAt || 0 });
        } catch {
          entries.push({ key: k, expiresAt: 0 });
        }
      }

      entries.sort((a, b) => a.expiresAt - b.expiresAt);

      const toRemove = entries.filter((e) => e.expiresAt <= now);
      const pruneCount = Math.max(toRemove.length, Math.floor(entries.length / 2));

      for (let i = 0; i < pruneCount && i < entries.length; i++) {
        window.sessionStorage.removeItem(entries[i].key);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Sets up session-scoped cleanup handlers.
   * Session storage is automatically cleared by the browser when the session/window/tab closes.
   * @private
   */
  _setupSessionCleanup() {
    if (typeof window === 'undefined') return;
    try {
      window.addEventListener('pagehide', (e) => {
        // If the page is genuinely unloading and not being held in bfcache
        if (!e.persisted) {
          // Keep session cache intact within the active session, but ensure no localStorage leaks
        }
      });
    } catch {
      // Ignore in non-browser environments
    }
  }

  /**
   * Normalizes a URL or pathname to a canonical page path.
   * e.g. "http://localhost:5173/library.html?search=greek" -> "/library.html"
   * e.g. "/index.html" -> "/"
   * @param {string} [urlOrPath]
   * @returns {string}
   */
  normalizePagePath(urlOrPath) {
    if (!urlOrPath) {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname || '/';
        return path === '/index.html' || path === '/index' ? '/' : path;
      }
      return '/';
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      const parsed = new URL(urlOrPath, origin);
      let path = parsed.pathname;
      if (path === '/index.html' || path === '/index') path = '/';
      return path;
    } catch {
      return urlOrPath;
    }
  }

  /**
   * Checks if this page is being visited for the first time in this browser session.
   * For the first visit in a session: "load the page fully, no chacheing here."
   *
   * @param {string} [urlOrPath]
   * @returns {boolean} True if first visit in this session, false if previously visited.
   */
  isFirstVisit(urlOrPath) {
    if (!this.isEnabled) return true;
    if (typeof window === 'undefined' || !window.sessionStorage) return true;

    const pagePath = this.normalizePagePath(urlOrPath);
    try {
      const raw = window.sessionStorage.getItem(VISITED_PAGES_KEY);
      if (!raw) return true;
      const visited = JSON.parse(raw);
      return !Array.isArray(visited) || !visited.includes(pagePath);
    } catch {
      return true;
    }
  }

  /**
   * Marks a page as visited in this browser session.
   *
   * @param {string} [urlOrPath]
   */
  markPageVisited(urlOrPath) {
    if (!this.isEnabled) return;
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const pagePath = this.normalizePagePath(urlOrPath);
    try {
      const raw = window.sessionStorage.getItem(VISITED_PAGES_KEY);
      const visited = raw ? JSON.parse(raw) : [];
      if (Array.isArray(visited)) {
        if (!visited.includes(pagePath)) {
          visited.push(pagePath);
          window.sessionStorage.setItem(VISITED_PAGES_KEY, JSON.stringify(visited));
        }
      } else {
        window.sessionStorage.setItem(VISITED_PAGES_KEY, JSON.stringify([pagePath]));
      }
    } catch {
      // Storage unavailable or full
    }
  }

  /**
   * Resets visited pages list in session storage (useful in tests or session reset).
   */
  resetVisitedPages() {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(VISITED_PAGES_KEY);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Completely clears all cache and visited session data.
   * Ensures that when the user leaves or resets, nothing persists.
   */
  clearSession() {
    this.clear();
    this.resetVisitedPages();
  }

  /**
   * High-level query fetcher wrapping a promise with cache and SWR support.
   *
   * Rules:
   * 1. If pageUrl is passed and it's the first visit in this browser session:
   *    Loads fresh from backend ("no chacheing here"), marks the page visited,
   *    and stores fresh data in cache for subsequent visits.
   * 2. If it's a repeat visit in this session:
   *    Returns cached data instantly (0ms), and revalidates in the background.
   *
   * @template T
   * @param {string} key - Unique cache key
   * @param {() => Promise<T>} fetcher - Async fetcher function
   * @param {Object} [options]
   * @param {number} [options.ttl=DEFAULT_TTL_MS] - Time to live in ms
   * @param {boolean} [options.swr=true] - Enable stale-while-revalidate
   * @param {boolean} [options.forceRefresh=false] - Bypass cache
   * @param {(data: T) => void} [options.onBackgroundUpdate] - Callback when SWR background update completes
   * @param {string} [options.pageUrl=null] - Page URL or path to check session first visit
   * @returns {Promise<T>}
   */
  async fetchWithCache(
    key,
    fetcher,
    {
      ttl = DEFAULT_TTL_MS,
      swr = true,
      forceRefresh = false,
      onBackgroundUpdate = null,
      pageUrl = null,
    } = {}
  ) {
    if (!this.isEnabled) {
      return fetcher();
    }

    // Check if this is the first visit for this page in this browser session
    // If it's the first visit: "no chacheing here, load fresh from backend"
    const isFirstPageVisit = pageUrl !== null ? this.isFirstVisit(pageUrl) : false;
    const shouldBypassCache = forceRefresh || isFirstPageVisit;

    if (!shouldBypassCache) {
      const cached = this.get(key, { allowStale: swr });
      if (cached) {
        if (cached.isStale && swr) {
          Promise.resolve()
            .then(fetcher)
            .then((freshData) => {
              if (freshData !== undefined && freshData !== null) {
                this.set(key, freshData, ttl);
                if (typeof onBackgroundUpdate === 'function') {
                  onBackgroundUpdate(freshData);
                }
              }
            })
            .catch(() => {
              // Silently ignore background revalidation errors
            });
        }
        return cached.data;
      }
    }

    const freshData = await fetcher();
    if (freshData !== undefined && freshData !== null) {
      this.set(key, freshData, ttl);
      if (pageUrl) {
        this.markPageVisited(pageUrl);
      }
    }
    return freshData;
  }

  /**
   * Compares cached data with fresh data received from the backend:
   * - If up to date: does NOT update anything ("if the site s upto date then we will not update anything").
   * - If small change: updates the specific div ("or if the page is not uptodate we will change the specific div").
   * - If changes are too many: reloads the view ("or if the changes are toomany we will let the page be reloaded like before").
   *
   * @param {Object} options
   * @param {any} options.cached - Old cached data
   * @param {any} options.fresh - Fresh data from backend
   * @param {(item: any, id: string) => void} [options.updateDiv] - Callback to update a specific div
   * @param {() => void} [options.onReload] - Callback when changes are too many
   * @param {number} [options.maxChangeThreshold=2] - Max number of changed items before full reload
   * @returns {'uptodate' | 'partial' | 'reloaded'}
   */
  reconcileOrReload({ cached, fresh, updateDiv = null, onReload = null, maxChangeThreshold = 2 }) {
    if (!cached || !fresh) {
      if (typeof onReload === 'function') onReload();
      else if (typeof window !== 'undefined') window.location.reload();
      return 'reloaded';
    }

    // 1. Array comparison (e.g. lists of tales, bookmarks, drafts)
    if (Array.isArray(cached) && Array.isArray(fresh)) {
      const cachedMap = new Map();
      cached.forEach((item, idx) => {
        const id = item?.id || item?.taleId || String(idx);
        cachedMap.set(id, item);
      });

      const freshMap = new Map();
      fresh.forEach((item, idx) => {
        const id = item?.id || item?.taleId || String(idx);
        freshMap.set(id, item);
      });

      // Find changed or added items
      const changedItems = [];
      for (const [id, freshItem] of freshMap.entries()) {
        const cachedItem = cachedMap.get(id);
        if (!cachedItem || JSON.stringify(cachedItem) !== JSON.stringify(freshItem)) {
          changedItems.push({ id, item: freshItem });
        }
      }

      // Check removed items count
      let removedCount = 0;
      for (const id of cachedMap.keys()) {
        if (!freshMap.has(id)) {
          removedCount++;
        }
      }

      const totalChanges = changedItems.length + removedCount;

      // Case 1: Site is up to date — do nothing!
      if (totalChanges === 0) {
        return 'uptodate';
      }

      // Case 2: Too many changes — reload like before!
      if (totalChanges > maxChangeThreshold || Math.abs(cached.length - fresh.length) > 2) {
        if (typeof onReload === 'function') {
          onReload();
        } else if (typeof window !== 'undefined') {
          window.location.reload();
        }
        return 'reloaded';
      }

      // Case 3: Small change — update only the specific div!
      if (typeof updateDiv === 'function') {
        changedItems.forEach(({ id, item }) => {
          updateDiv(item, id);
        });
      }
      return 'partial';
    }

    // 2. Object comparison (e.g. single tale, profile, stats)
    if (typeof cached === 'object' && typeof fresh === 'object') {
      const cachedStr = JSON.stringify(cached);
      const freshStr = JSON.stringify(fresh);

      if (cachedStr === freshStr) {
        return 'uptodate';
      }

      const allKeys = new Set([...Object.keys(cached), ...Object.keys(fresh)]);
      const diffKeys = [];
      for (const k of allKeys) {
        if (JSON.stringify(cached[k]) !== JSON.stringify(fresh[k])) {
          diffKeys.push(k);
        }
      }

      if (diffKeys.length <= maxChangeThreshold && typeof updateDiv === 'function') {
        diffKeys.forEach((key) => {
          updateDiv(fresh[key], key);
        });
        return 'partial';
      }

      if (typeof onReload === 'function') {
        onReload();
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return 'reloaded';
    }

    // Primitives
    if (cached === fresh) return 'uptodate';
    if (typeof onReload === 'function') onReload();
    else if (typeof window !== 'undefined') window.location.reload();
    return 'reloaded';
  }

  /* ─────────────────────────────────────────────
     Domain-Specific Invalidation Helpers
     ───────────────────────────────────────────── */

  invalidateTales() {
    this.invalidatePrefix('tales:');
  }

  invalidateTale(taleId) {
    this.delete(`tale:meta:${taleId}`);
    this.delete(`tale:chapters:${taleId}`);
  }

  invalidateBookmarks(userId) {
    if (!userId) return;
    this.invalidatePrefix(`user:bookmarks:${userId}`);
    this.invalidatePrefix(`user:bookmark:${userId}:`);
  }

  invalidateProfile(userId) {
    if (!userId) return;
    this.invalidatePrefix(`user:profile:${userId}`);
    this.invalidatePrefix(`user:continue-reading:${userId}`);
    this.invalidatePrefix(`user:drafts:${userId}`);
    this.invalidatePrefix(`user:published:${userId}`);
  }

  invalidateDrafts(userId) {
    if (!userId) return;
    this.invalidatePrefix(`user:drafts:${userId}`);
  }

  invalidateProgress(userId, taleId) {
    if (!userId) return;
    this.invalidatePrefix(`user:continue-reading:${userId}`);
    if (taleId) {
      this.delete(`user:progress:${userId}:${taleId}`);
    }
  }
}

/** Global singleton instance */
export const cacheService = new CacheService();
