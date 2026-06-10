// src/pages/login/login.js
// Enhanced entry point for the login page with glassmorphism and smooth transitions.

import '@css/base.css';
import '@css/pages/login.css';

import { auth, signInAnonymously, signInWithGoogle, onAuthStateChanged } from '@fb/index.js';
import { navigateTo, initPageReveal, readyReveal, createLogger } from '@/utils';

const log = createLogger('Login');
import { initIcons } from '@ui/components/icons.js';
import { showToast } from '@ui/components/toast.js';

// Initialize page reveal animation
initPageReveal();

/**
 * Toggles loading state for a button.
 * @param {string} buttonId - The ID of the button.
 * @param {boolean} isLoading - Whether to show loading state.
 */
function toggleButtonLoading(buttonId, isLoading) {
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
function handleAuthSuccess() {
  showToast('Welcome to the Archive.', 'success');
  setTimeout(() => {
    navigateTo('profile.html');
  }, 1000);
}

/**
 * Adds a subtle glow effect to the login card on success.
 */
function addSuccessGlow() {
  const card = document.querySelector('.login-card');
  if (card) {
    card.style.boxShadow = `
      0 0 50px rgba(99, 102, 241, 0.3),
      0 0 80px rgba(139, 92, 246, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `;
    card.style.borderColor = 'rgba(99, 102, 241, 0.4)';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  log.info('Login page initialized');
  initIcons();
  readyReveal();

  // If already signed in (non-anonymously), redirect to profile
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
      log.info('User already authenticated, redirecting to profile');
      unsubscribe();
      navigateTo('profile.html');
    }
  });

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
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Login failed. Please try again.', 'error');
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
});
