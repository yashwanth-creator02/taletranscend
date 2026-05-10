// src/config/app.config.js
// Central configuration for application-wide constants.
// Import from here instead of hardcoding values across service files.

// The Firestore root document ID under the artifacts collection.
// All user data is scoped under: artifacts/{APP_ID}/users/{userId}/...
export const APP_ID = 'taletranscend-pro';

// Application display name used in page titles and UI labels.
export const APP_NAME = 'TaleTranscend';

// Debounce delay in milliseconds for syncing progress to Firestore.
// Prevents excessive writes when the user scrolls frequently.
export const PROGRESS_SYNC_DELAY_MS = 4000;

// Minimum session duration in milliseconds before read time is recorded.
// Prevents noise from accidental tab switches.
export const MIN_READ_SESSION_MS = 1000;
