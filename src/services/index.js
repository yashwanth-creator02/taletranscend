// src/services/index.js
// Central aggregator for all application services.
// Every page imports service functions from here — never from individual files directly.

// ── Reader Core ───────────────────────────────────────────────────────
// Fetches tale metadata and chapter content from Firestore
export * from './reader/reader.service.js';

// ── Progress Tracking ─────────────────────────────────────────────────
// localStorage-based progress persistence
export * from './reader/localProgress.service.js';

// Firestore progress syncing and retrieval
export * from './reader/cloudProgress.service.js';

// Resume point calculation combining local and cloud progress
export * from './reader/resume.service.js';

// Read time selectors and aggregators
export * from './reader/readTime.selector.js';
export * from './reader/getTotalReadTimes.service.js';

// ── Bookmarks ─────────────────────────────────────────────────────────
// Add, remove, and fetch user bookmarks
export * from './bookmark.service.js';

// ── Tales ─────────────────────────────────────────────────────────────
// Fetch community tales from Firestore (filtered / paginated)
export * from './tale/getTales.js';

// Mark a tale as finished across all chapters
export * from './markFinish.service.js';

// Fetch chapter progress data for a tale
export * from './progress.utils.service.js';

// ── Profile ───────────────────────────────────────────────────────────
// User profile reads, continue-reading, published tales, drafts
export * from './profile.service.js';

// ── Resonance ─────────────────────────────────────────────────────────
// Soul Resonance (reaction) toggle and status checks
export * from './resonance.service.js';

// ── AI ────────────────────────────────────────────────────────────────
// Gemini-powered title suggestions and text refinement
export * from './ai.service.js';
