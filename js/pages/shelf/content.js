import { getBookmarks, getTales } from '@services/index.js';
import { renderCardsGrid } from '@ui/taleCard.js';

async function getAllTales(userId) {
  const comm_tales = await getTales();
  const user_tales = (await getBookmarks({ userId })) || [];
  const user_tales_ids = user_tales.map((bookmark) => bookmark.id);
  const filterd_tales = comm_tales.filter((tale) => {
    return user_tales_ids.includes(tale.id);
  });
  return filterd_tales;
}

export async function renderCards(userId) {
  if (!userId) return;
  const tales = await getAllTales(userId);
  renderCardsGrid(userId, tales);
}
