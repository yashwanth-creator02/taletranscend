import { initAuth } from '@core/firebase/index.js';
import { renderCards } from './content.js';
initAuth(async (user) => {
  const userId = user.uid;
  renderCards(userId);
});
