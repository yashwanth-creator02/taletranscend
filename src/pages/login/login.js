// src/pages/login/login.js
// TaleTranscend Authentication entry point with split-screen Scholar's Vignette,
// tabbed Email/Phone authentication, password toggle, and accessible placeholders.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/login.css';

import {
  auth,
  signInAnonymously,
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  sendPasswordReset,
  onAuthStateChanged,
  setRememberPreference,
  setDoc,
  serverTimestamp,
  refs,
} from '@fb/index.js';
import { initAppTheme } from '@config/theme.config.js';
import {
  navigateTo,
  initPageReveal,
  readyReveal,
  createLogger,
  markUserVisited,
  acknowledgeGate,
} from '@/utils';
import {
  clearAuthMemory,
  getAuthMemory,
  HAS_VISITED_KEY,
  isRememberedDurably,
  rememberAuth,
} from '@services/auth-memory.storage.js';
import { initIcons } from '@ui/icons.js';
import { showToast } from '@ui/components/toast.js';

const log = createLogger('Login');

let authMode = 'signin';

initAppTheme();
initPageReveal();

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

function _isRememberChecked() {
  const checkbox = document.getElementById('checkbox-remember');
  return checkbox ? checkbox.checked : true;
}

export function safeReturnTarget(raw, fallback = 'index.html') {
  if (typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//') || trimmed.includes('\\')) return fallback;

  return trimmed;
}

function _returnTarget() {
  if (typeof window === 'undefined') return 'index.html';
  const params = new URLSearchParams(window.location.search);
  return safeReturnTarget(params.get('returnUrl') ?? params.get('redirect'));
}

function _rememberAuth(method) {
  const durable = _isRememberChecked();
  const current = auth?.currentUser;

  const written = rememberAuth(
    { uid: current?.uid ?? null, anonymous: current?.isAnonymous ?? false, method },
    { durable }
  );

  if (!written) {
    log.warn('Auth memory could not be written; leaving existing memory intact');
    return { durable, stored: false };
  }

  if (durable) {
    markUserVisited();
  } else {
    clearAuthMemory({ session: false });
  }

  return { durable, stored: true };
}

export function handleAuthSuccess(method = 'unknown') {
  const { durable, stored } = _rememberAuth(method);
  log.info('Authentication remembered', { method, durable, stored });
  showToast('Welcome to the Living Archive.', 'success');
  const returnUrl = _returnTarget();
  setTimeout(() => {
    navigateTo(returnUrl);
  }, 900);
}

export function addSuccessGlow() {
  const card = document.querySelector('.login-card');
  if (card) {
    card.classList.add('has-success-glow');
    card.style.boxShadow = `
      0 0 50px rgba(99, 102, 241, 0.4),
      0 0 80px rgba(245, 158, 11, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15)
    `;
    card.style.borderColor = 'rgba(129, 140, 248, 0.5)';
  }
}

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

function _setupFormSubmissions() {
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

    try {
      await setRememberPreference(_isRememberChecked());
      if (authMode === 'signup') {
        const user = await registerWithEmail(email, password);
        try {
          const userRef = refs.user(user.uid);
          await setDoc(
            userRef,
            {
              name: email.split('@')[0],
              email: email,
              role: 'reader',
              bio: '',
              avatarUrl: '',
              website: '',
              createdAt: serverTimestamp(),
              joinedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (profileErr) {
          log.warn('Could not initialize initial profile record:', profileErr);
        }
        showToast('Account drafted! Entering as an authenticated scribe...', 'success');
        addSuccessGlow();
        handleAuthSuccess('email');
      } else {
        await signInWithEmail(email, password);
        showToast('Preserved credentials recognized. Welcome back!', 'success');
        addSuccessGlow();
        handleAuthSuccess('email');
      }
    } catch (err) {
      log.error('Email authentication failed:', err);
      let errorMsg = 'Authentication failed. Please try again.';
      switch (err?.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMsg = 'Invalid email or password.';
          break;
        case 'auth/email-already-in-use':
          errorMsg = 'An account with this email already exists. Please sign in instead.';
          break;
        case 'auth/weak-password':
          errorMsg = 'Password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMsg = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMsg = 'Too many attempts. Please try again shortly.';
          break;
        default:
          if (err?.message) errorMsg = err.message;
      }
      showToast(errorMsg, 'error');
    } finally {
      toggleButtonLoading('btn-email-submit', false);
    }
  });

  document.getElementById('btn-forgot-password')?.addEventListener('click', async () => {
    const email = document.getElementById('input-email')?.value.trim();
    if (email && email.includes('@')) {
      try {
        await sendPasswordReset(email);
        showToast(`Recovery scroll dispatched to ${email}.`, 'info');
      } catch (err) {
        log.error('Password reset dispatch failed:', err);
        showToast('Failed to dispatch recovery scroll. Please check the email.', 'error');
      }
    } else {
      showToast('Please enter your email address to receive password reset instructions.', 'info');
    }
  });

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

function _setupSocialLogins() {
  document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    log.info('Google login initiated');
    toggleButtonLoading('btn-google-login', true);
    try {
      await setRememberPreference(_isRememberChecked());
      await signInWithGoogle();
      log.info('Google login successful');
      addSuccessGlow();
      handleAuthSuccess('google');
    } catch (err) {
      log.error('Google login failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Google login failed. Please try again.', 'error');
      }
    } finally {
      toggleButtonLoading('btn-google-login', false);
    }
  });

  document.getElementById('btn-guest-login')?.addEventListener('click', async () => {
    log.info('Guest login initiated');
    toggleButtonLoading('btn-guest-login', true);
    try {
      await setRememberPreference(_isRememberChecked());
      await signInAnonymously(auth);
      log.info('Guest login successful');
      addSuccessGlow();
      handleAuthSuccess('guest');
    } catch (err) {
      log.error('Guest login failed', err);
      showToast('Guest entry failed.', 'error');
    } finally {
      toggleButtonLoading('btn-guest-login', false);
    }
  });
}

