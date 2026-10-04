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
import { navigateTo, initPageReveal, readyReveal, setupAuthTimeout, createLogger } from '@/utils';
import { initIcons } from '@ui/components/icons.js';
import { showToast } from '@ui/components/toast.js';

const log = createLogger('Profile');

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
  closeModal,
} from './index.js';
import { initProfileLayout } from './layout.js';

import { getContinueReading, getUserPublishedTales, getUserDrafts } from '@services/index.js';

log.info('Initializing Profile page');
initPageReveal();
initNav();

/* ─────────────────────────────────────────────
   Auth Timeout
   ───────────────────────────────────────────── */

const authTimeout = setupAuthTimeout(
  'continue-reading-list',
  'Connection timed out. Please refresh.',
  12000
);

const contribTimeout = setTimeout(() => {
  const contribGrid = document.getElementById('contributions-grid');
  if (contribGrid && contribGrid.querySelector('.skeleton-card')) {
    renderPublishedTales([]);
  }
  readyReveal();
}, 12000);

/* ─────────────────────────────────────────────
   Auth + Data
   ───────────────────────────────────────────── */

import { appState } from '@state/index.js';

export async function initProfilePage(currentUser = auth?.currentUser) {
  initProfileLayout();
  initProfileUI();

  // Profile form submit
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    log.info('Profile form submitted');
    await saveProfile();
    closeModal();
  });

  // New story CTA
  document.getElementById('btn-new-story')?.addEventListener('click', () => {
    log.info('New story CTA clicked');
    navigateTo('contribution.html');
  });

  // Contributions tab switcher
  document.querySelectorAll('[data-contrib-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.contribTab;
      log.debug('Switching contributions tab', { tab });
      switchContribTab(tab);
    });
  });

  // Default to published tab
  switchContribTab('published');

  // Account upgrade
  document.getElementById('btn-upgrade-account')?.addEventListener('click', async () => {
    log.info('Anonymous upgrade requested');
    try {
      await upgradeAnonymousToGoogle();
      log.info('Upgrade successful');
      showToast('Account secured with Google!', 'success');
      const upgradeBtn = document.getElementById('btn-upgrade-account');
      if (upgradeBtn) {
        upgradeBtn.classList.add('hidden');
        upgradeBtn.classList.remove('flex');
      }
    } catch (err) {
      log.error('Upgrade failed:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Account link failed. Try again.', 'error');
      }
    }
  });

  const uid = currentUser?.uid || appState.userId;
  if (uid) {
    if (currentUser?.isAnonymous) {
      const upgradeBtn = document.getElementById('btn-upgrade-account');
      if (upgradeBtn) {
        upgradeBtn.classList.remove('hidden');
        upgradeBtn.classList.add('flex');
      }
    }

    startProfileSync(uid);
    showContinueReadingSkeleton();
    showContributionsSkeleton();

    try {
      const [continueReading, publishedTales, drafts, stats] = await Promise.all([
        getContinueReading(uid).catch((err) => {
          log.warn('Failed to fetch continue reading', err);
          return [];
        }),
        getUserPublishedTales(uid).catch((err) => {
          log.warn('Failed to fetch published tales', err);
          return [];
        }),
        getUserDrafts(uid).catch((err) => {
          log.warn('Failed to fetch drafts', err);
          return [];
        }),
        computeAndSyncStats(uid).catch((err) => {
          log.warn('Failed to compute stats', err);
          return 0;
        }),
      ]);

      renderContinueReading(continueReading || []);
      renderPublishedTales(publishedTales || []);
      renderDrafts(drafts || []);
      updateStatsUI(stats);
    } catch (err) {
      log.error('Unexpected error fetching profile subsets', err);
      renderContinueReading([]);
      renderPublishedTales([]);
      renderDrafts([]);
    } finally {
      readyReveal();
      initIcons();
    }
  } else {
    readyReveal();
    initIcons();
  }

  // ── Sign Out ────────────────────────────────────────────────────
  // Stops the profile listener before signing out to prevent orphaned
  // Firestore listeners on a signed-out user.
  document.getElementById('btn-sign-out')?.addEventListener('click', async () => {
    log.info('Sign-out requested', { source: 'btn-sign-out' });
    try {
      stopProfileSync();
      await signOut(auth);
      log.info('Sign-out successful');
      showToast('Signed out successfully.', 'success');
      setTimeout(() => {
        navigateTo('index.html');
      }, 800);
    } catch (err) {
      log.error('Sign-out failed:', err);
      showToast('Sign-out failed. Try again.', 'error');
      // Restart sync if sign-out failed
      if (auth.currentUser) startProfileSync(auth.currentUser.uid);
    }
  });
}

initAuth(async (user) => {
  clearTimeout(authTimeout);
  clearTimeout(contribTimeout);
  appState.userId = user.uid;
  log.info('Auth resolved', { uid: user.uid, isAnonymous: user.isAnonymous });
  await initProfilePage(user);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initProfilePage();
  });
} else {
  initProfilePage();
}
