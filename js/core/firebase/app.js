// js/core/firebase/app.js

// Import the Firebase app initializer
import { initializeApp } from 'firebase/app';

// Import the project-specific Firebase configuration
import firebaseConfig from '@config/firebase-config.js';

// Initialize the Firebase application using the provided config
const app = initializeApp(firebaseConfig);

// Log initialization details only in development mode
// Helps verify Firebase setup without polluting production logs
if (import.meta.env.DEV) {
  console.log('🚀 TaleTranscend Firebase Initialized:', app.name);
}

// Export the initialized Firebase app instance
// This instance will be reused across the application
export default app;
