// src/firebase/app.js
// Initializes the Firebase application instance.
// This module runs once and exports the app for use by auth and Firestore.

import { initializeApp } from 'firebase/app';
import firebaseConfig from '@config/firebase.config.js';
import { initNetworkListeners } from '@/utils';

const app = initializeApp(firebaseConfig);

// Initialize global network listeners (online/offline)
initNetworkListeners();

// Log initialization details in development only.
// Stripped out by Vite in production builds.
if (import.meta.env.DEV) {
  console.log('TaleTranscend Firebase initialized:', app.name);
}

export default app;
