// src/pages/shelf/content.js
// Fetches and renders the user's bookmarked tales on the shelf page.

import { getBookmarks, getTales } from '@services/index.js';
import { renderCardsGrid } from '@ui/components/taleCard.js';

/**
 * Fetches all community tales then filters to only those bookmarked by the user.
 *
 * @param {string} userId - ID of the authenticated user
 * @returns {Promise<Array<Object>>} Array of bookmarked tale objects
 */
async function getBookmarkedTales(userId) {
  const [allTales, bookmarks] = await Promise.all([getTales(), getBookmarks({ userId })]);

  const bookmarkedIds = new Set(bookmarks.map((b) => b.id));
  return allTales.filter((tale) => bookmarkedIds.has(tale.id));
}

/**
 * Renders the user's bookmarked tales as cards in the shelf grid.
 *
 * @param {string} userId - ID of the authenticated user
 */
export async function renderCards(userId) {
  if (!userId) return;

  const tales = await getBookmarkedTales(userId);
  await renderCardsGrid(userId, tales);
}
