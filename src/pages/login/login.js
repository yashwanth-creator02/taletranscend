// src/pages/login/login.js
// Entry point for the login page.
// Handles Google Sign-In and guest access.

import '@css/base.css';
import '@css/pages/login.css';

import { auth, signInAnonymously, signInWithGoogle, onAuthStateChanged } from '@fb/index.js';
import { navigateTo, initPageReveal, readyReveal } from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { showToast } from '@ui/components/toast.js';

initPageReveal();

/**
 * Handles the redirection logic after a successful login.
 */
function handleAuthSuccess() {
  showToast('Welcome to the Archive.', 'success');
  setTimeout(() => {
    navigateTo('profile.html');
  }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  readyReveal();

  // If already signed in (non-anonymously), redirect to profile
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
      unsubscribe();
      navigateTo('profile.html');
    }
  });

  // Google Login
  document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
      handleAuthSuccess();
    } catch (err) {
      console.error('[login] Google login failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Login failed. Please try again.', 'error');
      }
    }
  });

  // Guest Login (Anonymous)
  document.getElementById('btn-guest-login')?.addEventListener('click', async () => {
    try {
      await signInAnonymously(auth);
      handleAuthSuccess();
    } catch (err) {
      console.error('[login] Guest login failed:', err);
      showToast('Guest entry failed.', 'error');
    }
  });
});
