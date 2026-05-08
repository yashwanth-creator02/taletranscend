// src/services/index.js
// Central aggregator for all application services.
// Import any service function from here instead of reaching into individual files.

// -------------------- Reader Core --------------------
// Fetches tale metadata and chapter content from Firestore
export * from './reader/reader.service.js';

// -------------------- Progress Tracking --------------------
// Local storage based progress persistence
export * from './reader/localProgress.service.js';

// Cloud Firestore progress syncing and retrieval
export * from './reader/cloudProgress.service.js';

// Resume point calculation combining local and cloud progress
export * from './reader/resume.service.js';

// Read time selectors and aggregators
export * from './reader/readTime.selector.js';
export * from './reader/getTotalReadTimes.service.js';

// -------------------- Bookmarks --------------------
// Add, remove, and fetch user bookmarks
export * from './bookmark.service.js';

// -------------------- Tales --------------------
// Fetch all community tales from Firestore
export * from './tale/getTales.js';

// Mark a tale as finished across all chapters
export * from './markFinish.service.js';

// Fetch chapter progress data for a tale
export * from './progress.utils.service.js';
