// src/utils/string.utils.ts
// Shared string and formatting utilities.
// Import from here — never duplicate these in page or component files.

import { WORDS_PER_MINUTE, MS_PER_MINUTE, DICEBEAR_BASE_URL } from '@config/app.config.js';

/* ─────────────────────────────────────────────
   HTML Safety
   ───────────────────────────────────────────── */

/**
 * Escapes HTML special characters to prevent XSS injection.
 *
 * @param value - Raw string to escape
 * @returns HTML-safe string
 */
export function escapeHtml(value: string | number | null | undefined = ''): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* ─────────────────────────────────────────────
   Word Count & Reading Time
   ───────────────────────────────────────────── */

/**
 * Counts words in a string.
 * Trims whitespace and splits on one or more whitespace characters.
 * Returns 0 for empty or whitespace-only input.
 *
 * @param text - Raw text content
 * @returns Word count
 */
export function countWords(text: string | null | undefined): number {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Estimates reading time in minutes based on word count.
 * Uses WORDS_PER_MINUTE from app.config.js (225 wpm).
 * Always returns at least 1.
 *
 * @param wordCount - Number of words
 * @returns Estimated minutes (minimum 1)
 */
export function estimateReadMins(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/* ─────────────────────────────────────────────
   Duration Formatting
   ───────────────────────────────────────────── */

/**
 * Converts milliseconds to a short human-readable read time string.
 * Returns '' for zero or negligible values.
 *
 * @param ms - Duration in milliseconds
 * @returns e.g. "12m read" or ""
 */
export function formatMs(ms: number | null | undefined): string {
  const minutes = Math.floor(Number(ms ?? 0) / MS_PER_MINUTE);
  return minutes < 1 ? '' : `${minutes}m read`;
}

/* ─────────────────────────────────────────────
   Avatar
   ───────────────────────────────────────────── */

/**
 * Builds a DiceBear avatar URL from a user ID.
 * Uses the first 8 characters of the uid as the seed.
 *
 * @param uid - Firebase user ID
 * @returns Full DiceBear avatar URL
 */
export function getAvatarUrl(uid: string): string {
  const seed = encodeURIComponent((uid ?? 'anon').slice(0, 8));
  return `${DICEBEAR_BASE_URL}?seed=${seed}`;
}
