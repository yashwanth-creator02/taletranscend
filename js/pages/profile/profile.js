import { initAuth, initProfileUI, saveProfile, startProfileSync } from './index.js';

/* ==================== Profile Boot ==================== */

/**
 * Initialize Firebase authentication and profile synchronization.
 * When a user is logged in, start real-time sync of their profile data.
 */
initAuth((user) => {
  if (user) {
    startProfileSync(user.uid);
  }
});

/**
 * Initialize the profile UI components.
 * This sets up input fields, buttons, and any reactive UI elements.
 */
initProfileUI();

/* ==================== HTML Exposure ==================== */
/**
 * Expose only the saveProfile function to the global window object
 * so it can be called directly from HTML event handlers (e.g., save button).
 */
window.saveProfile = saveProfile;
