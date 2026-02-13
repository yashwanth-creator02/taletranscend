import { initAuth } from '@core/firebase/index.js'; // Assuming initAuth is here
import { initProfileUI, saveProfile, startProfileSync } from './index.js';
import { initIcons } from '@/ui/icons.js';

/* ==================== Profile Boot ==================== */

// 1. Initialize Authentication & Sync
initAuth((user) => {
  if (user) {
    startProfileSync(user.uid);
    console.log(`Authenticated as: ${user.uid}`);
  } else {
    // Optional: Redirect to login if not authenticated
    // window.location.href = 'login.html';
  }
});

// 2. Initialize UI (Event Listeners)
document.addEventListener('DOMContentLoaded', () => {
  initProfileUI();
  initIcons();
});

/* ==================== Global Exposure ==================== */
// Keep this so the UI form can trigger the saveProfile function
window.saveProfile = saveProfile;
