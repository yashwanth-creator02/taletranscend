// src/pages/profile/profile.js
// Entry point for the profile page.
// Initializes authentication, profile sync, and UI event listeners.

import '@css/base.css';
import '@css/components.css';
import '@css/pages/profile.css';

import { initAuth } from '@fb/index.js';
import { initProfileUI, saveProfile, startProfileSync } from './index.js';
import { initIcons } from '@ui/components/icons.js';

/* ==================== Authentication & Sync ==================== */
initAuth((user) => {
  if (user) {
    startProfileSync(user.uid);
  }
});

/* ==================== UI Initialization ==================== */
document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initIcons();
});

/* ==================== Global Exposure ==================== */
// Exposed so the profile form's submit handler can call it
window.saveProfile = saveProfile;
