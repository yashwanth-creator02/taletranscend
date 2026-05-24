// src/pages/profile/profile.js
// Entry point for the profile page.
// Handles auth, profile sync, continue reading, contributions, and drafts.

import '@css/base.css';
import '@css/nav.css';
import '@css/components.css';
import '@css/pages/profile.css';

import { initNav } from '@ui/components/nav/nav.js';
import { initAuth } from '@fb/index.js';
import { initIcons } from '@ui/components/icons.js';

import {
  initProfileUI,
  saveProfile,
  startProfileSync,
  computeAndSyncStats,
  updateStatsUI,
  renderContinueReading,
  renderPublishedTales,
  renderDrafts,
  showContinueReadingSkeleton,
  showContributionsSkeleton,
  switchContribTab,
  showNotification,
  openModal,
  closeModal,
} from './index.js';

import { getContinueReading, getUserPublishedTales, getUserDrafts } from '@services/index.js';

// Inject shared nav
initNav();

/* ─────────────────────────────────────────────
   Auth timeout guard
   ───────────────────────────────────────────── */

const authTimeout = setTimeout(() => {
  renderContinueReading([]);
  showNotification('Connection timed out. Please refresh.', 'error');
}, 10_000);

/* ─────────────────────────────────────────────
   Auth + Data
   ───────────────────────────────────────────── */

initAuth(async (user) => {
  clearTimeout(authTimeout);
  const uid = user.uid;

  // Start real-time profile sync (name, bio, all new fields)
  startProfileSync(uid);

  // Show skeletons immediately while data loads
  showContinueReadingSkeleton();
  showContributionsSkeleton();

  // Load all data in parallel
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

  // New story button
  document.getElementById('btn-new-story')?.addEventListener('click', () => {
    window.location.href = 'contribution.html';
  });

  // Contributions tab switcher
  document.querySelectorAll('[data-contrib-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchContribTab(btn.dataset.contribTab);
    });
  });

  // Set published as default active contribution tab
  switchContribTab('published');
});
