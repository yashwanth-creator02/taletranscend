// src/firebase/app.js
// Initializes the Firebase application instance.
// This module runs once and exports the app for use by auth and Firestore.

import { initializeApp } from 'firebase/app';
import firebaseConfig from '@config/firebase.config.js';
import { initNetworkListeners, createLogger } from '@/utils';

const app = initializeApp(firebaseConfig);
const log = createLogger('Firebase');

// Initialize global network listeners (online/offline)
initNetworkListeners();

// Log initialization details in development only.
log.log('TaleTranscend Firebase initialized:', app.name);

export default app;
