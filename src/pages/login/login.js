// src/pages/login/login.js
// TaleTranscend Authentication entry point with split-screen Scholar's Vignette,
// tabbed Email/Phone authentication, password toggle, and accessible placeholders.

import '@css/base.css';
import '@css/pages/login.css';

import { auth, signInAnonymously, signInWithGoogle, onAuthStateChanged } from '@fb/index.js';
import { navigateTo, initPageReveal, readyReveal, createLogger } from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { showToast } from '@ui/components/toast.js';

const log = createLogger('Login');

// Current auth mode: 'signin' | 'signup'
let authMode = 'signin';

// Initialize page reveal animation
initPageReveal();

/**
 * Toggles loading state for a button.
 * @param {string} buttonId - The ID of the button.
 * @param {boolean} isLoading - Whether to show loading state.
 */
export function toggleButtonLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  const loadingSpan = document.getElementById(`${buttonId}-loading`);

  if (!button || !loadingSpan) return;

  const textSpan = button.querySelector('span:not([id])');
  if (isLoading) {
    button.disabled = true;
    button.classList.add('opacity-70', 'cursor-not-allowed');
    loadingSpan.classList.remove('hidden');
    if (textSpan) textSpan.classList.add('opacity-0');
  } else {
    button.disabled = false;
    button.classList.remove('opacity-70', 'cursor-not-allowed');
    loadingSpan.classList.add('hidden');
    if (textSpan) textSpan.classList.remove('opacity-0');
  }
}

/**
 * Handles the redirection logic after a successful login.
 */
export function handleAuthSuccess() {
  showToast('Welcome to the Living Archive.', 'success');
  setTimeout(() => {
    navigateTo('profile.html');
  }, 900);
}

/**
 * Adds a subtle glow effect to the login card on success.
 */
export function addSuccessGlow() {
  const card = document.querySelector('.login-card');
  if (card) {
    card.style.boxShadow = `
      0 0 50px rgba(99, 102, 241, 0.4),
      0 0 80px rgba(245, 158, 11, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15)
    `;
    card.style.borderColor = 'rgba(129, 140, 248, 0.5)';
  }
}

/**
 * Sets up tab switching between Email and Phone authentication.
 */
function _setupAuthTabs() {
  const tabEmail = document.getElementById('tab-btn-email');
  const tabPhone = document.getElementById('tab-btn-phone');
  const panelEmail = document.getElementById('panel-email');
  const panelPhone = document.getElementById('panel-phone');

  if (!tabEmail || !tabPhone || !panelEmail || !panelPhone) return;

  tabEmail.addEventListener('click', () => {
    tabEmail.classList.add('auth-tab--active');
    tabEmail.setAttribute('aria-selected', 'true');
    tabPhone.classList.remove('auth-tab--active');
    tabPhone.setAttribute('aria-selected', 'false');

    panelEmail.classList.remove('hidden');
    panelEmail.classList.add('auth-panel--active');
    panelPhone.classList.add('hidden');
    panelPhone.classList.remove('auth-panel--active');
  });

  tabPhone.addEventListener('click', () => {
    tabPhone.classList.add('auth-tab--active');
    tabPhone.setAttribute('aria-selected', 'true');
    tabEmail.classList.remove('auth-tab--active');
    tabEmail.setAttribute('aria-selected', 'false');

    panelPhone.classList.remove('hidden');
    panelPhone.classList.add('auth-panel--active');
    panelEmail.classList.add('hidden');
    panelEmail.classList.remove('auth-panel--active');
  });
}

/**
 * Sets up password show/hide visibility toggle.
 */
function _setupPasswordToggle() {
  const toggleBtn = document.getElementById('btn-toggle-password');
  const passwordInput = document.getElementById('input-password');

  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    toggleBtn.innerHTML = isPassword
      ? '<i data-lucide="eye-off" id="icon-password-toggle" class="w-4 h-4"></i>'
      : '<i data-lucide="eye" id="icon-password-toggle" class="w-4 h-4"></i>';

    initIcons();
  });
}

/**
 * Toggles between Sign In and Sign Up (Create Account) modes.
 */
