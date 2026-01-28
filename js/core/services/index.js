// js/core/services/reader/index.js

/* ================= Reader Services Aggregator =================
   This file centralizes all reader-related services and utilities,
   so other modules can import from a single entry point.
====================================================================*/

// Core reader functionality (fetching tales and chapters)
export * from './reader/reader.service.js';

// -------------------- Progress Tracking --------------------
// Local storage-based progress tracking
export * from './reader/localProgress.service.js';

// Cloud Firestore progress syncing
export * from './reader/cloudProgress.service.js';

// Resume point calculation for continuing reading
export * from './reader/resume.service.js';

// Read time calculations and selectors
export * from './reader/readTime.selector.js';
export * from './reader/getTotalReadTimes.service.js';

// -------------------- User Bookmarks --------------------
// Add, remove, and fetch bookmarks
export * from './bookmark.service.js';

// -------------------- Tales --------------------
// Fetch all available community tales
export * from './tale/getTales.js';
