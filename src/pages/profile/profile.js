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
  closeAuthorModal,
  saveAuthorRegistry,
} from './index.js';
import { initProfileLayout } from './layout.js';

import {
  getContinueReading,
  getUserPublishedTales,
  getUserDrafts,
  deleteUserAccount,
  submitTaleDeletionRequest,
} from '@services/index.js';

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

  // Scribe registry form submit
  document.getElementById('profile-author-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    log.info('Profile author form submitted');
    const penName = document.getElementById('profile-pen-name-input')?.value.trim() || '';
    const authorEmail = document.getElementById('profile-author-email-input')?.value.trim() || '';
    const authorBio = document.getElementById('profile-author-bio-input')?.value.trim() || '';
    const errorEl = document.getElementById('profile-author-form-error');

    if (!penName || penName.length < 2) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a valid pen name (at least 2 characters).';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!authorEmail || !emailRegex.test(authorEmail)) {
      if (errorEl) {
        errorEl.textContent = 'Please enter a valid correspondence email.';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    const submitBtn = document.getElementById('btn-save-profile-author');
    const submitText = document.getElementById('profile-author-submit-text');
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Saving…';

    const success = await saveAuthorRegistry({ penName, authorEmail, authorBio });
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Save Scribe Registry';

    if (success) {
      closeAuthorModal();
    }
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

  // ── Tale Deletion Request Modal Wiring ─────────────────────────
  const taleDeletionModal = document.getElementById('modal-tale-deletion-request');
  const openTaleDeletionBtn = document.getElementById('btn-open-tale-deletion-request');
  const cancelTaleDeletionBtn = document.getElementById('btn-cancel-tale-deletion');
  const formTaleDeletion = document.getElementById('form-tale-deletion-request');

  openTaleDeletionBtn?.addEventListener('click', () => {
    closeModal();
    taleDeletionModal?.classList.remove('hidden');
    taleDeletionModal?.classList.add('flex');
    initIcons(taleDeletionModal);
  });

  cancelTaleDeletionBtn?.addEventListener('click', () => {
    taleDeletionModal?.classList.add('hidden');
    taleDeletionModal?.classList.remove('flex');
  });

  formTaleDeletion?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taleId = document.getElementById('input-deletion-tale-id')?.value.trim();
    const reason = document.getElementById('input-deletion-reason')?.value.trim();

    if (!taleId) {
      showToast('Please enter the chronicle title or ID.', 'error');
      return;
    }
    if (!reason || reason.length < 5) {
      showToast('Please provide a reason for removal (at least 5 characters).', 'error');
      return;
    }

    try {
      await submitTaleDeletionRequest({ userId: uid, taleId, reason });
      showToast('Removal petition dispatched to archive administration.', 'success');
      formTaleDeletion.reset();
      taleDeletionModal?.classList.add('hidden');
      taleDeletionModal?.classList.remove('flex');
    } catch (err) {
      log.error('Failed to submit chronicle deletion petition:', err);
      showToast(err.message || 'Failed to submit removal petition.', 'error');
    }
  });

  // ── Account Dissolution Modal Wiring ───────────────────────────
  const deleteAccountModal = document.getElementById('modal-confirm-delete-account');
  const openDeleteAccountBtn = document.getElementById('btn-delete-account-trigger');
  const cancelDeleteAccountBtn = document.getElementById('btn-cancel-delete-account');
  const inputConfirmDelete = document.getElementById('input-confirm-delete-account');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete-account');
  const formConfirmDelete = document.getElementById('form-confirm-delete-account');

  openDeleteAccountBtn?.addEventListener('click', () => {
    closeModal();
    deleteAccountModal?.classList.remove('hidden');
    deleteAccountModal?.classList.add('flex');
    initIcons(deleteAccountModal);
  });

  cancelDeleteAccountBtn?.addEventListener('click', () => {
    deleteAccountModal?.classList.add('hidden');
    deleteAccountModal?.classList.remove('flex');
    if (inputConfirmDelete) inputConfirmDelete.value = '';
    if (btnConfirmDelete) btnConfirmDelete.disabled = true;
  });

  inputConfirmDelete?.addEventListener('input', (e) => {
    const val = e.target.value.trim().toUpperCase();
    if (btnConfirmDelete) {
      btnConfirmDelete.disabled = val !== 'DELETE';
    }
  });

  formConfirmDelete?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (inputConfirmDelete?.value.trim().toUpperCase() !== 'DELETE') return;

    if (btnConfirmDelete) {
      btnConfirmDelete.disabled = true;
      btnConfirmDelete.textContent = 'Dissolving…';
    }

    try {
      stopProfileSync();
      const { preservedTalesCount } = await deleteUserAccount(uid);
      showToast(
        `Your identity has been dissolved. ${preservedTalesCount} contributed chronicle(s) remain immortalized in the archive.`,
        'success'
      );
      deleteAccountModal?.classList.add('hidden');
      deleteAccountModal?.classList.remove('flex');
      setTimeout(() => {
        navigateTo('index.html');
      }, 1500);
    } catch (err) {
      log.error('Account deletion failed:', err);
      showToast(err.message || 'Failed to dissolve account.', 'error');
      if (btnConfirmDelete) {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = 'Dissolve Identity';
      }
    }
  });

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
