// src/pages/library/index.js
// Barrel file — single entry point for all library page imports.
// Import from here instead of reaching into individual files directly.

/* -------------------- Firebase -------------------- */
export { initAuth, db } from '@fb/index.js';

/* -------------------- Tales Content -------------------- */
export { subscribeToTales, stopTalesSubscription } from './content.js';

/* -------------------- UI Components -------------------- */
export { renderCardsGrid } from '@ui/components/taleCard.js';
export { initIcons } from '@ui/components/icons.js';

/* -------------------- Interactions -------------------- */
export * from './interactions.js';
