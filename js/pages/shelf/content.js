import { getBookmarks, getTales } from '@services/index.js';
import { renderCardsGrid } from '@ui/taleCard.js';

/* ==================== Helper: Fetch User’s Tales ==================== */

/**
 * Fetches all tales bookmarked by the user.
 * Combines community tales with user bookmarks to filter only relevant stories.
 *
 * @param {string} userId - ID of the current user
 * @returns {Promise<Array>} - Array of tale objects bookmarked by the user
 */
async function getAllTales(userId) {
  // Fetch all public community tales
  const comm_tales = await getTales();

  // Fetch all bookmarks of the user
  const user_tales = (await getBookmarks({ userId })) || [];
  const user_tales_ids = user_tales.map((bookmark) => bookmark.id);

  // Filter community tales to only those bookmarked by the user
  const filterd_tales = comm_tales.filter((tale) => {
    return user_tales_ids.includes(tale.id);
  });

  return filterd_tales;
}

/* ==================== Render Tales ==================== */

/**
 * Renders the user's bookmarked tales as cards in the UI.
 *
 * @param {string} userId - ID of the current user
 */
export async function renderCards(userId) {
  if (!userId) return;

  const tales = await getAllTales(userId);
  renderCardsGrid(userId, tales);
}
