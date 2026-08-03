// src/shared/nav/__tests__/nav.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initNav, destroyNav } from '../nav.js';
import { auth, onAuthStateChanged } from '@fb/index.js';
import { navState } from '../nav.state.js';

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: null },
  onAuthStateChanged: vi.fn(() => vi.fn()),
}));

vi.mock('../nav.utils.js', () => ({
  renderIcons: vi.fn(),
  getCurrentPage: vi.fn(() => 'index.html'),
  getNavElements: vi.fn(() => ({})),
  getAvatarSeed: vi.fn(() => 'seed'),
}));

vi.mock('../nav.interactions.js', () => ({
  attachGlobalListeners: vi.fn(),
  detachGlobalListeners: vi.fn(),
  updateNavUser: vi.fn(),
}));

describe('Nav Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    navState.unsubscribeAuth = null;
  });

  it('initNav injects header and dock into body', () => {
    initNav();
    expect(document.getElementById('app-nav')).toBeTruthy();
    expect(document.getElementById('mobile-dock-container')).toBeTruthy();
    expect(onAuthStateChanged).toHaveBeenCalled();
  });

  it('initNav is idempotent', () => {
    initNav();
    const count = document.querySelectorAll('header').length;
    initNav();
    expect(document.querySelectorAll('header').length).toBe(count);
  });

  it('destroyNav cleans up DOM and listeners', () => {
    initNav();
    const unsubscribe = vi.fn();
    navState.unsubscribeAuth = unsubscribe;

    destroyNav();
    expect(document.getElementById('app-nav')).toBeNull();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
