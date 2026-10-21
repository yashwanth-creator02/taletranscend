// src/firebase/index.js
// Central barrel for the entire Firebase layer.
// Every page and service imports auth helpers, db helpers, refs, and paths from here.

import { createLogger } from '@/utils';
import { useEmulators } from './emulators.js';
const log = createLogger('Firebase');

export * from './auth.js';
export * from './db.js';
export { APP_ID as appId } from '@config/app.config.js';
export { refs } from './refs.js';
export { PATHS, APP_ROOT } from './paths.js';

// The e2e CI job runs against the local emulators (see .github/workflows/ci.yml).
// DEV is part of the condition so a stray flag in .env can never produce a
// production bundle that talks to 127.0.0.1.
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  useEmulators();
}

log.debug('Firebase layer initialized');
