// src/firebase/index.js
// Single entry point for all Firebase functionality.
// Import auth, db, and Firestore utilities from here across the entire app.

// Authentication instance and init helper
export { auth, initAuth } from './auth.js';

// Firestore instance and all SDK utilities
export * from './db.js';

// Application ID used to namespace all Firestore paths.
// Structure: artifacts/{APP_ID}/users/{userId}/...
// Imported from app.config.js so it is defined in one place only.
export { APP_ID as appId } from '@config/app.config.js';
