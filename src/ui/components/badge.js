// src/ui/components/badge.js
// Shared badge renderer used by tale cards and shelf cards.
// Previously duplicated as `_badge()` in both taleCard.js and pages/shelf/ui.js.

import { escapeHtml } from '@/utils';

/**
 * Renders a `.badge` span with escaped text.
 *
 * @param {string} text - Badge label
 * @param {string} [classes] - Extra badge variant classes (e.g. 'badge-era')
 * @returns {string} HTML string
 */
export function renderBadge(text, classes = '') {
  return `<span class="badge ${classes}">${escapeHtml(text)}</span>`;
}
