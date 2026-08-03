// src/features/profile/__tests__/profile.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAuth, auth, upgradeAnonymousToGoogle } from '@fb/index.js';
import * as index from '../index.js';
import * as services from '@services/index.js';
import * as utils from '@/utils';

vi.mock('@fb/index.js', () => ({
  initAuth: vi.fn(),
  auth: { currentUser: null },
  upgradeAnonymousToGoogle: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
}));

vi.mock('@shared/components/nav/nav.js', () => ({
  initNav: vi.fn(),
}));

vi.mock('@/utils', () => ({
  navigateTo: vi.fn(),
  initPageReveal: vi.fn(),
  readyReveal: vi.fn(),
  setupAuthTimeout: vi.fn(() => 123),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../index.js', () => ({
  initProfileUI: vi.fn(),
  saveProfile: vi.fn(),
  startProfileSync: vi.fn(),
  stopProfileSync: vi.fn(),
  computeAndSyncStats: vi.fn(() => Promise.resolve({})),
  updateStatsUI: vi.fn(),
  renderContinueReading: vi.fn(),
  renderPublishedTales: vi.fn(),
  renderDrafts: vi.fn(),
  showContinueReadingSkeleton: vi.fn(),
  showContributionsSkeleton: vi.fn(),
  switchContribTab: vi.fn(),
  closeModal: vi.fn(),
}));

vi.mock('@services/index.js', () => ({
  getContinueReading: vi.fn(() => Promise.resolve([])),
  getUserPublishedTales: vi.fn(() => Promise.resolve([])),
  getUserDrafts: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@shared/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@shared/components/toast/toast.js', () => ({
  showToast: vi.fn(),
}));

describe('Profile Page Controller', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    document.body.innerHTML = `
      <div id="continue-reading-list"></div>
      <button id="btn-upgrade-account" class="hidden"></button>
      <form id="profile-form"></form>
      <button id="btn-new-story"></button>
      <button data-contrib-tab="published"></button>
      <button id="btn-sign-out"></button>
    `;
  });

  async function initPage() {
    await import('../profile.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  it('initializes UI and starts sync on auth', async () => {
    const mockUser = { uid: 'u1', isAnonymous: true };
    vi.mocked(initAuth).mockImplementation((cb) => cb(mockUser));

    await initPage();

    expect(index.startProfileSync).toHaveBeenCalledWith('u1');
    expect(document.getElementById('btn-upgrade-account').classList.contains('hidden')).toBe(false);
  });

  it('handles form submission', async () => {
    await initPage();
    const form = document.getElementById('profile-form');
    await form.dispatchEvent(new Event('submit'));

    expect(index.saveProfile).toHaveBeenCalled();
    expect(index.closeModal).toHaveBeenCalled();
  });

  it('handles sign out', async () => {
    const { signOut } = await import('firebase/auth');
    await initPage();

    const signoutBtn = document.getElementById('btn-sign-out');
    await signoutBtn.click();

    expect(index.stopProfileSync).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });
});
