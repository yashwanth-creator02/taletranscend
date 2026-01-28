/* ================= Module Exports =================
   Centralized exports for content and UI functionality.
   Allows other modules to import from a single entry point.
==================================================== */

/* -------------------- Firebase -------------------- */
// Authentication and Firestore database access
export { initAuth, db } from '@core/firebase/index.js';

/* -------------------- Tales Content -------------------- */
// Subscribe/unsubscribe to community tales updates
export { subscribeToTales, stopTalesSubscription } from './content.js';

/* -------------------- UI Components -------------------- */
// Render the tale cards grid
export { renderCardsGrid } from '@ui/taleCard.js';

// Icon initialization for UI elements
export { initIcons } from '@ui/icons.js';

/* -------------------- Interactions -------------------- */
// Expose all interaction utilities (clicks, likes, bookmarks, etc.)
export * from './interactions.js';
