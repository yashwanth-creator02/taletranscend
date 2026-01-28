// js/core/index.js

// Re-export authentication utilities for easy imports elsewhere
export { auth, initAuth } from './auth.js';

// Re-export all Firestore utilities from db.js
// Makes Firestore functions accessible through a single core import
export * from './db.js';

// Unique identifier for this application instance
// Used for namespacing Firestore collections and other app-specific data
export const appId = 'taletranscend-pro';
