// src/firebase/__tests__/app.test.js
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
}));

vi.mock('@/utils', () => ({
  initNetworkListeners: vi.fn(),
  createLogger: vi.fn(() => ({
    log: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('firebase/app', () => {
  it('initializes firebase app', async () => {
    const { default: app } = await import('../app.js');
    expect(app.name).toBe('mock-app');
  });
});
