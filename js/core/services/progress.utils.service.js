import { db } from '../firebase/index.js';
import { collection, getDocs } from '../firebase/index.js';

export async function getTaleProgressData(userId, taleId) {
  try {
    const chaptersRef = collection(db, 'users', userId, 'readerProgress', taleId, 'chapters');
    const snapshot = await getDocs(chaptersRef);

    const chaptersProgress = {};
    snapshot.forEach((doc) => {
      // Assuming doc.id is the chapter index (0, 1, 2...)
      // and contains a field 'scrollPercent'
      chaptersProgress[doc.id] = doc.data().scrollPercent || 0;
    });

    return chaptersProgress;
  } catch (err) {
    console.error('Failed to fetch chapter progress:', err);
    return {};
  }
}