function _setupAuthModeToggle() {
  const toggleBtn = document.getElementById('btn-toggle-auth-mode');
  const switchLabel = document.getElementById('auth-switch-label');
  const heading = document.getElementById('login-heading');
  const subheading = document.getElementById('login-subheading');
  const submitText = document.getElementById('btn-email-submit-text');
  const nameGroup = document.getElementById('field-name-group');

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    authMode = authMode === 'signin' ? 'signup' : 'signin';

    if (authMode === 'signup') {
      nameGroup?.classList.remove('hidden');
      if (heading) heading.textContent = 'Inscribe Your Name';
      if (subheading) {
        subheading.textContent =
          'Create your chronicle identity and join the scribes of the living archive.';
      }
      if (submitText) submitText.textContent = 'Create Account';
      if (switchLabel) switchLabel.textContent = 'Already a scribe?';
      toggleBtn.textContent = 'Sign in instead.';
    } else {
      nameGroup?.classList.add('hidden');
      if (heading) heading.textContent = 'Welcome to TaleTranscend !!';
      if (subheading) {
        subheading.textContent =
          'An embedded mythic archive and storytelling platform for seekers and scribes.';
      }
      if (submitText) submitText.textContent = 'Sign in';
      if (switchLabel) switchLabel.textContent = 'First time here?';
      toggleBtn.textContent = 'Sign up instead.';
    }
  });
}

/**
 * Sets up Email & Phone form submissions with realistic feedback placeholders.
 */
function _setupFormSubmissions() {
  // Email Form
  const emailForm = document.getElementById('email-login-form');
  emailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('input-email')?.value.trim();
    const password = document.getElementById('input-password')?.value;

    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    if (!password || password.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    log.info(`Email auth attempt in mode: ${authMode}`, { email });
    toggleButtonLoading('btn-email-submit', true);

    // Simulated verification & placeholder feedback
    setTimeout(() => {
      toggleButtonLoading('btn-email-submit', false);
      if (authMode === 'signup') {
        showToast('Account drafted! Entering as an authenticated scribe...', 'success');
        addSuccessGlow();
        handleAuthSuccess();
      } else {
        showToast('Preserved credentials recognized. Welcome back!', 'success');
        addSuccessGlow();
        handleAuthSuccess();
      }
    }, 1100);
  });

  // Forgot Password Link
  document.getElementById('btn-forgot-password')?.addEventListener('click', () => {
    const email = document.getElementById('input-email')?.value.trim();
    if (email && email.includes('@')) {
      showToast(`Recovery scroll dispatched to ${email}.`, 'info');
    } else {
      showToast('Please enter your email address to receive password reset instructions.', 'info');
    }
  });

  // Phone Form (Placeholder)
  const phoneForm = document.getElementById('phone-login-form');
  phoneForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('input-phone')?.value.trim();

    if (!phone || phone.length < 7) {
      showToast('Please enter a valid phone number.', 'error');
      return;
    }

    toggleButtonLoading('btn-phone-submit', true);
    setTimeout(() => {
      toggleButtonLoading('btn-phone-submit', false);
      showToast('Verification code sent! (Preview placeholder)', 'info');
    }, 1000);
  });
}

/**
 * Initializes existing working social login providers (Google and Guest).
 */
function _setupSocialLogins() {
  // Google Login
  document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    log.info('Google login initiated');
    toggleButtonLoading('btn-google-login', true);
    try {
      await signInWithGoogle();
      log.info('Google login successful');
      addSuccessGlow();
      handleAuthSuccess();
    } catch (err) {
      log.error('Google login failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Google login failed. Please try again.', 'error');
      }
    } finally {
      toggleButtonLoading('btn-google-login', false);
    }
  });

  // Guest Login (Anonymous)
  document.getElementById('btn-guest-login')?.addEventListener('click', async () => {
    log.info('Guest login initiated');
    toggleButtonLoading('btn-guest-login', true);
    try {
      await signInAnonymously(auth);
      log.info('Guest login successful');
      addSuccessGlow();
      handleAuthSuccess();
    } catch (err) {
      log.error('Guest login failed', err);
      showToast('Guest entry failed.', 'error');
    } finally {
      toggleButtonLoading('btn-guest-login', false);
    }
  });
}

/**
 * Initializes all login page components, tabs, forms, and auth listeners.
 */
export function initLoginPage() {
  log.info('Login page initialized with split-screen vignette');
  initIcons();
  readyReveal();

  _setupAuthTabs();
  _setupPasswordToggle();
  _setupAuthModeToggle();
  _setupFormSubmissions();
  _setupSocialLogins();

  // If already signed in (non-anonymously), redirect to profile
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
      log.info('User already authenticated, redirecting to profile');
      Promise.resolve().then(() => {
        if (unsubscribe) unsubscribe();
      });
      navigateTo('profile.html');
    }
  });

  return unsubscribe;
}

if (typeof document !== 'undefined' && process.env.NODE_ENV !== 'test') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
  } else {
    initLoginPage();
  }
}
