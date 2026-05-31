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

/**
 * Converts a past Date to a short relative time string.
 *
 * @param date - Past date
 * @returns e.g. "Just now", "5m ago", "3h ago", "2d ago", "Jan 12"
 */
export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / MS_PER_MINUTE);

  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats a Firestore Timestamp into a human-readable join date.
 *
 * @param timestamp - Firestore Timestamp with .seconds property, or null
 * @returns e.g. "March 2024" or ""
 */
export function formatJoinDate(timestamp: { seconds: number } | null | undefined): string {
  if (!timestamp?.seconds) return '';
  return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/* ─────────────────────────────────────────────
   Number Formatting
   ───────────────────────────────────────────── */

/**
 * Formats a number for compact display.
 * Numbers >= 1000 are shown as "X.Xk".
 *
 * @param n - Number to format
 * @returns e.g. "1.2k", "847"
 */
export function formatCount(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
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

/* ─────────────────────────────────────────────
   DOM Helpers
   ───────────────────────────────────────────── */

/**
 * Sets the textContent of a DOM element by ID.
 * Safe to call with missing elements — silently no-ops.
 * Replaces the _setText / _setEl / setEl pattern duplicated across pages.
 *
 * @param id - Element ID
 * @param value - Text value to set
 */
export function setText(id: string, value: string | number | null | undefined): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? '');
}

/**
 * Alias of setText — kept for compatibility with profile/ui.js and editor.js
 * which import setEl from this module.
 */
export const setEl = setText;
