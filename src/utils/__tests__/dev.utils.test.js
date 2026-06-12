// src/utils/__tests__/dev.utils.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initDevMode } from '../dev.utils.ts';
import * as config from '@config/app.config.js';

vi.mock('@config/app.config.js', () => ({
  IS_DEV_MODE: true,
}));

describe('Dev Utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.__TT_DEV__ = false;
    vi.clearAllMocks();
  });

  it('initializes dev mode when IS_DEV_MODE is true', () => {
    initDevMode();
    expect(window.__TT_DEV__).toBe(true);
    expect(document.querySelector('.dev-badge')).toBeTruthy();
  });

  it('does nothing when IS_DEV_MODE is false', async () => {
    // Reset the module to test with different config
    vi.resetModules();
    vi.doMock('@config/app.config.js', () => ({
      IS_DEV_MODE: false,
    }));

    const { initDevMode: initDevModeLocal } = await import('../dev.utils.ts');
    initDevModeLocal();

    expect(window.__TT_DEV__).toBe(false);
    expect(document.querySelector('.dev-badge')).toBeNull();
  });
});
