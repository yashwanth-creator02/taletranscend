// src/pages/reader/index.js
// Barrel file for the reader page.
// Import all reader functionality from here instead of individual files.

/* ==================== Mobile ==================== */
export * from './mobile.js';

/* ==================== Theme & Font ==================== */
export * from './theme.js';

/* ==================== Firebase & Auth ==================== */
export { initAuth, appId } from '@fb/index.js';

/* ==================== Reader Core ==================== */
export * from './content.js';
export * from './navigation.js';
export * from './progress.js';

/* ==================== Services ==================== */
export * from '@services/index.js';
