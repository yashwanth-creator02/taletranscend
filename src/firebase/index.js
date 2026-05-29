// src/firebase/index.js
// Central barrel for the entire Firebase layer.
// Every page and service imports auth helpers, db helpers, refs, and paths from here.

export * from './auth.js';
export * from './db.js';
export { APP_ID as appId } from '@config/app.config.js';
export { refs } from './refs.js';
export { PATHS, APP_ROOT } from './paths.js';
