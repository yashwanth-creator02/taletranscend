/* ==================== Profile Module Exports ====================
   Centralized exports for user profile functionality.
   Provides authentication, UI setup, and cloud sync.
=================================================================== */

/* -------------------- Firebase Auth -------------------- */
// Initialize Firebase authentication for profile
export { initAuth } from '@core/firebase/index.js';

/* -------------------- Profile UI -------------------- */
// Initialize and render the profile user interface
export { initProfileUI } from './ui.js';

/* -------------------- Profile Sync -------------------- */
// Save profile data and start real-time profile synchronization
export { saveProfile, startProfileSync } from './sync.js';
