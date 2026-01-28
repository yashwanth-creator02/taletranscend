// js/core/firebase/app.js
import { initializeApp } from 'firebase/app';
import firebaseConfig from '@config/firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
if (import.meta.env.DEV) {
  console.log('🚀 TaleTranscend Firebase Initialized:', app.name);
}
// Export the initialized app instance
export default app;
