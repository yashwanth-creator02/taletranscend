// src/services/cache.service.js
//
// High-performance client-side cache system with Stale-While-Revalidate (SWR),
// in-memory Map storage, and sessionStorage persistence for instant page loads.
//
// Used across data fetching services (tales, bookmarks, profile, progress)
// to eliminate repeated network calls when navigating between views.

const STORAGE_PREFIX = 'tt_cache:';
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
   * High-level query fetcher wrapping a promise with cache and SWR support.
   *
   * @template T
   * @param {string} key - Unique cache key
   * @param {() => Promise<T>} fetcher - Async fetcher function
   * @param {Object} [options]
   * @param {number} [options.ttl=DEFAULT_TTL_MS] - Time to live in ms
   * @param {boolean} [options.swr=true] - Enable stale-while-revalidate
   * @param {boolean} [options.forceRefresh=false] - Bypass cache
   * @param {(data: T) => void} [options.onBackgroundUpdate] - Callback when SWR background update completes
   * @returns {Promise<T>}
   */
  async fetchWithCache(
    key,
    fetcher,
    { ttl = DEFAULT_TTL_MS, swr = true, forceRefresh = false, onBackgroundUpdate = null } = {}
  ) {
    if (!this.isEnabled) {
      return fetcher();
    }

    if (!forceRefresh) {
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
    }
    return freshData;
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
