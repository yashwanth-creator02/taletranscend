import { initAuth } from '@core/firebase/index.js';
import { renderCards } from './content.js';

/* ==================== Initialize App ==================== */
/**
 * Authenticate the user and render their bookmarked tales.
 * Only after auth is successful do we fetch and render cards.
 */
initAuth(async (user) => {
  const userId = user.uid;

  // Render user-specific tales
  renderCards(userId);
});
