// src/pages/login/__tests__/login.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInAnonymously, signInWithGoogle, onAuthStateChanged } from '@fb/index.js';
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
      <button id="tab-btn-email" role="tab" aria-selected="true">Email</button>
      <button id="tab-btn-phone" role="tab" aria-selected="false">Phone</button>

      <div id="panel-email" role="tabpanel">
        <form id="email-login-form">
          <div id="field-name-group" class="hidden">
            <input id="input-name" type="text" />
          </div>
          <input id="input-email" type="email" value="test@example.com" />
          <div class="relative">
            <input id="input-password" type="password" value="secret123" />
            <button id="btn-toggle-password" type="button" aria-label="Show password">
              <i data-lucide="eye" id="icon-password-toggle"></i>
            </button>
          </div>
          <button id="btn-forgot-password" type="button">Forgot password?</button>
          <button id="btn-email-submit" type="submit">
            <span id="btn-email-submit-text">Sign in</span>
            <div id="btn-email-submit-loading" class="hidden"></div>
          </button>
        </form>
      </div>

      <div id="panel-phone" role="tabpanel" class="hidden">
        <form id="phone-login-form">
          <input id="input-phone" type="tel" value="5551234567" />
          <button id="btn-phone-submit" type="submit">
            <div id="btn-phone-submit-loading" class="hidden"></div>
          </button>
        </form>
      </div>

      <h1 id="login-heading">Welcome to TaleTranscend !!</h1>
      <p id="login-subheading">An embedded mythic archive and storytelling platform for seekers and scribes.</p>
      <span id="auth-switch-label">First time here?</span>
      <button id="btn-toggle-auth-mode" type="button">Sign up instead.</button>

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
    const mod = await import('../login.js');
    mod.initLoginPage();
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

  it('switches tabs between email and phone', async () => {
    await initPage();

    const tabPhone = document.getElementById('tab-btn-phone');
    const tabEmail = document.getElementById('tab-btn-email');
    const panelPhone = document.getElementById('panel-phone');
    const panelEmail = document.getElementById('panel-email');

    tabPhone.click();
    expect(tabPhone.getAttribute('aria-selected')).toBe('true');
    expect(tabEmail.getAttribute('aria-selected')).toBe('false');
    expect(panelPhone.classList.contains('hidden')).toBe(false);
    expect(panelEmail.classList.contains('hidden')).toBe(true);

    tabEmail.click();
    expect(tabEmail.getAttribute('aria-selected')).toBe('true');
    expect(tabPhone.getAttribute('aria-selected')).toBe('false');
    expect(panelEmail.classList.contains('hidden')).toBe(false);
    expect(panelPhone.classList.contains('hidden')).toBe(true);
  });

  it('toggles password visibility between password and text', async () => {
    await initPage();

    const toggleBtn = document.getElementById('btn-toggle-password');
    const passwordInput = document.getElementById('input-password');

    expect(passwordInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');

    toggleBtn.click();
    expect(passwordInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Hide password');

    toggleBtn.click();
    expect(passwordInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-label')).toBe('Show password');
  });

  it('toggles between sign in and sign up modes', async () => {
    await initPage();

    const toggleBtn = document.getElementById('btn-toggle-auth-mode');
    const nameGroup = document.getElementById('field-name-group');
    const submitBtnText = document.getElementById('btn-email-submit-text');
    const authHeading = document.getElementById('login-heading');

    expect(nameGroup.classList.contains('hidden')).toBe(true);
    expect(submitBtnText.textContent).toBe('Sign in');

    toggleBtn.click();
    expect(nameGroup.classList.contains('hidden')).toBe(false);
    expect(submitBtnText.textContent).toBe('Create Account');
    expect(authHeading.textContent).toContain('Inscribe Your Name');

    toggleBtn.click();
    expect(nameGroup.classList.contains('hidden')).toBe(true);
    expect(submitBtnText.textContent).toBe('Sign in');
    expect(authHeading.textContent).toContain('Welcome to TaleTranscend !!');
  });

  it('shows placeholder toast on forgot password', async () => {
    await initPage();

    const forgotBtn = document.getElementById('btn-forgot-password');
    forgotBtn.click();

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Recovery scroll dispatched'),
      'info'
    );
  });

  it('handles email form submit with placeholder toast and loading state', async () => {
    await initPage();

    const form = document.getElementById('email-login-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    vi.advanceTimersByTime(1200);
    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining('Preserved credentials recognized'),
      'success'
    );
  });
});
