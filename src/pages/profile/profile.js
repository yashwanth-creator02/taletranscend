// src/pages/profile/profile.js
// Entry point for the profile page.
// Handles auth, profile sync, continue reading, contributions, drafts, and sign-out.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/profile.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initAuth, auth, upgradeAnonymousToGoogle } from '@fb/index.js';
import { signOut } from 'firebase/auth';
import { navigateTo, initPageReveal, readyReveal, setupAuthTimeout } from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { showToast } from '@ui/components/toast.js';

import {
  initProfileUI,
  saveProfile,
  startProfileSync,
  stopProfileSync,
  computeAndSyncStats,
  updateStatsUI,
  renderContinueReading,
  renderPublishedTales,
  renderDrafts,
  showContinueReadingSkeleton,
  showContributionsSkeleton,
  switchContribTab,
  showNotification,
  closeModal,
} from './index.js';

import { getContinueReading, getUserPublishedTales, getUserDrafts } from '@services/index.js';

initPageReveal();
initNav();

/* ─────────────────────────────────────────────
   Auth Timeout
   ───────────────────────────────────────────── */

const authTimeout = setupAuthTimeout(
  'continue-reading-list',
  'Connection timed out. Please refresh.',
  15000
);

/* ─────────────────────────────────────────────
   Auth + Data
   ───────────────────────────────────────────── */

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const uid = user.uid;

  // Show upgrade button if user is anonymous
  if (user.isAnonymous) {
    const upgradeBtn = document.getElementById('btn-upgrade-account');
    if (upgradeBtn) {
      upgradeBtn.classList.remove('hidden');
      upgradeBtn.classList.add('flex');
    }
  }

  // Real-time profile listener — updates UI on every Firestore write
  startProfileSync(uid);

  showContinueReadingSkeleton();
  showContributionsSkeleton();

  const [continueReading, publishedTales, drafts, stats] = await Promise.all([
    getContinueReading(uid),
    getUserPublishedTales(uid),
    getUserDrafts(uid),
    computeAndSyncStats(uid),
  ]);

  renderContinueReading(continueReading);
  renderPublishedTales(publishedTales);
  renderDrafts(drafts);
  updateStatsUI(stats);
  readyReveal();
  initIcons();
});

/* ─────────────────────────────────────────────
   UI Init (DOM-ready)
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();

  // Profile form submit
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfile();
    closeModal();
  });

  // New story CTA
  document.getElementById('btn-new-story')?.addEventListener('click', () => {
    navigateTo('contribution.html');
  });

  // Contributions tab switcher
  document.querySelectorAll('[data-contrib-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchContribTab(btn.dataset.contribTab));
  });

  // Default to published tab
  switchContribTab('published');

  // ── Account Upgrade ─────────────────────────────────────────────
  document.getElementById('btn-upgrade-account')?.addEventListener('click', async () => {
    try {
      await upgradeAnonymousToGoogle();
      showToast('Account secured with Google!', 'success');
      // Hide the button after successful upgrade
      const upgradeBtn = document.getElementById('btn-upgrade-account');
      if (upgradeBtn) {
        upgradeBtn.classList.add('hidden');
        upgradeBtn.classList.remove('flex');
      }
    } catch (err) {
      console.error('[profile] Upgrade failed:', err);
      // If user cancelled or closed popup, don't show error toast as it's expected
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Account link failed. Try again.', 'error');
      }
    }
  });

  // ── Sign Out (TODO #2) ──────────────────────────────────────────
  // Wires both the desktop and mobile sign-out buttons.
  // Stops the profile listener before signing out to prevent orphaned
  // Firestore listeners on a signed-out user.
  ['btn-sign-out', 'btn-sign-out-mobile'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', async () => {
      try {
        stopProfileSync();
        await signOut(auth);
        showToast('Signed out. Neural link severed.', 'success');
        setTimeout(() => {
          navigateTo('index.html');
        }, 800);
      } catch (err) {
        console.error('[profile] Sign-out failed:', err);
        showToast('Sign-out failed. Try again.', 'error');
        // Restart sync if sign-out failed
        if (auth.currentUser) startProfileSync(auth.currentUser.uid);
      }
    });
  });
});
