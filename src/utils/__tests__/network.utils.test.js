// src/utils/__tests__/network.utils.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initNetworkListeners } from '../network.utils.ts';

describe('Network Utils', () => {
  beforeEach(() => {
    document.body.classList.remove('is-offline');
    vi.clearAllMocks();
  });

  it('adds is-offline class if navigator.onLine is false on init', () => {
    vi.stubGlobal('navigator', { onLine: false });
    initNetworkListeners();
    expect(document.body.classList.contains('is-offline')).toBe(true);
  });

  it('removes is-offline class if navigator.onLine is true on init', () => {
    vi.stubGlobal('navigator', { onLine: true });
    initNetworkListeners();
    expect(document.body.classList.contains('is-offline')).toBe(false);
  });

  it('updates class when online/offline events fire', () => {
    vi.stubGlobal('navigator', { onLine: true });
    initNetworkListeners();

    // Fire offline event
    window.dispatchEvent(new Event('offline'));
    expect(document.body.classList.contains('is-offline')).toBe(true);

    // Fire online event
    window.dispatchEvent(new Event('online'));
    expect(document.body.classList.contains('is-offline')).toBe(false);
  });
});
