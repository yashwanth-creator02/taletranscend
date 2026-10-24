// src/pages/admin/admin.utils.js
// Pure formatting and lookup helpers for the admin shell and modules.

import { escapeHtml } from '@/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Convert a Firestore Timestamp, Date, number, or ISO string to a Date.
 * @param {unknown} value
 * @returns {Date | null}
 */
export function toAdminDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Format a timestamp for an admin table. Returns an em dash for missing data.
 * @param {unknown} value
 * @returns {string}
 */
export function formatAdminDate(value) {
  const date = toAdminDate(value);
  if (!date) return '\u2014';
  const day = String(date.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${String(
    date.getHours()
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Compact count formatting. Keeps large archive numbers readable without
 * rounding away the difference between 1,000 and 1,900.
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatAdminCount(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '\u2014';
  const number = Number(value);
  if (number < 1000) return String(number);
  if (number < 1_000_000) return `${(number / 1000).toFixed(number < 10_000 ? 1 : 0)}k`;
  return `${(number / 1_000_000).toFixed(1)}m`;
}

/**
 * Truncate long user-generated text for a table cell.
 * @param {unknown} value
 * @param {number} [max=80]
 * @returns {string}
 */
export function truncateAdminText(value, max = 80) {
  const text = String(value ?? '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}\u2026`;
}

/**
 * Safe HTML escaping for values interpolated into admin templates.
 * Re-exported so modules import one helper set.
 */
export function escapeAdminHtml(value) {
  return escapeHtml(value);
}

/**
 * Remember the caret of an active admin search input before a render replaces
 * the toolbar. The previous snapshot is kept while a loading state temporarily
 * removes the input, so focus can be restored once results return.
 *
 * @param {HTMLElement | null} container
 * @param {{start: number, end: number} | null} [previous]
 * @returns {{start: number, end: number} | null}
 */
export function captureAdminSearchFocus(container, previous = null) {
  if (!container || typeof document === 'undefined') return previous;
  const active = document.activeElement;
  if (!active?.matches?.('[data-role="search"]') || !container.contains(active)) {
    return previous;
  }
  return {
    start: typeof active.selectionStart === 'number' ? active.selectionStart : 0,
    end: typeof active.selectionEnd === 'number' ? active.selectionEnd : 0,
  };
}

/**
 * Restore search focus only when nothing else claimed it. This prevents a
 * background render from stealing focus after the user clicks a different
 * control.
 *
 * @param {HTMLElement | null} container
 * @param {{start: number, end: number} | null} snapshot
 */
export function restoreAdminSearchFocus(container, snapshot) {
  if (!snapshot || !container || typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active && active !== document.body && container.contains(active)) return;
  const input = container.querySelector('[data-role="search"]');
  if (!input || input.tagName !== 'INPUT') return;
  input.focus({ preventScroll: true });
  try {
    input.setSelectionRange(snapshot.start, snapshot.end);
  } catch {
    // Search inputs support selection ranges in every supported browser.
  }
}

/**
 * Two-letter mark for a user or tale row.
 * @param {unknown} value
 * @returns {string}
 */
export function adminInitials(value) {
  const words = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'TT';
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/**
 * Human description for each dashboard module.
 * @param {string} moduleId
 * @returns {string}
 */
export function adminModuleDescription(moduleId) {
  return (
    {
      overview: 'Live archive counts and the most recent staff activity.',
      users: 'Find reader profiles and grant or remove writer verification.',
      content: 'Inspect every tale, including drafts, and edit its publication record.',
      comments: 'Read and moderate comments across every tale in the archive.',
      deletions: 'Approve or decline chronicle removal petitions.',
      reports: 'Triage reader reports and record a resolution.',
      applications: 'Review readers applying to become chroniclers.',
      audit: 'Read the append-only record of staff actions.',
      author: 'Your own tales and removal petitions.',
    }[moduleId] ?? 'Archive administration.'
  );
}