function _setupDismissLinks() {
  document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', () => {
      markUserVisited();
    });
  });
}

function _setupResponsiveSvgArt() {
  const imgEl = document.getElementById('login-visual-img');
  const sourceEl = document.getElementById('login-visual-source');
  if (!imgEl) return;

  const updateIllustration = () => {
    const isLight =
      typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-app-theme') === 'light';
    const targetSrc = isLight
      ? '/images/auth/boy-reading-light.svg'
      : '/images/auth/boy-reading.svg';
    if (sourceEl) {
      sourceEl.srcset = targetSrc;
    }
    if (imgEl.getAttribute('src') !== targetSrc) {
      imgEl.src = targetSrc;
    }
  };

  updateIllustration();
  if (typeof window !== 'undefined') {
    window.addEventListener('appthemechange', updateIllustration);
  }
}

export function initLoginPage() {
  log.info('Login page initialized with split-screen vignette');
  initIcons();
  readyReveal();

  acknowledgeGate();
  _setupResponsiveSvgArt();
  _setupAuthTabs();
  _setupPasswordToggle();
  _setupAuthModeToggle();
  _setupFormSubmissions();
  _setupSocialLogins();
  _setupDismissLinks();

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      const memory = getAuthMemory();
      const hasVisited =
        typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(HAS_VISITED_KEY));
      const isIdentified =
        !user.isAnonymous || memory?.anonymous || memory?.method === 'guest' || hasVisited;

      if (isIdentified) {
        log.info('User already authenticated, continuing to their destination', {
          uid: user.uid,
          isAnonymous: user.isAnonymous,
        });
        rememberAuth(
          {
            uid: user.uid,
            anonymous: user.isAnonymous,
            method: user.isAnonymous ? 'guest' : 'restore',
          },
          { durable: isRememberedDurably() }
        );
        markUserVisited();
        Promise.resolve().then(() => {
          if (unsubscribe) unsubscribe();
        });
        navigateTo(_returnTarget());
      }
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
