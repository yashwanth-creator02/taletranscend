// src/config/firebase.config.js
// Firebase project configuration loaded from environment variables.
// All values are injected by Vite at build time via import.meta.env.
// Never hardcode these values — keep them in your .env file.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Warn during development if the API key is missing.
// This check is stripped out in production builds by Vite.
if (import.meta.env.DEV && !firebaseConfig.apiKey) {
  console.warn('Firebase API key is missing. Check your .env file.');
}

export default firebaseConfig;
