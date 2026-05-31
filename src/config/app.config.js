// src/config/app.config.js
// Central configuration for application-wide constants.
// Import from here — never hardcode these values across the codebase.
//
// Rules:
//   - All localStorage keys live in STORAGE_KEYS (never raw strings elsewhere)
//   - All magic numbers live here with a named constant
//   - All repeated string literals (URLs, labels) live here

// ── App Identity ─────────────────────────────────────────────────────

// The Firestore root document ID under the artifacts collection.
export const APP_ID = 'taletranscend-pro';

// Application display name used in page titles and UI labels.
export const APP_NAME = 'TaleTranscend';

// ── Reading & Writing Constants ───────────────────────────────────────

// Average adult reading speed in words per minute.
// Used by estimateReadMins() and all chapter/tale read-time calculations.
export const WORDS_PER_MINUTE = 225;

// Milliseconds in one minute. Use instead of hardcoding 60000.
export const MS_PER_MINUTE = 60_000;

// TTS character limit — Web Speech API is unreliable above this.
export const TTS_CHAR_LIMIT = 6000;

// ── Progress Sync ─────────────────────────────────────────────────────

// Debounce delay in milliseconds for syncing progress to Firestore.
// Prevents excessive writes when the user scrolls frequently.
export const PROGRESS_SYNC_DELAY_MS = 4000;

// Minimum session duration in milliseconds before read time is recorded.
// Prevents noise from accidental tab switches.
export const MIN_READ_SESSION_MS = 1000;

// ── Media Defaults ────────────────────────────────────────────────────

// Fallback cover image used when a tale has no coverUrl set.
// Referenced by taleCard.js, home/home.js, shelf/ui.js, profile/ui.js.
export const DEFAULT_COVER_URL =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';

// DiceBear avatar base URL. Use getAvatarUrl() from string.utils.ts instead of building raw.
export const DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x/avataaars/svg';

// ── LocalStorage Keys ─────────────────────────────────────────────────
// All localStorage keys used by the app in one place.
// Import and use these — never write raw 'tt-*' strings in page files.

export const STORAGE_KEYS = {
  // Reader preferences (also synced to Firestore — see READER_STORAGE_KEYS in theme.config.js)
  readerTheme: 'tt-reader-theme',
  readerFont: 'tt-reader-font',
  readerFontSize: 'tt-reader-size',
  readerLineHeight: 'tt-reader-lh',
  readerMeasure: 'tt-reader-measure',

  // Library page
  librarySidebarCollapsed: 'tt-lib-sidebar-collapsed',

  // Progress — keyed dynamically: `tt-progress-${uid}-${taleId}`
  progressPrefix: 'tt-progress',
};

// ── AI ────────────────────────────────────────────────────────────────

// Gemini AI API Key for mythic suggestions.
export const AI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
