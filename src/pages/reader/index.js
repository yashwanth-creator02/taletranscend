// src/pages/reader/index.js
// Barrel file for the reader page.
// Import all reader functionality from here — never from individual files directly.

// ── Theme & Typography ────────────────────────────────────────────────
export * from './theme.js';

// ── Firebase & Auth ───────────────────────────────────────────────────
export { initAuth, appId } from '@fb/index.js';

// ── Reader Core ───────────────────────────────────────────────────────
export * from './content.js';
export * from './navigation.js';
export * from './progress.js';
export * from './toc.js';
export * from './templates.js';

// ── Services ──────────────────────────────────────────────────────────
export * from '@services/index.js';

// ── Shared App State ──────────────────────────────────────────────────
export { appState, setAppUser, setAppReaderPrefs } from '@state/app.state.js';

// ── Icons ─────────────────────────────────────────────────────────────
export { initIcons } from '@shared/icons.js';

// ── Page State ────────────────────────────────────────────────────────
export * from './state.js';
