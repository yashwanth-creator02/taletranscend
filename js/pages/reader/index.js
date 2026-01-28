// js/pages/reader/index.js

/* ==================== Mobile Features ==================== */
// Export mobile-specific utilities (swipe, responsive UI, etc.)
export * from './mobile.js';

/* ==================== Theme Management ==================== */
// Export theme toggling and styling utilities for the reader
export * from './theme.js';

/* ==================== Firebase & Auth ==================== */
// Export Firebase auth initialization and app ID for Firestore paths
export { initAuth, appId } from '@core/firebase/index.js';

/* ==================== Reader Core Features ==================== */
// Export content loading, chapter navigation, and progress tracking
export * from './content.js';
export * from './navigation.js';
export * from './progress.js';

/* ==================== Services ==================== */
// Export all shared services (cloud sync, resume point, bookmarks, etc.)
export * from '@services/index.js';
