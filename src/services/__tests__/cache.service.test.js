import { describe, it, expect, beforeEach } from 'vitest';
import { cacheService } from '../cache.service.js';

describe('CacheService', () => {
  beforeEach(() => {
    cacheService.enableForTests();
    cacheService.clear();
  });

  it('stores and retrieves items correctly', () => {
    cacheService.set('key1', { foo: 'bar' });
    const item = cacheService.get('key1');
    expect(item).not.toBeNull();
    expect(item?.data).toEqual({ foo: 'bar' });
    expect(item?.isStale).toBe(false);
  });

  it('reports has() accurately', () => {
    expect(cacheService.has('key1')).toBe(false);
    cacheService.set('key1', 'value1');
    expect(cacheService.has('key1')).toBe(true);
  });

  it('expires entries after TTL', async () => {
    cacheService.set('shortLived', 'temp', 10); // 10ms TTL
    expect(cacheService.get('shortLived')?.data).toBe('temp');

    await new Promise((resolve) => setTimeout(resolve, 25));

    // Stale check without allowStale
    expect(cacheService.get('shortLived')).toBeNull();

    // With allowStale
    cacheService.set('staleTest', 'val', 5);
    await new Promise((resolve) => setTimeout(resolve, 15));
    const staleResult = cacheService.get('staleTest', { allowStale: true });
    expect(staleResult?.data).toBe('val');
    expect(staleResult?.isStale).toBe(true);
  });

  it('deletes specific keys', () => {
    cacheService.set('delKey', 'toDelete');
    expect(cacheService.has('delKey')).toBe(true);
    cacheService.delete('delKey');
    expect(cacheService.has('delKey')).toBe(false);
  });

  it('invalidates by prefix', () => {
    cacheService.set('user:bookmarks:1', [1, 2]);
    cacheService.set('user:bookmarks:2', [3]);
    cacheService.set('user:profile:1', { name: 'Alice' });
    cacheService.set('tales:list:all', ['tale1']);

    cacheService.invalidatePrefix('user:bookmarks:');

    expect(cacheService.has('user:bookmarks:1')).toBe(false);
    expect(cacheService.has('user:bookmarks:2')).toBe(false);
    expect(cacheService.has('user:profile:1')).toBe(true);
    expect(cacheService.has('tales:list:all')).toBe(true);
  });

  it('fetchWithCache returns cached value if available', async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { count: fetchCount };
    };

    const first = await cacheService.fetchWithCache('counter', fetcher, { ttl: 1000 });
    expect(first).toEqual({ count: 1 });
    expect(fetchCount).toBe(1);

    const second = await cacheService.fetchWithCache('counter', fetcher, { ttl: 1000 });
    expect(second).toEqual({ count: 1 });
    expect(fetchCount).toBe(1); // Not fetched again
  });

  it('fetchWithCache revalidates stale cache in background when SWR is enabled', async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return `data-${fetchCount}`;
    };

    // Store initially with short TTL
    await cacheService.fetchWithCache('swrKey', fetcher, { ttl: 10, swr: true });
    expect(fetchCount).toBe(1);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Requesting with SWR should return stale data immediately and trigger background update
    let updatedData = null;
    const result = await cacheService.fetchWithCache('swrKey', fetcher, {
      ttl: 1000,
      swr: true,
      onBackgroundUpdate: (fresh) => {
        updatedData = fresh;
      },
    });

    expect(result).toBe('data-1'); // Instant return of stale data!

    // Wait a tick for background promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetchCount).toBe(2);
    expect(updatedData).toBe('data-2');

    // Next get returns fresh data
    expect(cacheService.get('swrKey')?.data).toBe('data-2');
  });

  it('invalidates domain helpers correctly', () => {
    cacheService.set('tales:list:published', ['t1']);
    cacheService.set('tale:meta:t1', { title: 'Tale 1' });
    cacheService.set('user:bookmarks:u1', ['t1']);
    cacheService.set('user:profile:u1', { name: 'Bob' });
    cacheService.set('user:drafts:u1', ['d1']);
    cacheService.set('user:continue-reading:u1', ['t1']);

    cacheService.invalidateTales();
    expect(cacheService.has('tales:list:published')).toBe(false);

    cacheService.invalidateTale('t1');
    expect(cacheService.has('tale:meta:t1')).toBe(false);

    cacheService.invalidateBookmarks('u1');
    expect(cacheService.has('user:bookmarks:u1')).toBe(false);

    cacheService.invalidateProfile('u1');
    expect(cacheService.has('user:profile:u1')).toBe(false);
    expect(cacheService.has('user:continue-reading:u1')).toBe(false);
    expect(cacheService.has('user:drafts:u1')).toBe(false);
  });
});
