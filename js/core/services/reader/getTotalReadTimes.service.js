import { getTotalReadTime } from './readTime.selector.js';

export async function getTotalReadTimes({ userId, taleIds }) {
  if (!userId || !Array.isArray(taleIds) || taleIds.length === 0) {
    return {};
  }

  const entries = await Promise.all(
    taleIds.map(async (taleId) => {
      const ms = await getTotalReadTime({ userId, taleId });
      return [taleId, ms];
    })
  );

  return Object.fromEntries(entries);
}
