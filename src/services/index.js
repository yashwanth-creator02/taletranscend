// src/services/index.js
// Central aggregator for all application services.

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

// Mark a tale as finished across all chapters (grouped under reader/ — it's a
// reading-progress concern, not its own domain)
export * from './reader/markFinish.service.js';

// Fetch chapter progress data for a tale (same reasoning as above)
export * from './reader/progress.utils.service.js';

// ── Bookmarks ─────────────────────────────────────────────────────────
// Add, remove, and fetch user bookmarks
export * from './bookmark/bookmark.service.js';

// ── Tales ─────────────────────────────────────────────────────────────
// Fetch community tales from Firestore (filtered / paginated)
export * from './tale/getTales.js';

// ── Profile ───────────────────────────────────────────────────────────
// User profile reads, continue-reading, published tales, drafts
export * from './profile/profile.service.js';

// ── Resonance ─────────────────────────────────────────────────────────
// Soul Resonance (reaction) toggle and status checks
export * from './resonance/resonance.service.js';

// ── AI ────────────────────────────────────────────────────────────────
// Gemini integration (BYOK — see docs/MIGRATION_PLAN.md Phase 6.6): title
// suggestions, text refinement, name suggestions, and the user's own stored
// API key.
export * from './ai/ai.service.js';
export * from './ai/apiKey.storage.js';
