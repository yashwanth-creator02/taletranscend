// src/firebase/emulators.js
// Opt-in wiring for the local Firebase emulators.
//
// Only the CI e2e job sets VITE_FIREBASE_USE_EMULATOR=true. Vite replaces
// import.meta.env at build time, so a production bundle never reaches this
// code path and a test run never contacts the real project.

import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { auth } from './auth.js';
import { db } from './db.js';

const HOST = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';

let connected = false;

/**
 * Point the shared auth and Firestore instances at the local emulators.
 * Safe to call more than once; the SDK rejects a second connection.
 */
export function useEmulators() {
  if (connected) return;
  connectAuthEmulator(auth, `http://${HOST}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, HOST, 8080);
  connected = true;
}
