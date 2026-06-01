// src/utils/format.util.ts

// src/utils/format.utils.ts
// Shared formatting utilities.
// Import from here for date, time, and number display formatting.

/* ─────────────────────────────────────────────
   Relative Time
   ───────────────────────────────────────────── */

/**
 * Converts a past Date to a short relative time string.
 *
 * @param date - Past date
 * @returns e.g. "Just now", "5m ago", "3h ago", "2d ago", "Jan 12"
 */
export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/* ─────────────────────────────────────────────
   Join Date
   ───────────────────────────────────────────── */

/**
 * Formats a Firestore Timestamp into a human-readable join date.
 *
 * @param timestamp - Firestore Timestamp with .seconds property, or null
 * @returns e.g. "March 2024" or ""
 */
export function formatJoinDate(
  timestamp: { seconds: number } | null | undefined
): string {
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
export function formatNumber(n: number | null | undefined): string {
  const num = Number(n ?? 0);

  if (num >= 1000) {
    return `${parseFloat((num / 1000).toFixed(1))}k`;
  }

  return String(num);
}
