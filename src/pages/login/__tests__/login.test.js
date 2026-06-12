// src/pages/login/__tests__/login.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth, signInAnonymously, signInWithGoogle, onAuthStateChanged } from '@fb/index.js';
import * as utils from '@/utils';
import { showToast } from '@ui/components/toast.js';

// We need to import the module to trigger its DOMContentLoaded listener
// but since it uses top-level code (initPageReveal), we might need to be careful.

vi.mock('@fb/index.js', () => ({
  auth: { currentUser: null },
  signInAnonymously: vi.fn(),
  signInWithGoogle: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
}));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    navigateTo: vi.fn(),
    initPageReveal: vi.fn(),
    readyReveal: vi.fn(),
  };
});

vi.mock('@ui/components/icons.js', () => ({
  initIcons: vi.fn(),
}));

vi.mock('@ui/components/toast.js', () => ({
  showToast: vi.fn(),
}));

describe('Login Page', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();

    document.body.innerHTML = `
      <div class="login-card"></div>
      <button id="btn-google-login">
        <span>Google Login</span>
        <div id="btn-google-login-loading" class="hidden"></div>
      </button>
      <button id="btn-guest-login">
        <span>Guest Login</span>
        <div id="btn-guest-login-loading" class="hidden"></div>
      </button>
    `;
  });

  async function initPage() {
    await import('../login.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
  }

  it('redirects if user is already signed in', async () => {
    onAuthStateChanged.mockImplementation((auth, cb) => {
      cb({ isAnonymous: false });
      return vi.fn();
    });

    await initPage();
    expect(utils.navigateTo).toHaveBeenCalledWith('profile.html');
  });

  it('handles Google login success', async () => {
    await initPage();

    const btn = document.getElementById('btn-google-login');
    await btn.click();

    expect(signInWithGoogle).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Welcome'), 'success');

    vi.advanceTimersByTime(1000);
    expect(utils.navigateTo).toHaveBeenCalledWith('profile.html');
  });

  it('handles Guest login success', async () => {
    await initPage();

    const btn = document.getElementById('btn-guest-login');
    await btn.click();

    expect(signInAnonymously).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Welcome'), 'success');
  });

  it('handles login failure', async () => {
    signInWithGoogle.mockRejectedValue({ code: 'error' });
    await initPage();

    const btn = document.getElementById('btn-google-login');
    await btn.click();

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('failed'), 'error');
    expect(btn.disabled).toBe(false);
  });
});
