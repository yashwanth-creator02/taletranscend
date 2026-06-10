// src/config/firebase.config.js
// Firebase project configuration loaded from environment variables.
// All values are injected by Vite at build time via import.meta.env.
// Never hardcode these values — keep them in your .env file.

import { createLogger } from '@/utils';
const log = createLogger('FirebaseConfig');

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

log.debug('Firebase config loaded');

export default firebaseConfig;
